"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMessage = parseMessage;
const time_1 = require("../utils/time");
const KEYWORD_MAP = {
    عمولة: 'Bank Fee',
    رسوم: 'Bank Fee',
    'خدمات مصرفية': 'Bank Fee',
    سوق: 'Groceries',
    بقالة: 'Groceries',
    كهرباء: 'Utilities',
    مياه: 'Utilities',
    وقود: 'Transport',
    بنزين: 'Transport',
    مطعم: 'Dining',
    كافيه: 'Dining',
    'حركة قسط شهري': 'Installment',
    راتب: 'Salary',
    ايداع: 'Salary',
    'حوالة كليك واردة': 'Salary',
};
function parseMessage(message, timestamp) {
    const skip = ['تهنئكم', 'عيد', 'كل عام'];
    if (skip.some((kw) => message.includes(kw)))
        return null;
    const isCredit = /حوالة كليك واردة|ايداع|راتب/.test(message);
    const isDebit = /حوالة كليك صادرة|تفويض حركة|تسديد الكتروني|حركة قسط|قيد مبلغ|خصم|اقتطاع/.test(message);
    let type = isCredit ? 'income' : isDebit ? 'expense' : 'unknown';
    const amtRegex = /(?:قيد\s*راتب|قيد مبلغ|بقيمة|بمبلغ)\s*([\d.,]+)\s+دينار/;
    const matchAmt = message.match(amtRegex);
    if (!matchAmt)
        return null;
    const amount = parseFloat(matchAmt[1].replace(/,/g, ''));
    let merchant;
    const fromMatch = message.match(/من\s+(.+?)\s+(?:AMMAN|الرصيد)/);
    const toMatch = message.match(/الى\s+(.+?)\s+الرصيد/);
    if (fromMatch)
        merchant = fromMatch[1].trim();
    else if (toMatch)
        merchant = toMatch[1].trim();
    let keyword;
    for (const [kw, categoryName] of Object.entries(KEYWORD_MAP)) {
        if (message.includes(kw)) {
            keyword = categoryName;
            break;
        }
    }
    if (!keyword) {
        keyword = type === 'income' ? 'راتب' : type === 'expense' ? 'Other' : undefined;
    }
    const source = message.includes('كليك') ? 'CliQ' : undefined;
    return {
        originalMessage: message,
        timestamp: (0, time_1.getISOTimestamp)(timestamp),
        amount,
        merchant,
        category: keyword,
        type,
        source,
    };
}
