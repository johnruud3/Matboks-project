import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PriceSubmission, PriceStats, SubmitPriceRequest } from '../types/database.js';

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export async function submitPrice(data: SubmitPriceRequest): Promise<PriceSubmission> {
  const client = getSupabaseClient();

  const { data: submission, error } = await client
    .from('price_submissions')
    .insert({
      barcode: data.barcode,
      product_name: data.product_name,
      price: data.price,
      currency: data.currency,
      store_name: data.store_name,
      location: data.location,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit price: ${error.message}`);
  }

  return submission as PriceSubmission;
}

export async function getPriceStats(barcode: string): Promise<PriceStats | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('price_stats')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (error) {
    // No data found is not an error - just return null
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get price stats: ${error.message}`);
  }

  return data as PriceStats;
}

export async function getRecentPrices(barcode: string, limit: number = 10): Promise<PriceSubmission[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('price_submissions')
    .select('*')
    .eq('barcode', barcode)
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get recent prices: ${error.message}`);
  }

  return (data || []) as PriceSubmission[];
}

export async function getAllRecentPrices(limit: number = 50): Promise<PriceSubmission[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('recent_prices')
    .select('*')
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get all recent prices: ${error.message}`);
  }

  return (data || []) as PriceSubmission[];
}
