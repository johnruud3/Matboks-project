export interface Product {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
}

export interface PriceEvaluation {
  evaluation: 'good' | 'average' | 'expensive';
  explanation: string;
  product: Product;
  confidence: 'low' | 'medium' | 'high';
  barcode: string;
  price: number;
  currency: string;
  timestamp: string;
}

export interface EvaluateRequest {
  barcode: string;
  price: number;
  currency: string;
}

export interface ScanHistoryItem extends PriceEvaluation {
  id: string;
}
