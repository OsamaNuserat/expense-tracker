import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3000;
const dashboardPath = path.join(__dirname, '../public/dashboard.html');

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('✅ Expense Tracker API is running');
});


app.use('/auth', authRoutes);


app.get('/dashboard', (req: Request, res: Response) => {
  res.sendFile(dashboardPath);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
