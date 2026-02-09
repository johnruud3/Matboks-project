export interface PriceSubmission {
  id: string;
  barcode: string;
  product_name: string;
  price: number;
  currency: string;
  store_name?: string;
  location?: string;
  submitted_at: Date;
  user_id?: string;
}

export interface PriceStats {
  barcode: string;
  submission_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  last_updated: Date;
}

export interface SubmitPriceRequest {
  barcode: string;
  product_name: string;
  price: number;
  currency: string;
  store_name?: string;
  location?: string;
}
