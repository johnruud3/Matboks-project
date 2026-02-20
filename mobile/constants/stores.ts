/**
 * Shared store list for price submission picker and favorite stores.
 * name: display name (used in submissions and matching)
 * code: stable id for API/backend
 */
export const STORES = [
  { name: 'KIWI', code: 'KIWI', logo: 'https://kassal.app/logos/Kiwi.svg' },
  { name: 'Rema 1000', code: 'REMA_1000', logo: null },
  { name: 'Meny', code: 'MENY_NO', logo: 'https://kassal.app/logos/Meny.svg' },
  { name: 'SPAR', code: 'SPAR_NO', logo: 'https://kassal.app/logos/Spar.svg' },
  { name: 'Coop Extra', code: 'COOP_EXTRA', logo: 'https://kassal.app/logos/Coop%20Extra.svg' },
  { name: 'Coop Prix', code: 'COOP_PRIX', logo: 'https://kassal.app/logos/Coop%20Prix.svg' },
  { name: 'Coop Mega', code: 'COOP_MEGA', logo: 'https://kassal.app/logos/Coop%20Mega.svg' },
  { name: 'Coop Obs', code: 'COOP_OBS', logo: 'https://kassal.app/logos/Coop%20Obs.svg' },
  { name: 'Joker', code: 'JOKER_NO', logo: 'https://kassal.app/logos/Joker.svg' },
  { name: 'Bunnpris', code: 'BUNNPRIS', logo: 'https://kassal.app/logos/Bunnpris.svg' },
  { name: 'Europris', code: 'EUROPRIS_NO', logo: 'https://kassal.app/logos/Europris.svg' },
  { name: 'Oda', code: 'ODA_NO', logo: 'https://kassal.app/logos/Oda.svg' },
  { name: 'Annen butikk', code: 'OTHER', logo: null },
] as const;

export type StoreCode = (typeof STORES)[number]['code'];
export type StoreOption = (typeof STORES)[number];

/** Check if a submission store name matches any of the favorite store names/codes */
export function storeMatchesFavorites(storeName: string | null, favoriteStores: string[]): boolean {
  if (!storeName || favoriteStores.length === 0) return false;
  const s = storeName.toLowerCase();
  return favoriteStores.some((fav) => s.includes(fav.toLowerCase()) || fav.toLowerCase().includes(s));
}
