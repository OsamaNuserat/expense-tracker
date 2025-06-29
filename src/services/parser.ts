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
    { pattern: /\b(بقيمة|بمبلغ|قيمة|مبلغ)\b/gi, replacement: '' },
    { pattern: /\s+/g, replacement: ' ' },
    { pattern: /[^a-zA-Z\u0600-\u06FF\s]/g, replacement: '' },
];

// Enhanced CLIQ detection patterns
const CLIQ_PATTERNS = {
    incoming: [
        /حوالة\s*كليق\s*واردة/i,
        /حوالة\s*كليك\s*واردة/i,
        /CLIQ.*received?/i,
        /تم\s*استلام.*كليق/i,
        /استلمت.*عبر\s*كليق/i
    ],
    outgoing: [
        /حوالة\s*كليق\s*صادرة/i,
        /حوالة\s*كليك\s*صادرة/i,
        /CLIQ.*sent/i,
        /تم\s*ارسال.*كليق/i,
        /أرسلت.*عبر\s*كليق/i
    ]
};

// Enhanced amount detection patterns
const AMOUNT_PATTERNS = [
    /(?:قيد\s*راتب|قيد مبلغ|بقيمة|بمبلغ|قيمة|مبلغ)\s*([\d.,]+)\s*دينار/i,
    /(?:amount|value)\s*:?\s*([\d.,]+)\s*JOD/i,
    /([\d.,]+)\s*JOD/i,
    /([\d.,]+)\s*دينار/i
];

// Enhanced merchant/sender extraction patterns
const MERCHANT_PATTERNS = [
    /(?:من|الى|to|from)\s+([^0-9]+?)\s*(?:بقيمة|بمبلغ|قيمة|مبلغ|[\d.,]+\s*(?:دينار|JOD)|AMMAN|الرصيد|في|at|$)/i,
    /(?:sender|receiver)\s*:?\s*([^0-9]+?)\s*(?:[\d.,]+|$)/i,
    /(?:المرسل|المستلم)\s*:?\s*([^0-9]+?)\s*(?:[\d.,]+|$)/i
];

export function parseMessage(message: string, timestamp?: string): ParsedMessage | null {
    // Skip promotional/greeting messages
    const skipKeywords = ['تهنئكم', 'عيد', 'كل عام', 'أسرة', 'بخير', 'congratulations', 'holiday'];
    if (skipKeywords.some(kw => message.toLowerCase().includes(kw.toLowerCase()))) return null;

    // Detect CLIQ transactions
    const isCliqIncoming = CLIQ_PATTERNS.incoming.some(pattern => pattern.test(message));
    const isCliqOutgoing = CLIQ_PATTERNS.outgoing.some(pattern => pattern.test(message));
    
    let isCredit = isCliqIncoming || /ايداع|راتب|قيد راتب|حوالة واردة|received|deposit/i.test(message);
    let isDebit = isCliqOutgoing || /تفويض حركة|تسديد الكتروني|حركة قسط|قيد مبلغ|خصم|اقتطاع|حوالة صادرة|sent|payment/i.test(message);
    
    const type: ParsedMessage['type'] = isCredit ? 'income' : isDebit ? 'expense' : 'unknown';
    
    // Determine source
    const source = (isCliqIncoming || isCliqOutgoing) ? 'CliQ' : 'SMS';

    // Extract amount using multiple patterns
    let amount: number | null = null;
    for (const pattern of AMOUNT_PATTERNS) {
        const match = message.match(pattern);
        if (match) {
            amount = parseFloat(match[1].replace(/,/g, ''));
            break;
        }
    }

    if (!amount) return null;

    // Extract merchant/sender using multiple patterns
    let merchant: string | null = null;
    for (const pattern of MERCHANT_PATTERNS) {
        const match = message.match(pattern);
        if (match) {
            merchant = match[1].trim();
            break;
        }
    }

    // Clean up merchant name if found
    if (merchant) {
        for (const { pattern, replacement } of MERCHANT_CLEANUP) {
            merchant = merchant.replace(pattern, replacement);
        }
        merchant = merchant.trim();
        
        // Remove common Arabic articles and prepositions
        merchant = merchant.replace(/^(ال|من|الى|في)\s+/i, '');
        
        // Clean up multiple spaces
        merchant = merchant.replace(/\s+/g, ' ').trim();
    }

    // Determine category using enhanced logic
    let category: string | null = null;
    
    // First, try CLIQ-specific categorization
    if (source === 'CliQ' && merchant) {
        // Check if it looks like a business name
        if (/company|corp|ltd|llc|inc|شركة|مؤسسة|معهد|bank|مصرف|بنك|store|shop|متجر|محل/i.test(merchant)) {
            category = type === 'income' ? 'Business Income' : 'Business Payment';
        } else if (/salary|راتب|payroll/i.test(message)) {
            category = 'Salary';
        } else {
            category = type === 'income' ? 'Personal Transfer' : 'Personal Payment';
        }
    }

    // If no CLIQ-specific category, use existing keyword mapping
    if (!category && merchant) {
        const merchantKey = merchant.split(/\s+/)[0];
        if (KEYWORD_MAP[merchantKey]) {
            category = KEYWORD_MAP[merchantKey];
        }
    }
    
    // Fall back to message content keyword matching
    if (!category) {
        for (const [kw, cat] of Object.entries(KEYWORD_MAP)) {
            if (message.includes(kw)) {
                category = cat;
                break;
            }
        }
    }
    
    // Default categories
    if (!category) {
        if (source === 'CliQ') {
            category = type === 'income' ? 'CLIQ Income' : 'CLIQ Payment';
        } else {
            category = type === 'income' ? 'Other Income' : 'Other Expense';
        }
    }

    return {
        originalMessage: message,
        timestamp: timestamp || getISOTimestamp(),
        amount,
        merchant,
        category,
        type,
        source
    };
}

