import { ParsedMessage } from '../models/message';
import { getISOTimestamp } from '../utils/time';

const CATEGORY_MAP: Record<string, string> = {
  عمولة: 'Bank Fee',
  رسوم:   'Bank Fee',
  'خدمات مصرفية': 'Bank Fee',
  سوق:    'Groceries',
  بقالة:  'Groceries',
  كهرباء:'Utilities',
  مياه:   'Utilities',
  وقود:   'Transport',
  بنزين:  'Transport',
  مطعم:   'Dining',
  كافيه:  'Dining',
};

export function parseMessage(
  message: string,
  timestamp?: string
): ParsedMessage | null {
  // 1) Drop pure notifications
  const irrelevant = ['تهنئكم', 'عيد', 'كل عام'];
  if (irrelevant.some((kw) => message.includes(kw))) return null;

  // 2) Determine credit vs debit
  const isCredit = /حوالة كليك واردة|ايداع|راتب/.test(message);
  const isDebit  = /حوالة كليك صادرة|تفويض حركة|تسديد الكتروني|حركة قسط|قيد مبلغ|خصم|اقتطاع/.test(message);

  // 3) Extract amount: salary vs other
  let amountMatch;
  if (/قيد\s*راتب/.test(message)) {
    // Salary credit: after 'قيد راتب'
    amountMatch = message.match(/قيد\s*راتب\s*([\d.,]+)/);
  } else {
    // Expense or other: match 'قيد مبلغ', 'بقيمة', or 'بمبلغ'
    amountMatch = message.match(/(?:قيد مبلغ|بقيمة|بمبلغ)\s*([\d.,]+)\s+دينار/);
  }
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

  // 4) Extract merchant/counterparty
  let merchant: string | undefined;
  if (/تفويض حركة/.test(message)) {
    const m = message.match(/من\s+(.+?)\s+(?:AMMAN|الرصيد)/);
    if (m && typeof m[1] === 'string') merchant = m[1].trim();
  } else if (/حوالة كليك واردة/.test(message)) {
    const m = message.match(/من\s+(.+?)\s+الرصيد/);
    if (m && typeof m[1] === 'string') merchant = m[1].trim();
  } else if (/حوالة كليك صادرة/.test(message)) {
    const m = message.match(/الى\s+(.+?)\s+الرصيد/);
    if (m && typeof m[1] === 'string') merchant = m[1].trim();
  } else if (/عمولة|قيد مبلغ/.test(message)) {
    merchant = 'Bank Fee';
  } else if (/حركة قسط شهري/.test(message)) {
    merchant = 'Installment';
  } else if (/تسديد الكتروني/.test(message)) {
    merchant = 'Electronic Payment';
  }

  // 5) Determine category
  let category = 'Other';
  if (merchant) {
    for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
      if (merchant.includes(kw)) {
        category = cat;
        break;
      }
    }
    if (category === 'Other') category = merchant;
  } else if (isDebit) {
    category = 'Uncategorized Expense';
  } else if (isCredit) {
    category = 'Uncategorized Income';
  }

  // 6) Map to ParsedMessage.type ('income' | 'expense' | 'unknown')
  let type: ParsedMessage['type'] = 'unknown';
  if (isCredit) type = 'income';
  else if (isDebit) type = 'expense';

  return {
    originalMessage: message,
    timestamp: getISOTimestamp(timestamp),
    amount,
    merchant,
    category,
    type,
  };
}
