import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import evaluateRouter from './routes/evaluate.js';
import pricesRouter from './routes/prices.js';
import groupedPricesRouter from './routes/groupedPrices.js';
import productRouter from './routes/product.js';
import productSearchRouter from './routes/productSearch.js';
import adminRouter from './routes/admin.js';
import receiptRouter from './routes/receipt.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files for admin dashboard
app.use('/admin', express.static('public'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Pris-Appen API is running',
    kassal_key_set: !!process.env.KASSAL_API_KEY,
    kassal_key_length: process.env.KASSAL_API_KEY?.length || 0,
  });
});

app.use('/api', evaluateRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/prices', groupedPricesRouter);
app.use('/api/product', productRouter);
app.use('/api/products', productSearchRouter);
app.use('/api/admin', adminRouter);
app.use('/api/receipt', receiptRouter);

app.listen(PORT, () => {
  console.log(`🚀 Pris-Appen API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🇳🇴 Norwegian market context enabled`);
  console.log(`🔑 OpenAI API Key present: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO'}`);
  console.log(`🔑 OpenAI API Key length: ${process.env.OPENAI_API_KEY?.length || 0}`);
});
