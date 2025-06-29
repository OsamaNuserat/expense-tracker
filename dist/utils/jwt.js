"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokens = generateTokens;
exports.verifyToken = verifyToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.generateToken = generateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
function generateTokens(userId, email) {
    const tokenId = crypto_1.default.randomUUID();
    const accessToken = jsonwebtoken_1.default.sign({
        userId,
        email,
        jti: tokenId
    }, JWT_SECRET, {
        expiresIn: '15m', // Shorter access token lifetime
        issuer: 'expense-tracker',
        audience: 'expense-tracker-client'
    });
    const refreshToken = jsonwebtoken_1.default.sign({
        userId,
        tokenId
    }, JWT_REFRESH_SECRET, {
        expiresIn: '7d', // Longer refresh token lifetime
        issuer: 'expense-tracker',
        audience: 'expense-tracker-client'
    });
    return { accessToken, refreshToken, tokenId };
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET, {
            issuer: 'expense-tracker',
            audience: 'expense-tracker-client'
        });
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
}
function verifyRefreshToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET, {
            issuer: 'expense-tracker',
            audience: 'expense-tracker-client'
        });
    }
    catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
}
// Legacy function for backward compatibility
function generateToken(userId) {
    return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
}
