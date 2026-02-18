import { Product } from '../types/index.js';

interface KassalProduct {
  id: number;
  name: string;
  brand: string | null;
  vendor: string | null;
  ean: string | null;
  image: string | null;
  description: string | null;
  current_price: { price: number; unit_price: number | null; date: string } | number | null;
  category?: { id: number; name: string }[];
  store?: { name: string; code: string; url: string; logo: string | null };
}

function extractPrice(cp: KassalProduct['current_price']): number | null {
  if (cp == null) return null;
  if (typeof cp === 'number') return cp;
  return cp.price ?? null;
}

interface KassalEanResponse {
  data: {
    ean: string;
    products: KassalProduct[];
  };
}

export async function lookupProduct(barcode: string): Promise<Product> {
  try {
    const apiKey = process.env.KASSAL_API_KEY;
    if (!apiKey) throw new Error('KASSAL_API_KEY not set');

    const response = await fetch(
      `https://kassal.app/api/v1/products/ean/${barcode}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Kassal API error: ${response.status}`);
    }

    const data = await response.json() as KassalEanResponse;
    const products = data.data?.products || [];

    if (products.length > 0) {
      const first = products[0];
      const category = first.category?.find((c) => c.name)?.name;

      let cheapest = first;
      let cheapestPrice = extractPrice(first.current_price);
      for (const p of products) {
        const price = extractPrice(p.current_price);
        if (price != null && (cheapestPrice == null || price < cheapestPrice)) {
          cheapest = p;
          cheapestPrice = price;
        }
      }

      return {
        name: first.name || 'Ukjent produkt',
        brand: first.brand || undefined,
        category: category || first.vendor || undefined,
        imageUrl: first.image || undefined,
        currentPrice: cheapestPrice || undefined,
        storeName: cheapest.store?.name || undefined,
        storeLogo: cheapest.store?.logo || undefined,
      };
    }

    return { name: 'Ukjent produkt' };
  } catch (error) {
    console.error('Product lookup failed:', error);
    return { name: 'Ukjent produkt' };
  }
}
