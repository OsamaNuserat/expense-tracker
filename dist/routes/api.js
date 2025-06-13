"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const router = (0, express_1.Router)();
router.post('/parse-sms', async (req, res) => {
    const userId = req.user.id;
    const { content } = req.body;
    const message = await client_1.default.message.create({
        data: {
            content,
            userId,
        },
    });
    return res.json(message);
});
router.get('/messages', async (req, res) => {
    const userId = req.user.id;
    const messages = await client_1.default.message.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    return res.json(messages);
});
exports.default = router;
