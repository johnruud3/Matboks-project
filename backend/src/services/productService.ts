import { Product } from '../types/index.js';

interface KassalProduct {
  id: number;
  name: string;
  brand: string | null;
  vendor: string | null;
  ean: string | null;
  image: string | null;
  description: string | null;
  current_price: number | null;
  store: {
    name: string;
    code: string;
  } | null;
}

interface KassalResponse {
  data: KassalProduct[];
}

export async function lookupProduct(barcode: string): Promise<Product> {
  try {
    const apiKey = process.env.KASSAL_API_KEY;
    if (!apiKey) throw new Error('KASSAL_API_KEY not set');

    const response = await fetch(
      `https://kassal.app/api/v1/products?search=${barcode}&unique=true`,
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

    const data = await response.json() as KassalResponse;
    const product = data.data?.[0];

    if (product) {
      return {
        name: product.name || 'Ukjent produkt',
        brand: product.brand || undefined,
        category: product.vendor || undefined,
        imageUrl: product.image || undefined,
      };
    }

    return { name: 'Ukjent produkt' };
  } catch (error) {
    console.error('Product lookup failed:', error);
    return { name: 'Ukjent produkt' };
  }
}
