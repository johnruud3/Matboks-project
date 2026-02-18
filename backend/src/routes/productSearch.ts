import { Router, Request, Response } from 'express';

const router = Router();

interface KassalSearchProduct {
  id: number;
  name: string;
  brand: string | null;
  vendor: string | null;
  ean: string | null;
  image: string | null;
  current_price: number | null;
  current_unit_price: number | null;
  weight: number | null;
  weight_unit: string | null;
  store?: {
    name: string;
    code: string;
    logo: string | null;
  };
}

interface KassalSearchResponse {
  data: KassalSearchProduct[];
}

router.get('/search', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.KASSAL_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'KASSAL_API_KEY not configured', products: [] });
      return;
    }

    const query = (req.query.q as string) || '';
    const size = Math.min(parseInt(req.query.size as string) || 30, 100);

    const params = new URLSearchParams({
      unique: 'true',
      exclude_without_ean: 'true',
      size: size.toString(),
    });

    if (query.trim()) {
      params.set('search', query.trim());
    }

    const response = await fetch(
      `https://kassal.app/api/v1/products?${params.toString()}`,
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

    const data = (await response.json()) as KassalSearchResponse;

    const products = (data.data || [])
      .filter((p) => p.current_price != null && p.current_price > 0)
      .map((p) => ({
        name: p.name,
        brand: p.brand || null,
        ean: p.ean,
        image: p.image || null,
        current_price: p.current_price,
        store_name: p.store?.name || null,
      }));

    res.json({ products });
  } catch (error) {
    console.error('Product search failed:', error);
    res.json({ products: [] });
  }
});

export default router;
