"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const api_1 = __importDefault(require("./routes/api"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Auth routes
app.use('/auth', auth_routes_1.default);
// Protected routes
app.use('/api', auth_middleware_1.authenticate, api_1.default);
app.get('/', (_req, res) => res.send('Expense Tracker API'));
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
