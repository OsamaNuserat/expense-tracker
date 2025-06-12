import express from 'express';
import authRoutes from './routes/auth.routes';
import apiRoutes from './routes/api';
import { authenticate } from './middleware/auth.middleware';

const app = express();
app.use(express.json());

// Auth routes
app.use('/auth', authRoutes);

// Protected routes
app.use('/api', authenticate, apiRoutes);

app.get('/', (_req, res) => res.send('Expense Tracker API'));

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
