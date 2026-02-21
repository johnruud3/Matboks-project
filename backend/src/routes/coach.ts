import express from 'express';
import multer from 'multer';
import { analyzeFoodPhoto } from '../services/foodPhotoService.js';
import { getCoachAdvice, getDailyTargets, type CoachAdviceRequest, type DailyTargetsRequest } from '../services/coachAdviceService.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.post('/analyze-food-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }
    const result = await analyzeFoodPhoto(req.file.buffer);
    res.json(result);
  } catch (err) {
    console.error('Food photo analysis error:', err);
    res.status(500).json({
      error: 'Failed to analyze food photo',
      description: 'Ukjent måltid',
      estimatedCalories: 0,
      estimatedProtein: 0,
    });
  }
});

router.post('/targets', express.json(), async (req, res) => {
  try {
    const body = req.body as DailyTargetsRequest;
    const goals = body?.goals ?? { goalType: 'maintain' };
    const result = await getDailyTargets({
      goals: {
        goalType: goals.goalType ?? 'maintain',
        heightCm: goals.heightCm,
        weightKg: goals.weightKg,
        age: goals.age,
        gender: goals.gender,
        targetWeightKg: goals.targetWeightKg,
      },
    });
    res.json(result);
  } catch (err) {
    console.error('Coach targets error:', err);
    res.status(500).json({ dailyCalories: 2000, dailyProtein: 100 });
  }
});

router.post('/advice', express.json(), async (req, res) => {
  try {
    const body = req.body as CoachAdviceRequest;
    const goals = body?.goals ?? { goalType: 'maintain' };
    const logEntries = Array.isArray(body?.logEntries) ? body.logEntries : [];
    const result = await getCoachAdvice({
      goals: {
        goalType: goals.goalType ?? 'maintain',
        heightCm: goals.heightCm,
        weightKg: goals.weightKg,
        age: goals.age,
        gender: goals.gender,
        targetWeightKg: goals.targetWeightKg,
      },
      logEntries,
      question: typeof body?.question === 'string' ? body.question : undefined,
    });
    res.json({ advice: result.advice, recipe: result.recipe ?? undefined });
  } catch (err) {
    console.error('Coach advice error:', err);
    res.status(500).json({
      error: 'Kunne ikke hente råd',
      advice: 'Noe gikk galt. Prøv igjen senere.',
    });
  }
});

export default router;
