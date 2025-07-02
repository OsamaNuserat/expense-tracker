import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import messageRoutes from './routes/message.routes';
import categoryRoutes from './routes/category.routes';
import summaryRoutes from './routes/summary.routes';
import notificationsRouter from "./routes/notification.route";
import survivalBudgetRouter from "./routes/survivalBudget.routes";
import cliqRoutes from './routes/cliq.routes';
import recurringPaymentRoutes from './routes/recurringPayment.routes';
import advisorRoutes from './routes/advisor.routes';
import financialGoalsRoutes from './routes/financialGoals.routes';
import { authenticate } from './middleware/auth.middleware';
import { errorHandler } from './middleware/errorHandler';
import { generalRateLimit } from './middleware/rateLimit';
import { TokenCleanupService } from './services/tokenCleanup';
import { setupSwagger } from './config/swagger';
import { setupPostmanExport } from './config/postman';

const app = express();

// Security middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Apply rate limiting only in production
if (process.env.NODE_ENV === 'production') {
  app.use(generalRateLimit);
  console.log('📊 Rate limiting enabled (production mode)');
} else {
  console.log('🚀 Rate limiting disabled (development mode)');
}

// Setup Swagger documentation
setupSwagger(app);

// Setup Postman collection export
setupPostmanExport(app);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Checks if the API is running and healthy
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-06-29T14:30:00Z"
 */
// Health check endpoint
app.get('/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', authenticate, messageRoutes);
app.use('/api/categories', authenticate, categoryRoutes);
app.use('/api/notifications', notificationsRouter);
app.use('/api/summary', authenticate, summaryRoutes);
app.use('/api/budget/survival', authenticate, survivalBudgetRouter);
app.use('/api/cliq', authenticate, cliqRoutes);
app.use('/api/recurring-payments', authenticate, recurringPaymentRoutes);
app.use('/api/advisor', authenticate, advisorRoutes);
app.use('/api/financial-goals', financialGoalsRoutes);

// Error handling
app.use(errorHandler);

app.get('/', (_req, res) => res.send('Expense Tracker API'));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  
  // Start token cleanup service
  TokenCleanupService.startCleanup();
  console.log('Token cleanup service started');
});
