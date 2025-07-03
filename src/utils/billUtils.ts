import type { BillFrequency } from '@prisma/client';

export interface BillValidationData {
  name: string;
  payee: string;
  amount?: number;
  isFixedAmount: boolean;
  dueDate: string | Date;
  frequency: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  reminderDays: number[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Calculate the next due date for a bill based on its frequency
 */
export function calculateNextDueDate(
  baseDueDate: Date,
  frequency: BillFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const now = new Date();
  let nextDue = new Date(baseDueDate);

  switch (frequency) {
    case 'WEEKLY':
      // Find next occurrence of the specified day of week
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const currentDayOfWeek = nextDue.getDay() === 0 ? 7 : nextDue.getDay(); // Convert Sunday from 0 to 7
        const daysUntilTarget = (dayOfWeek - currentDayOfWeek + 7) % 7;
        nextDue.setDate(nextDue.getDate() + daysUntilTarget);
      }
      
      // If the calculated date is in the past, move to next week
      while (nextDue <= now) {
        nextDue.setDate(nextDue.getDate() + 7);
      }
      break;

    case 'MONTHLY':
      // Set to the specified day of month
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDue.setDate(dayOfMonth);
      }
      
      // If the date is in the past, move to next month
      while (nextDue <= now) {
        nextDue.setMonth(nextDue.getMonth() + 1);
        // Handle edge case where day doesn't exist in the next month
        if (dayOfMonth !== null && dayOfMonth !== undefined) {
          const lastDayOfMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
          nextDue.setDate(Math.min(dayOfMonth, lastDayOfMonth));
        }
      }
      break;

    case 'QUARTERLY':
      // Move 3 months ahead
      while (nextDue <= now) {
        nextDue.setMonth(nextDue.getMonth() + 3);
        if (dayOfMonth !== null && dayOfMonth !== undefined) {
          const lastDayOfMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
          nextDue.setDate(Math.min(dayOfMonth, lastDayOfMonth));
        }
      }
      break;

    case 'YEARLY':
      // Move 1 year ahead
      while (nextDue <= now) {
        nextDue.setFullYear(nextDue.getFullYear() + 1);
      }
      break;

    case 'CUSTOM':
      // For custom frequency, use the base due date as is
      // The user will need to manually update this
      if (nextDue <= now) {
        nextDue.setDate(nextDue.getDate() + 30); // Default to 30 days
      }
      break;

    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }

  return nextDue;
}

/**
 * Calculate how many days overdue a bill is
 */
export function calculateOverdueDays(dueDate: Date, currentDate: Date = new Date()): number {
  const due = new Date(dueDate);
  const current = new Date(currentDate);
  
  // Reset time parts to compare just dates
  due.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  
  const diffTime = current.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if a frequency is valid
 */
export function isValidFrequency(frequency: string): frequency is BillFrequency {
  const validFrequencies = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'];
  return validFrequencies.includes(frequency);
}

/**
 * Validate bill data
 */
export function validateBillData(data: BillValidationData): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.name?.trim()) {
    errors.push('Bill name is required');
  }

  if (!data.payee?.trim()) {
    errors.push('Payee is required');
  }

  if (!data.dueDate) {
    errors.push('Due date is required');
  }

  if (!data.frequency) {
    errors.push('Frequency is required');
  }

  // Validate frequency
  if (data.frequency && !isValidFrequency(data.frequency)) {
    errors.push('Invalid frequency. Must be WEEKLY, MONTHLY, QUARTERLY, YEARLY, or CUSTOM');
  }

  // Validate amount for fixed bills
  if (data.isFixedAmount && (!data.amount || data.amount <= 0)) {
    errors.push('Amount is required for fixed-amount bills and must be greater than 0');
  }

  // Validate day of month for monthly/quarterly/yearly bills
  if (['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(data.frequency)) {
    if (data.dayOfMonth !== undefined && data.dayOfMonth !== null) {
      if (data.dayOfMonth < 1 || data.dayOfMonth > 31) {
        errors.push('Day of month must be between 1 and 31');
      }
    }
  }

  // Validate day of week for weekly bills
  if (data.frequency === 'WEEKLY') {
    if (data.dayOfWeek !== undefined && data.dayOfWeek !== null) {
      if (data.dayOfWeek < 1 || data.dayOfWeek > 7) {
        errors.push('Day of week must be between 1 (Monday) and 7 (Sunday)');
      }
    }
  }

  // Validate due date
  if (data.dueDate) {
    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date format');
    }
  }

  // Validate reminder days
  if (data.reminderDays && Array.isArray(data.reminderDays)) {
    for (const day of data.reminderDays) {
      if (typeof day !== 'number' || day < 0 || day > 365) {
        errors.push('Reminder days must be numbers between 0 and 365');
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get human-readable frequency text
 */
export function getFrequencyText(frequency: BillFrequency): string {
  switch (frequency) {
    case 'WEEKLY':
      return 'Weekly';
    case 'MONTHLY':
      return 'Monthly';
    case 'QUARTERLY':
      return 'Quarterly';
    case 'YEARLY':
      return 'Yearly';
    case 'CUSTOM':
      return 'Custom';
    default:
      return frequency;
  }
}

/**
 * Get days until due date
 */
export function getDaysUntilDue(dueDate: Date): number {
  const now = new Date();
  const due = new Date(dueDate);
  
  // Reset time parts to compare just dates
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if a bill is due today
 */
export function isBillDueToday(dueDate: Date): boolean {
  return getDaysUntilDue(dueDate) === 0;
}

/**
 * Check if a bill is overdue
 */
export function isBillOverdue(dueDate: Date): boolean {
  return getDaysUntilDue(dueDate) < 0;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'JOD'): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Get bill status text
 */
export function getBillStatusText(bill: { nextDueDate: Date; isOverdue: boolean; overdueByDays: number }): string {
  if (bill.isOverdue) {
    return `Overdue by ${bill.overdueByDays} day${bill.overdueByDays > 1 ? 's' : ''}`;
  }
  
  const daysUntil = getDaysUntilDue(bill.nextDueDate);
  
  if (daysUntil === 0) {
    return 'Due today';
  } else if (daysUntil === 1) {
    return 'Due tomorrow';
  } else if (daysUntil > 0) {
    return `Due in ${daysUntil} days`;
  } else {
    return 'Overdue';
  }
}
