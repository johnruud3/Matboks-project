import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import evaluateRouter from './routes/evaluate.js';
import pricesRouter from './routes/prices.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pris-Appen API is running' });
});

app.use('/api', evaluateRouter);
app.use('/api/prices', pricesRouter);

app.listen(PORT, () => {
  console.log(`🚀 Pris-Appen API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🇳🇴 Norwegian market context enabled`);
  console.log(`🔑 OpenAI API Key present: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO'}`);
  console.log(`🔑 OpenAI API Key length: ${process.env.OPENAI_API_KEY?.length || 0}`);
});
