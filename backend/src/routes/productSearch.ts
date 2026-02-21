import { Router, Request, Response } from 'express';

const router = Router();

// Open Food Facts – free, commercial use OK. No store data; store logos stay in app (constants/STORE_LOGO_MAP).
const OFF_USER_AGENT = 'MatBoks/1.0 (Norwegian grocery app; +https://github.com)';
const OFF_BASE = 'https://world.openfoodfacts.org';

interface OFFSearchProduct {
  code?: string;
  product_name?: string;
  product_name_no?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  image_small_url?: string;
}

interface OFFSearchResponse {
  count?: number;
  page?: number;
  page_size?: number;
  products?: OFFSearchProduct[];
}

export interface SearchProduct {
  name: string;
  brand: string | null;
  ean: string;
  image: string | null;
  current_price: number | null;
  store_name: string | null;
  store_logo: string | null;
}

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const size = Math.min(parseInt(req.query.size as string) || 30, 100);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);

    console.log(`[ProductSearch] OFF request: page=${page}, size=${size}, q="${query}"`);

    const params = new URLSearchParams({
      page: page.toString(),
      page_size: size.toString(),
      json: '1',
    });
    if (query.trim()) {
      params.set('search_terms', query.trim());
    }

    const url = `${OFF_BASE}/cgi/search.pl?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': OFF_USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[ProductSearch] OFF error: ${response.status}`);
      res.json({ products: [], page: 1, hasMore: false });
      return;
    }

    const data = (await response.json()) as OFFSearchResponse;
    const raw = data.products || [];
    const products: SearchProduct[] = raw
      .filter((p) => p.code && (p.product_name || p.product_name_no))
      .map((p) => ({
        name: p.product_name_no || p.product_name || 'Ukjent',
        brand: p.brands || null,
        ean: p.code!,
        image: p.image_front_url || p.image_url || p.image_small_url || null,
        current_price: null,
        store_name: null,
        store_logo: null,
      }));

    const hasMore = products.length >= size && (data.count ?? 0) > page * size;
    console.log(`[ProductSearch] OFF response: ${products.length} products, hasMore=${hasMore}`);
    res.json({ products, page, hasMore });
  } catch (error) {
    console.error('Product search failed:', error);
    res.json({ products: [], page: 1, hasMore: false });
  }
});

export default router;
