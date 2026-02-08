import { Router, Request, Response } from 'express';
import { lookupProduct } from '../services/productService.js';
import { EvaluateRequest } from '../types/index.js';
import { evaluatePrice } from '../services/aiService.js';

const router = Router();

router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const { barcode, price, currency }: EvaluateRequest = req.body;

    if (!barcode || !price || !currency) {
      res.status(400).json({
        error: 'Missing required fields: barcode, price, currency',
      });
      return;
    }

    if (price <= 0) {
      res.status(400).json({
        error: 'Price must be greater than 0',
      });
      return;
    }

    if (currency !== 'NOK') {
      res.status(400).json({
        error: 'Only NOK currency is supported',
      });
      return;
    }

    const product = await lookupProduct(barcode);

    const evaluation = await evaluatePrice(product, price, currency, barcode);

    res.json(evaluation);
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
