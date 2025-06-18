import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import messageRoutes from './routes/message.routes';
import categoryRoutes from './routes/category.routes';
import summaryRoutes from './routes/summary.routes';
import senderRoutes from './routes/sender.routes';
import notificationsRouter from "./routes/notification.route";
import { authenticate } from './middleware/auth.middleware';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.use('/api/messages', authenticate, messageRoutes);
app.use('/api/categories', authenticate, categoryRoutes);
app.use('/api/notifications', notificationsRouter);
app.use('/api/summary', authenticate, summaryRoutes);
app.use('/api/sender-category', authenticate, senderRoutes);
app.use(errorHandler);

app.get('/', (_req, res) => res.send('Expense Tracker API'));

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
