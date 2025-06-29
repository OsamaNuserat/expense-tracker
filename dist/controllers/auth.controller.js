"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutAll = exports.logout = exports.refreshToken = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = __importDefault(require("../prisma/client"));
const jwt_1 = require("../utils/jwt");
const validation_1 = require("../utils/validation");
const http_errors_1 = __importDefault(require("http-errors"));
const categoryService_1 = require("../services/categoryService");
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes
const SALT_ROUNDS = 12;
const register = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw (0, http_errors_1.default)(400, 'Email and password are required');
    }
    // Validate email format
    if (!(0, validation_1.validateEmail)(email)) {
        throw (0, http_errors_1.default)(400, 'Invalid email format');
    }
    // Validate password strength
    const passwordValidation = (0, validation_1.validatePassword)(password);
    if (!passwordValidation.isValid) {
        throw (0, http_errors_1.default)(400, `Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }
    // Check if user already exists
    const existing = await client_1.default.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
        throw (0, http_errors_1.default)(409, 'Email already in use');
    }
    // Hash password with higher salt rounds for better security
    const hashed = await bcrypt_1.default.hash(password, SALT_ROUNDS);
    // Create user
    const user = await client_1.default.user.create({
        data: {
            email: email.toLowerCase(),
            password: hashed
        },
    });
    // Generate tokens
    const { accessToken, refreshToken, tokenId } = (0, jwt_1.generateTokens)(user.id, user.email);
    // Store refresh token in database
    await client_1.default.refreshToken.create({
        data: {
            id: tokenId,
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
    });
    // Ensure default categories
    await (0, categoryService_1.ensureDefaultCategories)(user.id);
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
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw (0, http_errors_1.default)(400, 'Email and password are required');
    }
    // Find user
    const user = await client_1.default.user.findUnique({
        where: { email: email.toLowerCase() }
    });
    if (!user) {
        throw (0, http_errors_1.default)(401, 'Invalid credentials');
    }
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
        const unlockTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        throw (0, http_errors_1.default)(423, `Account locked. Try again in ${unlockTime} minutes.`);
    }
    // Verify password
    const valid = await bcrypt_1.default.compare(password, user.password);
    if (!valid) {
        // Increment failed attempts
        const failedAttempts = user.failedLoginAttempts + 1;
        const updateData = {
            failedLoginAttempts: failedAttempts
        };
        // Lock account if max attempts reached
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            updateData.lockedUntil = new Date(Date.now() + LOCK_TIME);
            updateData.failedLoginAttempts = 0;
        }
        await client_1.default.user.update({
            where: { id: user.id },
            data: updateData
        });
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            throw (0, http_errors_1.default)(423, 'Account locked due to too many failed attempts. Try again in 30 minutes.');
        }
        throw (0, http_errors_1.default)(401, `Invalid credentials. ${MAX_FAILED_ATTEMPTS - failedAttempts} attempts remaining.`);
    }
    // Clear failed attempts and locked status on successful login
    await client_1.default.user.update({
        where: { id: user.id },
        data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date()
        }
    });
    // Generate tokens
    const { accessToken, refreshToken, tokenId } = (0, jwt_1.generateTokens)(user.id, user.email);
    // Store refresh token in database
    await client_1.default.refreshToken.create({
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
exports.login = login;
const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw (0, http_errors_1.default)(400, 'Refresh token is required');
    }
    // Verify refresh token
    let payload;
    try {
        payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
    }
    catch (error) {
        throw (0, http_errors_1.default)(401, 'Invalid refresh token');
    }
    // Check if refresh token exists in database
    const storedToken = await client_1.default.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
        // Clean up expired token
        if (storedToken) {
            await client_1.default.refreshToken.delete({ where: { id: storedToken.id } });
        }
        throw (0, http_errors_1.default)(401, 'Refresh token expired or invalid');
    }
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken, tokenId } = (0, jwt_1.generateTokens)(storedToken.user.id, storedToken.user.email);
    // Replace old refresh token with new one
    await client_1.default.$transaction([
        client_1.default.refreshToken.delete({ where: { id: storedToken.id } }),
        client_1.default.refreshToken.create({
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
exports.refreshToken = refreshToken;
const logout = async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        // Remove refresh token from database
        await client_1.default.refreshToken.deleteMany({
            where: { token: refreshToken }
        });
    }
    res.json({ message: 'Logged out successfully' });
};
exports.logout = logout;
const logoutAll = async (req, res) => {
    const userId = req.user.id;
    // Remove all refresh tokens for the user
    await client_1.default.refreshToken.deleteMany({
        where: { userId }
    });
    res.json({ message: 'Logged out from all devices successfully' });
};
exports.logoutAll = logoutAll;
