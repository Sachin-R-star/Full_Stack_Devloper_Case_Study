import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customerRoutes';
import productRoutes from './routes/productRoutes';
import challanRoutes from './routes/challanRoutes';
import reportRoutes from './routes/reportRoutes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

// Auth Endpoints (Support both /auth and /api/auth)
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Additional Module Endpoints
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/reports', reportRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mini ERP + CRM Server', timestamp: new Date() });
});

// Global Error Handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

export default app;
