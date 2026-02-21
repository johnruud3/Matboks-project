export interface ProductNutriments {
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
}

export interface Product {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  currentPrice?: number;
  storeName?: string;
  storeLogo?: string;
  nutriments?: ProductNutriments;
}

export interface EvaluateRequest {
  barcode: string;
  price: number;
  currency: string;
}

export interface PriceEvaluation {
  evaluation: 'good' | 'average' | 'expensive';
  explanation: string;
  product: Product;
  confidence: 'low' | 'medium' | 'high';
  barcode: string;
  price: number;
  currency: string;
}

export interface OpenFoodFactsProduct {
  product?: {
    product_name?: string;
    brands?: string;
    categories?: string;
    image_url?: string;
  };
  status: number;
}
