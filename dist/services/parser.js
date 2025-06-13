"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMessage = parseMessage;
const time_1 = require("../utils/time");
function parseMessage(message, timestamp) {
    const irrelevantKeywords = ['تهنئكم', 'عيد', 'كل عام', 'أضحى', 'العام الهجري', 'رمضان', 'مبارك', 'بمناسبة'];
    const isIrrelevant = irrelevantKeywords.some((keyword) => message.includes(keyword));
    if (isIrrelevant)
        return null;
    const isIncome = /حوالة كليك واردة|تحويل وارد|ايداع|راتب/.test(message);
    const isExpense = /حوالة كليك صادرة|شراء|دفع|خصم|اقتطاع/.test(message);
    const amountMatch = message.match(/(?:بمبلغ|قيمة|مبلغ|قيد راتب)\s*([\d.,]+)\s+دينار(?:\s+اردني)?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;
    if (!amount)
        return null;
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
    if (!merchant && isBankFee)
        merchant = 'JIB';
    if (!merchant && isService)
        merchant = 'Services';
    return {
        originalMessage: message,
        timestamp: (0, time_1.getISOTimestamp)(timestamp),
        amount,
        merchant,
        type: isIncome ? 'income' : isExpense ? 'expense' : 'unknown',
    };
}
