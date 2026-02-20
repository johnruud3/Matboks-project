import { Router, Request, Response } from 'express';
import { registerPushSubscription, processDueBatches } from '../services/pushService.js';

const router = Router();

/** Register or update a device's push token and favorite stores */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { expoPushToken, favoriteStores } = req.body as {
      expoPushToken?: string;
      favoriteStores?: string[];
    };

    if (!expoPushToken || typeof expoPushToken !== 'string') {
      res.status(400).json({ error: 'expoPushToken (string) is required' });
      return;
    }

    const stores = Array.isArray(favoriteStores) ? favoriteStores : [];
    await registerPushSubscription(expoPushToken, stores);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Push register failed:', error);
    res.status(500).json({
      error: 'Failed to register push',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/** Process due batches and send pushes. Call from cron every minute. */
router.post('/process-batches', async (_req: Request, res: Response) => {
  try {
    const result = await processDueBatches();
    res.json(result);
  } catch (error) {
    console.error('Process batches failed:', error);
    res.status(500).json({
      error: 'Failed to process batches',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
