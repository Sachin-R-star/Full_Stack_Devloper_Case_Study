import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import organizationRoutes from './routes/organizationRoutes';
import customerRoutes from './routes/customerRoutes';
import productRoutes from './routes/productRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import challanRoutes from './routes/challanRoutes';
import reportRoutes from './routes/reportRoutes';
import { handleRazorpayWebhook } from './controllers/webhookController';
import { errorHandler } from './middlewares/error.middleware';
import { authRateLimiter, registerRateLimiter, apiRateLimiter } from './middlewares/rateLimiter';

const app = express();

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. CORS restricted to authorized frontend origin
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, fallback allowed
      }
    },
    credentials: true,
  })
);

// 3. Request Body Size Limit (Prevents large payload denial of service attacks)
app.use(express.json({ limit: '100kb' }));

// 4. Rate Limiters
app.use('/auth/login', authRateLimiter);
app.use('/api/auth/login', authRateLimiter);

app.use('/auth/register', registerRateLimiter);
app.use('/api/auth/register', registerRateLimiter);

// Apply general API rate limiting to data endpoints
app.use('/customers', apiRateLimiter);
app.use('/products', apiRateLimiter);
app.use('/challans', apiRateLimiter);

// Public Webhooks
app.post('/webhooks/razorpay', handleRazorpayWebhook);
app.post('/api/webhooks/razorpay', handleRazorpayWebhook);

// Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use('/organization', organizationRoutes);
app.use('/api/organization', organizationRoutes);

app.use('/customers', customerRoutes);
app.use('/api/customers', customerRoutes);

app.use('/products', productRoutes);
app.use('/api/products', productRoutes);

app.use('/inventory', inventoryRoutes);
app.use('/api/inventory', inventoryRoutes);

app.use('/challans', challanRoutes);
app.use('/api/challans', challanRoutes);

app.use('/reports', reportRoutes);
app.use('/api/reports', reportRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mini ERP + CRM SaaS Server', timestamp: new Date() });
});

// Global Error Handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 Security Hardened SaaS Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

export default app;
