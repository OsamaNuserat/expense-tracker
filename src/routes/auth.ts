import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (username === 'testuser' && password === 'password') {
    const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

export default router;
