import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma/client';
import { generateToken } from '../utils/jwt';

export async function register(req: Request, res: Response) {
  const { email, password } = req.body;

    console.log(email , password)


  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed },
  });

  const token = generateToken(user.id);
  return res.json({ token });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  console.log(email , password)

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

  const token = generateToken(user.id);
  return res.json({ token });
}
