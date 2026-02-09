import { Router, Request, Response } from 'express';
import { submitPrice, getPriceStats, getRecentPrices, getAllRecentPrices } from '../services/databaseService.js';
import { SubmitPriceRequest } from '../types/database.js';

const router = Router();

// Submit a new price
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { barcode, product_name, price, currency, store_name, location }: SubmitPriceRequest = req.body;

    if (!barcode || !product_name || !price || !currency) {
      res.status(400).json({
        error: 'Missing required fields: barcode, product_name, price, currency',
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

    const submission = await submitPrice({
      barcode,
      product_name,
      price,
      currency,
      store_name,
      location,
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Error submitting price:', error);
    res.status(500).json({
      error: 'Failed to submit price',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get price statistics for a product
router.get('/stats/:barcode', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      res.status(400).json({
        error: 'Barcode is required',
      });
      return;
    }

    const stats = await getPriceStats(barcode);

    if (!stats) {
      res.status(404).json({
        error: 'No price data found for this product',
        barcode,
      });
      return;
    }

    res.json(stats);
  } catch (error) {
    console.error('Error getting price stats:', error);
    res.status(500).json({
      error: 'Failed to get price statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get recent price submissions for a product
router.get('/recent/:barcode', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!barcode) {
      res.status(400).json({
        error: 'Barcode is required',
      });
      return;
    }

    const prices = await getRecentPrices(barcode, limit);

    res.json({
      barcode,
      count: prices.length,
      prices,
    });
  } catch (error) {
    console.error('Error getting recent prices:', error);
    res.status(500).json({
      error: 'Failed to get recent prices',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get all recent price submissions (for community feed)
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const prices = await getAllRecentPrices(limit);

    res.json({
      count: prices.length,
      prices,
    });
  } catch (error) {
    console.error('Error getting all recent prices:', error);
    res.status(500).json({
      error: 'Failed to get recent prices',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
