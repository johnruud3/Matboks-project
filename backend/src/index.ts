import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import evaluateRouter from './routes/evaluate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pris-Appen API is running' });
});

app.use('/api', evaluateRouter);

app.listen(PORT, () => {
  console.log(`🚀 Pris-Appen API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🇳🇴 Norwegian market context enabled`);
});
