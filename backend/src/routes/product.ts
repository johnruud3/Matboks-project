import { Router, Request, Response } from 'express';
import { lookupProduct } from '../services/productService.js';

const router = Router();

router.get('/:barcode', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;
    if (!barcode) {
      res.status(400).json({ error: 'Barcode required' });
      return;
    }
    const product = await lookupProduct(barcode);
    res.json({
      imageUrl: product.imageUrl ?? null,
      currentPrice: product.currentPrice ?? null,
      storeName: product.storeName ?? null,
      storeLogo: product.storeLogo ?? null,
    });
  } catch (error) {
    res.status(500).json({ imageUrl: null, currentPrice: null, storeName: null, storeLogo: null });
  }
});

export default router;
