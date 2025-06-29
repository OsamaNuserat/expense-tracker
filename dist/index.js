"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const summary_routes_1 = __importDefault(require("./routes/summary.routes"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const survivalBudget_routes_1 = __importDefault(require("./routes/survivalBudget.routes"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimit_1 = require("./middleware/rateLimit");
const tokenCleanup_1 = require("./services/tokenCleanup");
const swagger_1 = require("./config/swagger");
const postman_1 = require("./config/postman");
const app = (0, express_1.default)();
// Security middleware
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(rateLimit_1.generalRateLimit);
// Setup Swagger documentation
(0, swagger_1.setupSwagger)(app);
// Setup Postman collection export
(0, postman_1.setupPostmanExport)(app);
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Checks if the API is running and healthy
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-06-29T14:30:00Z"
 */
// Health check endpoint
app.get('/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/messages', auth_middleware_1.authenticate, message_routes_1.default);
app.use('/api/categories', auth_middleware_1.authenticate, category_routes_1.default);
app.use('/api/notifications', notification_route_1.default);
app.use('/api/summary', auth_middleware_1.authenticate, summary_routes_1.default);
app.use('/api/budget/survival', auth_middleware_1.authenticate, survivalBudget_routes_1.default);
// Error handling
app.use(errorHandler_1.errorHandler);
app.get('/', (_req, res) => res.send('Expense Tracker API'));
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    // Start token cleanup service
    tokenCleanup_1.TokenCleanupService.startCleanup();
    console.log('Token cleanup service started');
});
