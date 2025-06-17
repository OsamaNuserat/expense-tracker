"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const parser_1 = require("../services/parser");
const router = (0, express_1.Router)();
router.post('/parse-sms', async (req, res) => {
    const userId = req.user.id;
    const { content, timestamp } = req.body;
    const message = await client_1.default.message.create({
        data: { content, userId },
    });
    const parsed = (0, parser_1.parseMessage)(content, timestamp);
    if (!parsed)
        return res.json({ message, parsed: null, record: null, actionRequired: false, senderCategoryConfirmed: false });
    // Find default category by keyword or name
    let category = await client_1.default.category.findFirst({
        where: {
            userId,
            type: parsed.type.toUpperCase(),
            OR: [
                { name: { equals: parsed.category, mode: 'insensitive' } },
                { keywords: { contains: parsed.category, mode: 'insensitive' } },
            ],
        },
    });
    // Check if sender has a manual mapping
    let senderCategoryConfirmed = false;
    let senderCategoryExists = false;
    if (parsed.merchant) {
        const senderMap = await client_1.default.senderCategory.findFirst({
            where: { userId, sender: parsed.merchant },
        });
        if (senderMap) {
            senderCategoryExists = true;
            senderCategoryConfirmed = true;
            category = await client_1.default.category.findUnique({ where: { id: senderMap.categoryId } });
        }
    }
    let record = null;
    let actionRequired = false;
    if (!category) {
        actionRequired = true;
    }
    else {
        if (parsed.type === 'expense') {
            record = await client_1.default.expense.create({
                data: {
                    amount: parsed.amount,
                    categoryId: category.id,
                    userId,
                },
            });
        }
        else if (parsed.type === 'income') {
            record = await client_1.default.income.create({
                data: {
                    amount: parsed.amount,
                    categoryId: category.id,
                    userId,
                },
            });
        }
    }
    return res.json({
        message,
        parsed,
        record,
        actionRequired,
        senderCategoryConfirmed,
    });
});
router.post('/sender-category', async (req, res) => {
    const userId = req.user.id;
    const { sender, categoryId } = req.body;
    if (!sender || !categoryId || isNaN(Number(categoryId))) {
        return res.status(400).json({ error: 'Invalid sender or categoryId' });
    }
    const categoryIdNumber = Number(categoryId);
    const mapping = await client_1.default.senderCategory.upsert({
        where: {
            userId_sender: {
                userId,
                sender,
            },
        },
        update: {
            categoryId: categoryIdNumber,
        },
        create: {
            userId,
            sender,
            categoryId: categoryIdNumber,
        },
    });
    res.status(201).json(mapping);
});
router.get('/messages', async (req, res) => {
    const userId = req.user.id;
    const messages = await client_1.default.message.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(messages);
});
router.get('/expenses/summary', async (req, res) => {
    const userId = req.user.id;
    const results = await client_1.default.expense.groupBy({
        by: ['createdAt'],
        where: { userId },
        _sum: { amount: true },
    });
    const formatted = results.map((r) => ({
        month: r.createdAt.toISOString().slice(0, 7),
        total: r._sum.amount,
    }));
    res.json(formatted);
});
router.get('/incomes/summary', async (req, res) => {
    const userId = req.user.id;
    const rawSummary = await client_1.default.$queryRaw `
    SELECT
      DATE_TRUNC('month', "createdAt") AS month,
      SUM(amount)::float AS total
    FROM "Income"
    WHERE "userId" = ${userId}
    GROUP BY month
    ORDER BY month DESC;
  `;
    res.json(rawSummary);
});
router.get('/expenses/by-category', async (req, res) => {
    const userId = req.user.id;
    const byCategory = await client_1.default.expense.groupBy({
        by: ['categoryId'],
        where: { userId },
        _sum: { amount: true },
    });
    const categories = await client_1.default.category.findMany({ where: { userId } });
    const result = byCategory.map((row) => {
        const category = categories.find((c) => c.id === row.categoryId);
        return { category: category?.name || 'Unknown', total: row._sum.amount };
    });
    res.json(result);
});
router.get('/incomes/by-category', async (req, res) => {
    const userId = req.user.id;
    const byCategory = await client_1.default.income.groupBy({
        by: ['categoryId'],
        where: { userId },
        _sum: { amount: true },
    });
    const categories = await client_1.default.category.findMany({ where: { userId } });
    const result = byCategory.map((row) => {
        const category = categories.find((c) => c.id === row.categoryId);
        return { category: category?.name || 'Unknown', total: row._sum.amount };
    });
    res.json(result);
});
router.get('/categories', async (req, res) => {
    const userId = req.user.id;
    const categories = await client_1.default.category.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(categories);
});
router.get('/categories', async (req, res) => {
    const userId = req.user.id;
    const type = req.query.type;
    const whereClause = { userId };
    if (type) {
        whereClause.type = type.toUpperCase();
    }
    const categories = await client_1.default.category.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
    });
    res.json(categories);
});
router.put('/categories/:id', async (req, res) => {
    const userId = req.user.id;
    const categoryId = Number(req.params.id);
    const { name, keywords, type } = req.body;
    const category = await client_1.default.category.updateMany({
        where: { id: categoryId, userId },
        data: { name, keywords, type },
    });
    res.json(category);
});
router.delete('/categories/:id', async (req, res) => {
    const userId = req.user.id;
    const categoryId = Number(req.params.id);
    await client_1.default.category.deleteMany({
        where: { id: categoryId, userId },
    });
    res.status(204).send();
});
exports.default = router;
