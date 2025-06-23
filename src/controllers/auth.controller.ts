import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma/client';
import { generateToken } from '../utils/jwt';
import createError from 'http-errors';
import { ensureDefaultCategories } from '../services/categoryService';

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError(400, 'Email and password are required');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw createError(400, 'Email already in use');

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed },
  });

  const token = generateToken(user.id);
  await ensureDefaultCategories(user.id);

    res.status(201).json({ user: { id: user.id, email: user.email }, token });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError(400, 'Email and password are required');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw createError(400, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw createError(400, 'Invalid credentials');

  const token = generateToken(user.id);
  res.json({ token });
};
