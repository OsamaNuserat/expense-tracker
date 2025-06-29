import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma/client';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { validatePassword, validateEmail } from '../utils/validation';
import createError from 'http-errors';
import { ensureDefaultCategories } from '../services/categoryService';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes
const SALT_ROUNDS = 12;

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError(400, 'Email and password are required');
  }

  // Validate email format
  if (!validateEmail(email)) {
    throw createError(400, 'Invalid email format');
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw createError(400, `Password validation failed: ${passwordValidation.errors.join(', ')}`);
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw createError(409, 'Email already in use');
  }

  // Hash password with higher salt rounds for better security
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  
  // Create user
  const user = await prisma.user.create({
    data: { 
      email: email.toLowerCase(), 
      password: hashed 
    },
  });

  // Generate tokens
  const { accessToken, refreshToken, tokenId } = generateTokens(user.id, user.email);
  
  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });

  // Ensure default categories
  await ensureDefaultCategories(user.id);

  res.status(201).json({ 
    user: { 
      id: user.id, 
      email: user.email,
      emailVerified: user.emailVerified 
    }, 
    accessToken,
    refreshToken
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError(400, 'Email and password are required');
  }

  // Find user
  const user = await prisma.user.findUnique({ 
    where: { email: email.toLowerCase() } 
  });
  
  if (!user) {
    throw createError(401, 'Invalid credentials');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const unlockTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw createError(423, `Account locked. Try again in ${unlockTime} minutes.`);
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.password);
  
  if (!valid) {
    // Increment failed attempts
    const failedAttempts = user.failedLoginAttempts + 1;
    
    const updateData: any = {
      failedLoginAttempts: failedAttempts
    };

    // Lock account if max attempts reached
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCK_TIME);
      updateData.failedLoginAttempts = 0;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      throw createError(423, 'Account locked due to too many failed attempts. Try again in 30 minutes.');
    }

    throw createError(401, `Invalid credentials. ${MAX_FAILED_ATTEMPTS - failedAttempts} attempts remaining.`);
  }

  // Clear failed attempts and locked status on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    }
  });

  // Generate tokens
  const { accessToken, refreshToken, tokenId } = generateTokens(user.id, user.email);
  
  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });

  res.json({ 
    user: { 
      id: user.id, 
      email: user.email,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt 
    },
    accessToken,
    refreshToken
  });
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw createError(400, 'Refresh token is required');
  }

  // Verify refresh token
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw createError(401, 'Invalid refresh token');
  }

  // Check if refresh token exists in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true }
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    // Clean up expired token
    if (storedToken) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    }
    throw createError(401, 'Refresh token expired or invalid');
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken, tokenId } = generateTokens(
    storedToken.user.id, 
    storedToken.user.email
  );

  // Replace old refresh token with new one
  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: storedToken.id } }),
    prisma.refreshToken.create({
      data: {
        id: tokenId,
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })
  ]);

  res.json({
    accessToken,
    refreshToken: newRefreshToken
  });
};

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    // Remove refresh token from database
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  }

  res.json({ message: 'Logged out successfully' });
};

export const logoutAll = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  // Remove all refresh tokens for the user
  await prisma.refreshToken.deleteMany({
    where: { userId }
  });

  res.json({ message: 'Logged out from all devices successfully' });
};
