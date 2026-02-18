import { Router, Request, Response } from 'express';
import { getAllRecentPrices } from '../services/databaseService.js';

const router = Router();

interface StoreEntry {
  store_name: string;
  location: string;
  price: number;
  submitted_at: string;
}

interface GroupedPrice {
  barcode: string;
  product_name: string;
  min_price: number;
  max_price: number;
  submission_count: number;
  currency: string;
  stores: string[];
  locations: string[];
  latest_submission: string;
  entries: StoreEntry[];
}

router.get('/grouped', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const allPrices = await getAllRecentPrices(limit * 3);

    const grouped = new Map<string, GroupedPrice>();

    for (const submission of allPrices) {
      const key = submission.barcode;

      const entry: StoreEntry = {
        store_name: submission.store_name || '',
        location: submission.location || '',
        price: submission.price,
        submitted_at: submission.submitted_at.toString(),
      };

      if (!grouped.has(key)) {
        grouped.set(key, {
          barcode: submission.barcode,
          product_name: submission.product_name,
          min_price: submission.price,
          max_price: submission.price,
          submission_count: 1,
          currency: submission.currency,
          stores: submission.store_name ? [submission.store_name] : [],
          locations: submission.location ? [submission.location] : [],
          latest_submission: submission.submitted_at.toString(),
          entries: [entry],
        });
      } else {
        const group = grouped.get(key)!;
        group.min_price = Math.min(group.min_price, submission.price);
        group.max_price = Math.max(group.max_price, submission.price);
        group.submission_count++;
        group.entries.push(entry);

        if (submission.store_name && !group.stores.includes(submission.store_name)) {
          group.stores.push(submission.store_name);
        }

        if (submission.location && !group.locations.includes(submission.location)) {
          group.locations.push(submission.location);
        }

        if (new Date(submission.submitted_at) > new Date(group.latest_submission)) {
          group.latest_submission = submission.submitted_at.toString();
        }
      }
    }

    // Convert to array and sort by latest submission
    const groupedArray = Array.from(grouped.values())
      .sort((a, b) => new Date(b.latest_submission).getTime() - new Date(a.latest_submission).getTime())
      .slice(0, limit);

    res.json({
      count: groupedArray.length,
      prices: groupedArray,
    });
  } catch (error) {
    console.error('Error getting grouped prices:', error);
    res.status(500).json({
      error: 'Failed to get grouped prices',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
