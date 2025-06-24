"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = __importDefault(require("../prisma/client"));
const jwt_1 = require("../utils/jwt");
const http_errors_1 = __importDefault(require("http-errors"));
const categoryService_1 = require("../services/categoryService");
const register = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw (0, http_errors_1.default)(400, 'Email and password are required');
    }
    const existing = await client_1.default.user.findUnique({ where: { email } });
    if (existing)
        throw (0, http_errors_1.default)(400, 'Email already in use');
    const hashed = await bcrypt_1.default.hash(password, 10);
    const user = await client_1.default.user.create({
        data: { email, password: hashed },
    });
    const token = (0, jwt_1.generateToken)(user.id);
    await (0, categoryService_1.ensureDefaultCategories)(user.id);
    res.status(201).json({ user: { id: user.id, email: user.email }, token });
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw (0, http_errors_1.default)(400, 'Email and password are required');
    }
    const user = await client_1.default.user.findUnique({ where: { email } });
    if (!user)
        throw (0, http_errors_1.default)(400, 'Invalid credentials');
    const valid = await bcrypt_1.default.compare(password, user.password);
    if (!valid)
        throw (0, http_errors_1.default)(400, 'Invalid credentials');
    const token = (0, jwt_1.generateToken)(user.id);
    res.json({ token });
};
exports.login = login;
