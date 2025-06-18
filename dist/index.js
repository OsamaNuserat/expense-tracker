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
const sender_routes_1 = __importDefault(require("./routes/sender.routes"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/auth', auth_routes_1.default);
app.use('/api/messages', auth_middleware_1.authenticate, message_routes_1.default);
app.use('/api/categories', auth_middleware_1.authenticate, category_routes_1.default);
app.use('/api/notifications', notification_route_1.default);
app.use('/api/summary', auth_middleware_1.authenticate, summary_routes_1.default);
app.use('/api/sender-category', auth_middleware_1.authenticate, sender_routes_1.default);
app.get('/', (_req, res) => res.send('Expense Tracker API'));
app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:3000');
});
