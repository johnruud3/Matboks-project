import { createClient, SupabaseClient } from '@supabase/supabase-js';

const COOLDOWN_HOURS = 4;
const BATCH_DELAY_MINUTES = 10;

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY required');
    supabase = createClient(url, key);
  }
  return supabase;
}

/** Normalize store name for matching (lowercase, trim) */
function normalizeStore(s: string): string {
  return (s || '').trim().toLowerCase();
}

/** Check if submission store name matches any of the favorite store names */
function storeMatchesFavorites(submissionStore: string, favoriteStores: string[]): boolean {
  const sub = normalizeStore(submissionStore);
  if (!sub) return false;
  return favoriteStores.some((fav) => {
    const f = normalizeStore(fav);
    return sub.includes(f) || f.includes(sub);
  });
}

export interface PushSubscriptionRow {
  id: string;
  expo_push_token: string;
  favorite_stores: string[];
  last_push_sent_at: string | null;
  updated_at: string;
}

export async function registerPushSubscription(expoPushToken: string, favoriteStores: string[]): Promise<void> {
  const client = getSupabase();
  const { error } = await client.from('push_subscriptions').upsert(
    {
      expo_push_token: expoPushToken,
      favorite_stores: favoriteStores,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'expo_push_token' }
  );
  if (error) throw new Error(`Failed to register push: ${error.message}`);
}

/** Called after a price is submitted. Adds matching tokens to a 10-min batch (respects 4h cooldown). */
export async function onPriceSubmitted(storeName: string | null): Promise<void> {
  if (!storeName?.trim()) return;

  const client = getSupabase();
  const now = new Date();
  const cooldownUntil = new Date(now.getTime() - COOLDOWN_HOURS * 60 * 60 * 1000);
  const sendAfter = new Date(now.getTime() + BATCH_DELAY_MINUTES * 60 * 1000);

  const { data: subscriptions, error: fetchError } = await client
    .from('push_subscriptions')
    .select('expo_push_token, favorite_stores, last_push_sent_at')
    .not('favorite_stores', 'eq', '[]');

  if (fetchError || !subscriptions?.length) return;

  const matching = (subscriptions as PushSubscriptionRow[]).filter((sub) =>
    storeMatchesFavorites(storeName, sub.favorite_stores || [])
  );

  for (const sub of matching) {
    if (sub.last_push_sent_at && new Date(sub.last_push_sent_at) > cooldownUntil) continue;

    const { data: existing } = await client
      .from('pending_push_batches')
      .select('id, stores_in_batch, send_after')
      .eq('expo_push_token', sub.expo_push_token)
      .gte('send_after', now.toISOString())
      .limit(1)
      .single();

    const storesList: string[] = existing?.stores_in_batch || [];
    if (storesList.includes(storeName)) continue;
    const newStores = [...storesList, storeName];

    if (existing?.id) {
      await client
        .from('pending_push_batches')
        .update({ stores_in_batch: newStores, send_after: existing.send_after })
        .eq('id', existing.id);
    } else {
      await client.from('pending_push_batches').insert({
        expo_push_token: sub.expo_push_token,
        stores_in_batch: newStores,
        send_after: sendAfter.toISOString(),
      });
    }
  }
}

/** Process batches that are due and send one Expo push per token. Call from cron every minute. */
export async function processDueBatches(): Promise<{ sent: number; errors: number }> {
  const client = getSupabase();
  const now = new Date().toISOString();

  const { data: due, error: fetchError } = await client
    .from('pending_push_batches')
    .select('*')
    .lte('send_after', now);

  if (fetchError || !due?.length) return { sent: 0, errors: 0 };

  let sent = 0;
  let errors = 0;

  for (const batch of due) {
    const token = batch.expo_push_token;
    const stores: string[] = batch.stores_in_batch || [];
    const storeList = stores.length > 0 ? stores.join(', ') : 'favorittbutikken din';

    try {
      await sendExpoPush(token, {
        title: 'Nye priser fra favorittbutikker',
        body: `Nye priser fra ${storeList} – sjekk i appen!`,
        data: { screen: 'favorite-deals' },
      });
      await client
        .from('push_subscriptions')
        .update({ last_push_sent_at: now, updated_at: now })
        .eq('expo_push_token', token);
      await client.from('pending_push_batches').delete().eq('id', batch.id);
      sent++;
    } catch (e) {
      console.error('Push send failed for token:', token, e);
      await client.from('pending_push_batches').delete().eq('id', batch.id);
      errors++;
    }
  }

  return { sent, errors };
}

async function sendExpoPush(
  expoPushToken: string,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: expoPushToken,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed: ${response.status} ${text}`);
  }

  const result = await response.json();
  const ticket = result.data?.[0];
  if (ticket?.status === 'error') {
    throw new Error(ticket.message || 'Expo push error');
  }
}
