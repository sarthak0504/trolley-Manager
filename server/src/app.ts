import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

import clientRoutes from './routes/clients.routes';
import trolleyRoutes from './routes/trolleys.routes';
import paymentRoutes from './routes/payments.routes';
import expenseRoutes from './routes/expenses.routes';
import { errorMiddleware } from './pipeline/middleware/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_, res) => res.json({ status: 'ok', message: 'Trolley server is running' }));

app.use('/api/clients', clientRoutes);
app.use('/api/trolleys', trolleyRoutes);
app.use('/api/clients/:clientId/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);

app.use(errorMiddleware);

export default app;

// Only start the HTTP server when running locally (not on Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
