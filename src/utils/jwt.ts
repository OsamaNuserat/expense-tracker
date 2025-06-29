import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

interface TokenPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for token revocation
}

interface RefreshTokenPayload {
  userId: number;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export function generateTokens(userId: number, email: string) {
  const tokenId = crypto.randomUUID();
  
  const accessToken = jwt.sign(
    { 
      userId, 
      email,
      jti: tokenId
    }, 
    JWT_SECRET, 
    { 
      expiresIn: '15m', // Shorter access token lifetime
      issuer: 'expense-tracker',
      audience: 'expense-tracker-client'
    }
  );

  const refreshToken = jwt.sign(
    {
      userId,
      tokenId
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: '7d', // Longer refresh token lifetime
      issuer: 'expense-tracker',
      audience: 'expense-tracker-client'
    }
  );

  return { accessToken, refreshToken, tokenId };
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'expense-tracker',
      audience: 'expense-tracker-client'
    }) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'expense-tracker',
      audience: 'expense-tracker-client'
    }) as RefreshTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

// Legacy function for backward compatibility
export function generateToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
}
