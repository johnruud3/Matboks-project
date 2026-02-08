import { Product, OpenFoodFactsProduct } from '../types/index.js';

export async function lookupProduct(barcode: string): Promise<Product> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    
    if (!response.ok) {
      throw new Error('Product not found');
    }

    const data: OpenFoodFactsProduct = await response.json();
    
    if (data.status === 1 && data.product) {
      return {
        name: data.product.product_name || 'Ukjent produkt',
        brand: data.product.brands || undefined,
        category: data.product.categories?.split(',')[0]?.trim() || undefined,
        imageUrl: data.product.image_url || undefined,
      };
    }
    
    return {
      name: 'Ukjent produkt',
    };
  } catch (error) {
    console.error('Product lookup failed:', error);
    return {
      name: 'Ukjent produkt',
    };
  }
}
