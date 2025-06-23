import { ParsedMessage } from '../models/message';
import { getISOTimestamp } from '../utils/time';

const KEYWORD_MAP: Record<string, string> = {
    // Bank fees
    'عمولة': 'Bank Fee',
    'رسوم': 'Bank Fee',
    'خدمات مصرفية': 'Bank Fee',
    'اليه': 'Bank Fee',  
    
    // Shopping
    'سوق': 'Groceries',
    'بقالة': 'Groceries',
    'تسوق': 'Shopping',
    'TASHKEEL': 'Office Supplies',  
    
    // Utilities
    'كهرباء': 'Utilities',
    'مياه': 'Utilities',
    
    // Transportation
    'وقود': 'Transport',
    'بنزين': 'Transport',
    'نقل': 'Transport',
    'GULF': 'Transport',
    'ALHARAMAIN': 'Transport',
    
    // Food
    'مطعم': 'Dining',
    'مطاعم': 'Dining',
    'كافيه': 'Dining',
    'طعام': 'Dining',
    
    // Payments
    'قسط': 'Installment',
    'تسديد': 'Payment',
    'دفع': 'Payment',
    
    // Income
    'راتب': 'Salary',
    'ايداع': 'Deposit',
    'حوالة واردة': 'Transfer',
    'قيد راتب': 'Salary',
    
    'حوالة صادرة': 'Transfer',
};

const MERCHANT_CLEANUP = [
    { pattern: /AMMAN\s*JO$/i, replacement: '' },
    { pattern: /الاردن$/i, replacement: '' },
    { pattern: /\b(JOD|دينار)\b/gi, replacement: '' },
    { pattern: /\s+/g, replacement: ' ' },
    { pattern: /[^a-zA-Z\u0600-\u06FF\s]/g, replacement: '' },
];

export function parseMessage(message: string, timestamp?: string): ParsedMessage | null {

    const skipKeywords = ['تهنئكم', 'عيد', 'كل عام', 'أسرة', 'بخير'];
    if (skipKeywords.some(kw => message.includes(kw))) return null;

    const isCredit = /حوالة كليك واردة|ايداع|راتب|قيد راتب|حوالة واردة/.test(message);
    const isDebit = /حوالة كليك صادرة|تفويض حركة|تسديد الكتروني|حركة قسط|قيد مبلغ|خصم|اقتطاع|حوالة صادرة/.test(message);
    const type: ParsedMessage['type'] = isCredit ? 'income' : isDebit ? 'expense' : 'unknown';

    const amtRegex = /(?:قيد\s*راتب|قيد مبلغ|بقيمة|بمبلغ|قيمة|مبلغ)\s*([\d.,]+)\s+دينار/;
    const matchAmt = message.match(amtRegex);
    if (!matchAmt) return null;
    const amount = parseFloat(matchAmt[1].replace(/,/g, ''));

    let merchant: string | null = null;
    const fromMatch = message.match(/(?:من|الى)\s+([^0-9]+?)\s*(?:[\d.,]+\s*دينار|AMMAN|الرصيد|$)/);
    if (fromMatch) {
        merchant = fromMatch[1].trim();
        
        for (const { pattern, replacement } of MERCHANT_CLEANUP) {
            merchant = merchant.replace(pattern, replacement);
        }
        merchant = merchant.trim();
    }

    let category: string | null = null;
    
    if (merchant) {
        const merchantKey = merchant.split(/\s+/)[0];
        if (KEYWORD_MAP[merchantKey]) {
            category = KEYWORD_MAP[merchantKey];
        }
    }
    
    if (!category) {
        for (const [kw, cat] of Object.entries(KEYWORD_MAP)) {
            if (message.includes(kw)) {
                category = cat;
                break;
            }
        }
    }
    
    if (!category) {
        category = type === 'income' ? 'Salary' : 
                   type === 'expense' ? 'Other' : 
                   'Uncategorized';
    }

    const source = /كليك/.test(message) ? 'CliQ' : null;

    return {
        originalMessage: message,
        timestamp: getISOTimestamp(timestamp),
        amount,
        merchant,
        category, 
        type,
        source, 
    };
}