// src/services/parser.ts

import { ParsedMessage } from '../models/message';
import { getISOTimestamp } from '../utils/time';

export function parseMessage(message: string, timestamp?: string): ParsedMessage | null {
    const irrelevantKeywords = ['تهنئكم', 'عيد', 'كل عام', 'أضحى', 'العام الهجري', 'رمضان', 'مبارك', 'بمناسبة'];
    if (irrelevantKeywords.some((kw) => message.includes(kw))) return null;

    const isIncome = /حوالة كليك واردة|تحويل وارد|ايداع|راتب/.test(message);
    const isExpense = /حوالة كليك صادرة|شراء|دفع|خصم|اقتطاع|عمولة|رسوم|خدمات مصرفية/.test(message);

    const amountMatch = message.match(/(?:بمبلغ|قيمة|مبلغ|قيد راتب)\s*([\d.,]+)\s+دينار(?:\s+اردني)?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;
    if (amount === null) return null;

    let merchant: string | undefined;
    const merchantMatch = message.match(/(?:من|الى)\s+(.*?)\s+الرصيد/i);
    if (merchantMatch) {
        let raw = merchantMatch[1].replace(/حسابكم\s*\d+\s*-\s*\d+/, '').trim();
        if (!/بقيمة|بمبلغ|دينار/.test(raw)) merchant = raw;
    }

    const isBankFee = ['عمولة', 'رسوم', 'خدمات مصرفية', 'خصم تلقائي', 'اقتطاع'].some((w) => message.includes(w));
    const isService = ['تسديد الكتروني', 'مدفوعات', 'دفع', 'خدمة'].some((w) => message.includes(w));

    if (!merchant && isBankFee) merchant = 'JIB';
    if (!merchant && isService) merchant = 'Services';

    return {
        originalMessage: message,
        timestamp: getISOTimestamp(timestamp),
        amount,
        merchant,
        type: isIncome ? 'income' : isExpense ? 'expense' : 'unknown',
    };
}
