import { Router, Request, Response } from 'express';

const router = Router();

interface KassalSearchProduct {
  id: number;
  name: string;
  brand: string | null;
  vendor: string | null;
  ean: string | null;
  image: string | null;
  current_price: { price: number; unit_price: number | null; date: string } | number | null;
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
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);

    console.log(`[ProductSearch] Request: page=${page}, size=${size}, q="${query}"`);

    const params = new URLSearchParams({
      size: '30',
      page: page.toString(),
    });

    // Add search term if provided
    if (query.trim()) {
      params.set('search', query.trim());
    }

    const kassalUrl = `https://kassal.app/api/v1/products?${params.toString()}`;
    console.log(`[ProductSearch] Kassal URL: ${kassalUrl}`);

    const response = await fetch(
      kassalUrl,
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
    
    // Debug: log first 3 products
    console.log(`[ProductSearch] Sample products:`, (data.data || []).slice(0, 3).map(p => ({
      name: p.name?.substring(0, 30),
      ean: p.ean,
      price: p.current_price,
    })));

    const extractPrice = (cp: KassalSearchProduct['current_price']): number | null => {
      if (cp == null) return null;
      if (typeof cp === 'number') return cp;
      return cp.price ?? null;
    };

    const cheapestByEan = new Map<string, {
      name: string;
      brand: string | null;
      ean: string;
      image: string | null;
      current_price: number;
      store_name: string | null;
      store_logo: string | null;
    }>();

    let skippedNoPrice = 0;
    let skippedNoEan = 0;
    
    for (const p of data.data || []) {
      const price = extractPrice(p.current_price);
      if (!p.ean) {
        skippedNoEan++;
        continue;
      }
      if (price == null || price <= 0) {
        skippedNoPrice++;
        continue;
      }

      const existing = cheapestByEan.get(p.ean);
      if (!existing || price < existing.current_price) {
        cheapestByEan.set(p.ean, {
          name: p.name,
          brand: p.brand || null,
          ean: p.ean,
          image: p.image || existing?.image || null,
          current_price: price,
          store_name: p.store?.name || null,
          store_logo: p.store?.logo || null,
        });
      }
    }

    const products = Array.from(cheapestByEan.values());
    const rawCount = (data.data || []).length;
    const hasMore = products.length > 0 && rawCount >= 30;
    console.log(`[ProductSearch] Response: rawCount=${rawCount}, skippedNoEan=${skippedNoEan}, skippedNoPrice=${skippedNoPrice}, uniqueProducts=${products.length}, hasMore=${hasMore}`);
    res.json({ products, page, hasMore });
  } catch (error) {
    console.error('Product search failed:', error);
    res.json({ products: [], page: 1, hasMore: false });
  }
});

export default router;
