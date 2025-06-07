const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const messages = [];

app.get('/', (req, res) => {
    res.send('✅ Expense Tracker API is running');
});

app.post('/api/parse-sms', (req, res) => {
    const { message, timestamp } = req.body;

    if (!message) {
        return res.status(400).json({ error: '❌ Missing message or timestamp' });
    }

    const irrelevantKeywords = ['تهنئكم', 'عيد', 'كل عام', 'أضحى', 'العام الهجري', 'رمضان', 'مبارك', 'بمناسبة'];
    const isIrrelevant = irrelevantKeywords.some((keyword) => message.includes(keyword));
    if (isIrrelevant) {
        return res.json({ skipped: true, reason: 'Non-transactional message' });
    }

    const isIncome = /حوالة كليك واردة|تحويل وارد|ايداع|راتب/.test(message);
    const isExpense = /حوالة كليك صادرة|شراء|دفع|خصم|اقتطاع/.test(message);

    let amount = null;

    const amountMatch = message.match(/(?:بمبلغ|قيمة|مبلغ|قيد راتب)\s*([\d.,]+)\s+دينار(?:\s+اردني)?/i);
    amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

    if (!amount) {
        return res.json({ skipped: true, reason: 'No valid amount' });
    }

    let merchant;
    const merchantMatch = message.match(/(?:من|الى)\s+(.*?)\s+الرصيد/i);
    if (merchantMatch) {
        let raw = merchantMatch[1].replace(/حسابكم\s*\d+\s*-\s*\d+/, '').trim();
        if (!raw.match(/بقيمة|بمبلغ|دينار/)) {
            merchant = raw;
        }
    }

    const isBankFee = ['عمولة', 'رسوم', 'خدمات مصرفية', 'خصم تلقائي', 'اقتطاع'].some((w) => message.includes(w));
    const isService = ['تسديد الكتروني', 'مدفوعات', 'دفع', 'خدمة'].some((w) => message.includes(w));

    if (!merchant && isBankFee) merchant = 'JIB';
    if (!merchant && isService) merchant = 'Services';

    let isoTimestamp;
    if (timestamp) {
        const parsed = new Date(timestamp);
        if (isNaN(parsed.getTime())) {
            return res.status(400).json({ error: '❌ Invalid timestamp format' });
        }
        isoTimestamp = parsed.toISOString();
    } else {
        const nowJordan = new Date().toLocaleString('en-US', { timeZone: 'Asia/Amman' });
        isoTimestamp = new Date(nowJordan).toISOString();
    }

    const parsedMessage = {
        originalMessage: message,
        timestamp: isoTimestamp,
        amount,
        merchant,
        type: isIncome ? 'income' : isExpense ? 'expense' : 'unknown',
    };

    messages.push(parsedMessage);
    res.json({ success: true, data: parsedMessage });
});

app.get('/api/messages', (req, res) => {
    res.json(messages);
});

app.get('/api/summary', (req, res) => {
    const income = messages.filter((m) => m.type === 'income').reduce((sum, m) => sum + m.amount, 0);

    const expense = messages.filter((m) => m.type === 'expense').reduce((sum, m) => sum + m.amount, 0);

    res.json({
        income,
        expense,
        balance: income - expense,
    });
});

const path = require('path');

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
