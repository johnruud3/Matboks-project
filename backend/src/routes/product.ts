import { Router, Request, Response } from 'express';
import { lookupProduct } from '../services/productService.js';
import { getPriceStats } from '../services/databaseService.js';

const router = Router();

router.get('/:barcode', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;
    if (!barcode) {
      res.status(400).json({ error: 'Barcode required' });
      return;
    }

    const [product, stats] = await Promise.all([
      lookupProduct(barcode),
      getPriceStats(barcode).catch(() => null),
    ]);

    res.json({
      imageUrl: product.imageUrl ?? null,
      currentPrice: product.currentPrice ?? null,
      storeName: product.storeName ?? null,
      storeLogo: product.storeLogo ?? null,
      nutriments: product.nutriments ?? null,
      communityStats: stats ? {
        submissionCount: stats.submission_count,
        minPrice: stats.min_price,
        maxPrice: stats.max_price,
        avgPrice: stats.avg_price,
      } : null,
    });
  } catch (error) {
    res.status(500).json({ imageUrl: null, currentPrice: null, storeName: null, storeLogo: null, nutriments: null, communityStats: null });
  }
});

export default router;
