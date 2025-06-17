"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = __importDefault(require("../prisma/client"));
const jwt_1 = require("../utils/jwt");
async function register(req, res) {
    const { email, password } = req.body;
    console.log(email, password);
    const existing = await client_1.default.user.findUnique({ where: { email } });
    if (existing)
        return res.status(400).json({ error: 'Email already in use' });
    const hashed = await bcrypt_1.default.hash(password, 10);
    const user = await client_1.default.user.create({
        data: { email, password: hashed },
    });
    const token = (0, jwt_1.generateToken)(user.id);
    return res.json({ token });
}
async function login(req, res) {
    const { email, password } = req.body;
    console.log(email, password);
    const user = await client_1.default.user.findUnique({ where: { email } });
    if (!user)
        return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt_1.default.compare(password, user.password);
    if (!valid)
        return res.status(400).json({ error: 'Invalid credentials' });
    const token = (0, jwt_1.generateToken)(user.id);
    return res.json({ token });
}