/**
 * Enhanced CLIQ-specific parsing for more detailed information
 */
export function parseCliqMessage(message: string): {
    senderName?: string;
    receiverName?: string;
    amount?: number;
    currency?: string;
    timestamp?: string;
    reference?: string;
    isRecurring?: boolean;
} | null {
    // Enhanced CLIQ parsing for additional metadata
    const cliqData: any = {};

    // Extract reference number
    const refMatch = message.match(/(?:ref|reference|مرجع)\s*:?\s*([A-Z0-9]+)/i);
    if (refMatch) {
        cliqData.reference = refMatch[1];
    }

    // Extract timestamp from message
    const timeMatch = message.match(/(?:at|في)\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/);
    if (timeMatch) {
        cliqData.timestamp = timeMatch[1];
    }

    // Detect recurring patterns
    const recurringKeywords = ['monthly', 'weekly', 'recurring', 'شهري', 'أسبوعي', 'متكرر'];
    cliqData.isRecurring = recurringKeywords.some(keyword => 
        message.toLowerCase().includes(keyword.toLowerCase())
    );

    // Extract currency
    const currencyMatch = message.match(/(JOD|USD|EUR|دينار|دولار)/i);
    if (currencyMatch) {
        cliqData.currency = currencyMatch[1];
    }

    return Object.keys(cliqData).length > 0 ? cliqData : null;
}

/**
 * Validate and clean merchant names for consistency
 */
export function normalizeMerchantName(merchant: string): string {
    if (!merchant) return '';
    
    return merchant
        .toLowerCase()
        .replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '') // Keep only letters and Arabic
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Detect if a transaction appears to be business-related
 */
export function isBusinessTransaction(merchant: string, amount: number, message: string): boolean {
    if (!merchant) return false;
    
    const businessIndicators = [
        // Common business keywords
        /company|corp|corporation|ltd|llc|inc|شركة|مؤسسة|معهد/i,
        /bank|مصرف|بنك|financial|مالي/i,
        /store|shop|market|متجر|محل|سوق/i,
        /restaurant|مطعم|cafe|كافيه/i,
        /hospital|مستشفى|clinic|عيادة/i,
        /university|جامعة|school|مدرسة/i,
        
        // Service providers
        /telecom|اتصالات|internet|انترنت/i,
        /electric|كهرباء|water|مياه|gas|غاز/i,
        /insurance|تأمين|medical|طبي/i
    ];

    // Check merchant name
    const merchantLower = merchant.toLowerCase();
    if (businessIndicators.some(pattern => pattern.test(merchantLower))) {
        return true;
    }

    // Check amount patterns (business transactions often have round numbers)
    if (amount >= 100 && amount % 10 === 0) {
        return true;
    }

    // Check message content
    const messageLower = message.toLowerCase();
    const businessTerms = ['invoice', 'bill', 'payment', 'service', 'فاتورة', 'خدمة', 'دفع'];
    if (businessTerms.some(term => messageLower.includes(term))) {
        return true;
    }

    return false;
}