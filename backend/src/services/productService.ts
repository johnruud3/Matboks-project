import { Product } from '../types/index.js';

// Open Food Facts – free, open data, commercial use OK with attribution
// https://world.openfoodfacts.org – set User-Agent as per their policy
const OFF_USER_AGENT = 'MatBoks/1.0 (Norwegian grocery app; +https://github.com)';
const OFF_BASE = 'https://world.openfoodfacts.org';

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal'?: number;
  proteins_100g?: number;
  proteins?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

interface OFFProductResponse {
  status: number;
  code?: string;
  product?: {
    product_name?: string;
    product_name_no?: string;
    brands?: string;
    categories?: string;
    image_front_url?: string;
    image_url?: string;
    image_small_url?: string;
    nutriments?: OFFNutriments;
  };
}

export async function lookupProduct(barcode: string): Promise<Product> {
  try {
    const fields = 'product_name,product_name_no,brands,categories,image_front_url,image_url,image_small_url,nutriments';
    const url = `${OFF_BASE}/api/v2/product/${barcode}.json?fields=${fields}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': OFF_USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return { name: 'Ukjent produkt' };
    }

    const data = (await response.json()) as OFFProductResponse;
    if (data.status !== 1 || !data.product) {
      return { name: 'Ukjent produkt' };
    }

    const p = data.product;
    const name = p.product_name_no || p.product_name || 'Ukjent produkt';
    const imageUrl = p.image_front_url || p.image_url || p.image_small_url;
    const category = p.categories?.split(',')[0]?.trim();
    const nut = p.nutriments;
    const calories = nut?.['energy-kcal_100g'] ?? nut?.['energy-kcal'];
    const protein = nut?.proteins_100g ?? nut?.proteins;
    const carbs = nut?.carbohydrates_100g;
    const fat = nut?.fat_100g;

    return {
      name,
      brand: p.brands || undefined,
      category: category || undefined,
      imageUrl: imageUrl || undefined,
      // No store prices from Open Food Facts – community prices only
      nutriments: (calories != null || protein != null || carbs != null || fat != null)
        ? { caloriesPer100g: calories, proteinPer100g: protein, carbsPer100g: carbs, fatPer100g: fat }
        : undefined,
    };
  } catch (error) {
    console.error('Product lookup failed:', error);
    return { name: 'Ukjent produkt' };
  }
}
