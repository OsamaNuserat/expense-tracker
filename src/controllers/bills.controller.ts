import type { Request, Response } from 'express';
import prisma from '../prisma/client';
import createError from 'http-errors';
import { 
  sendBillReminder,
  sendBillOverdueAlert,
  scheduleNextBillReminders
} from '../utils/billNotifications';
import {
  calculateNextDueDate,
  calculateOverdueDays,
  isValidFrequency,
  validateBillData,
  formatCurrency,
  getDaysUntilDue,
  getFrequencyText
} from '../utils/billUtils';

/**
 * Helper function to validate and parse bill ID
 */
const validateBillId = (id: string): number => {
  if (!id) {
    throw createError(400, 'Bill ID is required');
  }
  
  // Additional check for common problematic values
  if (id === 'undefined' || id === 'null' || id === '') {
    throw createError(400, 'Invalid bill ID: received invalid value');
  }
  
  const billId = parseInt(id);
  if (isNaN(billId) || billId <= 0) {
    throw createError(400, `Invalid bill ID format. Must be a positive number, received: "${id}"`);
  }
  
  return billId;
};

/**
 * Get all bills for the authenticated user
 */
export const getBills = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { 
    isActive = 'true',
    isOverdue,
    upcoming,
    limit,
    offset = 0
  } = req.query;

  const where: any = { userId };

  if (isActive !== 'all') {
    where.isActive = isActive === 'true';
  }

  if (isOverdue === 'true') {
    where.isOverdue = true;
  }

  if (upcoming === 'true') {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    where.nextDueDate = {
      gte: now,
      lte: nextWeek
    };
  }

  const bills = await prisma.bill.findMany({
    where,
    include: {
      category: true,
      paymentHistory: {
        orderBy: { paidDate: 'desc' },
        take: 5
      },
      _count: {
        select: {
          paymentHistory: true,
          reminders: true
        }
      }
    },
    orderBy: { nextDueDate: 'asc' },
    ...(limit && { take: parseInt(limit as string) }),
    skip: parseInt(offset as string)
  });

  const totalCount = await prisma.bill.count({ where });

  res.json({
    bills,
    pagination: {
      total: totalCount,
      limit: limit ? parseInt(limit as string) : null,
      offset: parseInt(offset as string),
      hasMore: limit ? (parseInt(offset as string) + parseInt(limit as string)) < totalCount : false
    }
  });
};

/**
 * Get a specific bill by ID
 */
export const getBillById = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const billId = validateBillId(id);

  const bill = await prisma.bill.findFirst({
    where: { 
      id: billId,
      userId 
    },
    include: {
      category: true,
      paymentHistory: {
        orderBy: { paidDate: 'desc' }
      },
      reminders: {
        orderBy: { reminderDate: 'desc' },
        take: 10
      }
    }
  });

  if (!bill) {
    throw createError(404, 'Bill not found');
  }

  res.json(bill);
};

/**
 * Create a new bill
 */
export const createBill = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const {
    name,
    description,
    payee,
    amount,
    isFixedAmount = true,
    categoryId,
    dueDate,
    frequency,
    dayOfMonth,
    dayOfWeek,
    autoReminder = true,
    reminderDays = [7, 3, 1]
  } = req.body;

  // Validate required fields
  if (!name || !payee || !dueDate || !frequency) {
    throw createError(400, 'Name, payee, due date, and frequency are required');
  }

  // Validate bill data
  const validationResult = validateBillData({
    name,
    payee,
    amount,
    isFixedAmount,
    dueDate,
    frequency,
    dayOfMonth,
    dayOfWeek,
    reminderDays
  });

  if (!validationResult.isValid) {
    throw createError(400, validationResult.errors.join(', '));
  }

  // Verify category belongs to user if provided
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId }
    });
    if (!category) {
      throw createError(400, 'Invalid category');
    }
  }

  // Calculate next due date
  const nextDueDate = calculateNextDueDate(new Date(dueDate), frequency, dayOfMonth, dayOfWeek);

  const bill = await prisma.bill.create({
    data: {
      userId,
      name,
      description,
      payee,
      amount: isFixedAmount ? amount : null,
      isFixedAmount,
      categoryId,
      dueDate: new Date(dueDate),
      frequency,
      dayOfMonth,
      dayOfWeek,
      autoReminder,
      reminderDays,
      nextDueDate
    },
    include: {
      category: true
    }
  });

  // Schedule reminders for this bill
  if (autoReminder) {
    await scheduleNextBillReminders(bill.id);
  }

  res.status(201).json(bill);
};

/**
 * Update a bill
 */
export const updateBill = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const updateData = req.body;

  const billId = validateBillId(id);

  // Check if bill exists and belongs to user
  const existingBill = await prisma.bill.findFirst({
    where: { id: billId, userId }
  });

  if (!existingBill) {
    throw createError(404, 'Bill not found');
  }

  // Validate update data if provided
  if (updateData.frequency || updateData.dueDate || updateData.dayOfMonth || updateData.dayOfWeek) {
    const validationResult = validateBillData({
      ...existingBill,
      ...updateData
    });

    if (!validationResult.isValid) {
      throw createError(400, validationResult.errors.join(', '));
    }
  }

  // Verify category belongs to user if provided
  if (updateData.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: updateData.categoryId, userId }
    });
    if (!category) {
      throw createError(400, 'Invalid category');
    }
  }

  // Calculate new next due date if schedule changed
  let nextDueDate = existingBill.nextDueDate;
  if (updateData.dueDate || updateData.frequency || updateData.dayOfMonth || updateData.dayOfWeek) {
    const baseDueDate = updateData.dueDate ? new Date(updateData.dueDate) : existingBill.dueDate;
    nextDueDate = calculateNextDueDate(
      baseDueDate,
      updateData.frequency || existingBill.frequency,
      updateData.dayOfMonth ?? existingBill.dayOfMonth,
      updateData.dayOfWeek ?? existingBill.dayOfWeek
    );
  }

  const bill = await prisma.bill.update({
    where: { id: billId },
    data: {
      ...updateData,
      nextDueDate,
      ...(updateData.isFixedAmount === false && { amount: null })
    },
    include: {
      category: true
    }
  });

  // Reschedule reminders if reminder settings changed
  if (updateData.autoReminder !== undefined || updateData.reminderDays) {
    await scheduleNextBillReminders(bill.id);
  }

  res.json(bill);
};

/**
 * Delete a bill
 */
export const deleteBill = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const billId = validateBillId(id);

  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId }
  });

  if (!bill) {
    throw createError(404, 'Bill not found');
  }

  await prisma.bill.delete({
    where: { id: billId }
  });

  res.json({ message: 'Bill deleted successfully' });
};

/**
 * Mark a bill as paid
 */
export const markBillAsPaid = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const {
    amount,
    paidDate = new Date(),
    paymentMethod,
    confirmationCode,
    notes
  } = req.body;

  const billId = validateBillId(id);

  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId }
  });

  if (!bill) {
    throw createError(404, 'Bill not found');
  }

  if (!amount) {
    throw createError(400, 'Payment amount is required');
  }

  const paidDateTime = new Date(paidDate);
  const daysLate = calculateOverdueDays(bill.nextDueDate, paidDateTime);
  const wasOnTime = daysLate <= 0;

  // Create payment record
  await prisma.billPayment.create({
    data: {
      billId: billId,
      amount,
      paidDate: paidDateTime,
      wasOnTime,
      daysLate: Math.max(0, daysLate),
      paymentMethod,
      confirmationCode,
      notes
    }
  });

  // Calculate next due date
  const nextDueDate = calculateNextDueDate(
    bill.dueDate,
    bill.frequency,
    bill.dayOfMonth,
    bill.dayOfWeek
  );

  // Update bill
  const updatedBill = await prisma.bill.update({
    where: { id: billId },
    data: {
      lastPaidDate: paidDateTime,
      lastPaidAmount: amount,
      nextDueDate,
      isOverdue: false,
      overdueByDays: 0
    },
    include: {
      category: true,
      paymentHistory: {
        orderBy: { paidDate: 'desc' },
        take: 5
      }
    }
  });

  // Schedule next reminders
  if (bill.autoReminder) {
    await scheduleNextBillReminders(bill.id);
  }

  res.json({
    message: 'Bill marked as paid successfully',
    bill: updatedBill,
    payment: {
      amount,
      paidDate: paidDateTime,
      wasOnTime,
      daysLate: Math.max(0, daysLate)
    }
  });
};

/**
 * Get bill payment history
 */
export const getBillPayments = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const billId = validateBillId(id);

  // Verify bill belongs to user
  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId }
  });

  if (!bill) {
    throw createError(404, 'Bill not found');
  }

  const payments = await prisma.billPayment.findMany({
    where: { billId: billId },
    orderBy: { paidDate: 'desc' },
    take: parseInt(limit as string),
    skip: parseInt(offset as string)
  });

  const totalCount = await prisma.billPayment.count({
    where: { billId: billId }
  });

  res.json({
    payments,
    pagination: {
      total: totalCount,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      hasMore: (parseInt(offset as string) + parseInt(limit as string)) < totalCount
    }
  });
};

/**
 * Get upcoming bills (next 30 days)
 */
export const getUpcomingBills = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { days = 30 } = req.query;

  const now = new Date();
  const futureDate = new Date(now.getTime() + parseInt(days as string) * 24 * 60 * 60 * 1000);

  const bills = await prisma.bill.findMany({
    where: {
      userId,
      isActive: true,
      nextDueDate: {
        gte: now,
        lte: futureDate
      }
    },
    include: {
      category: true
    },
    orderBy: { nextDueDate: 'asc' }
  });

  res.json(bills);
};

/**
 * Get overdue bills
 */
export const getOverdueBills = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const bills = await prisma.bill.findMany({
    where: {
      userId,
      isActive: true,
      isOverdue: true
    },
    include: {
      category: true
    },
    orderBy: { overdueByDays: 'desc' }
  });

  res.json(bills);
};

/**
 * Send manual reminder for a bill
 */
export const sendManualReminder = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const billId = validateBillId(id);

  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId }
  });

  if (!bill) {
    throw createError(404, 'Bill not found');
  }

  const success = await sendBillReminder(bill);

  res.json({
    success,
    message: success 
      ? 'Reminder sent successfully' 
      : 'Failed to send reminder'
  });
};

/**
 * Get bills calendar data (upcoming bills in calendar format)
 */
export const getBillsCalendar = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { 
    startDate, 
    endDate, 
    view = 'month' 
  } = req.query;

  if (!startDate || !endDate) {
    throw createError(400, 'startDate and endDate are required');
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  const bills = await prisma.bill.findMany({
    where: {
      userId,
      isActive: true,
      nextDueDate: {
        gte: start,
        lte: end
      }
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    },
    orderBy: {
      nextDueDate: 'asc'
    }
  });

  // Format bills for calendar display
  const calendarEvents = bills.map(bill => ({
    id: bill.id,
    title: bill.name,
    start: bill.nextDueDate.toISOString(),
    end: bill.nextDueDate.toISOString(),
    allDay: false,
    description: `Pay ${bill.payee}${bill.amount ? ` - ${formatCurrency(bill.amount)}` : ''}`,
    extendedProps: {
      billId: bill.id,
      payee: bill.payee,
      amount: bill.amount,
      isFixedAmount: bill.isFixedAmount,
      category: bill.category,
      frequency: bill.frequency,
      isOverdue: bill.isOverdue,
      overdueByDays: bill.overdueByDays
    },
    backgroundColor: bill.isOverdue ? '#dc3545' : (getDaysUntilDue(bill.nextDueDate) <= 3 ? '#ffc107' : '#28a745'),
    borderColor: bill.isOverdue ? '#dc3545' : (getDaysUntilDue(bill.nextDueDate) <= 3 ? '#ffc107' : '#28a745'),
    textColor: '#ffffff'
  }));

  res.json({
    events: calendarEvents,
    totalBills: bills.length,
    overdueBills: bills.filter(b => b.isOverdue).length,
    upcomingBills: bills.filter(b => !b.isOverdue && getDaysUntilDue(b.nextDueDate) <= 7).length
  });
};

/**
 * Export bills to calendar format (iCal)
 */
export const exportBillsToCalendar = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { 
    months = 12,
    includeOverdue = false 
  } = req.query;

  const now = new Date();
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + parseInt(months as string));

  const whereCondition: any = {
    userId,
    isActive: true,
    nextDueDate: {
      gte: includeOverdue === 'true' ? undefined : now,
      lte: futureDate
    }
  };

  if (includeOverdue !== 'true') {
    whereCondition.nextDueDate.gte = now;
  }

  const bills = await prisma.bill.findMany({
    where: whereCondition,
    include: {
      category: true
    },
    orderBy: {
      nextDueDate: 'asc'
    }
  });

  // Generate iCal format
  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Expense Tracker//Bill Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Bill Reminders',
    'X-WR-CALDESC:Upcoming bill due dates and reminders'
  ].join('\r\n');

  bills.forEach(bill => {
    const dueDate = bill.nextDueDate;
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const summary = `${bill.name} - ${bill.payee}`;
    const description = [
      `Bill: ${bill.name}`,
      `Payee: ${bill.payee}`,
      bill.amount ? `Amount: ${formatCurrency(bill.amount)}` : 'Amount: Variable',
      `Category: ${bill.category?.name || 'Uncategorized'}`,
      `Frequency: ${getFrequencyText(bill.frequency)}`,
      bill.isOverdue ? `⚠️ OVERDUE by ${bill.overdueByDays} days` : ''
    ].filter(Boolean).join('\\n');

    icalContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:bill-${bill.id}-${dueDate.getTime()}@expense-tracker.app`,
      `DTSTART:${formatDate(dueDate)}`,
      `DTEND:${formatDate(new Date(dueDate.getTime() + 60 * 60 * 1000))}`, // 1 hour duration
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `CATEGORIES:Bills,Finance`,
      bill.isOverdue ? 'PRIORITY:1' : 'PRIORITY:5',
      `STATUS:${bill.isOverdue ? 'NEEDS-ACTION' : 'TENTATIVE'}`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D', // 1 day before
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${summary} is due tomorrow`,
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');
  });

  icalContent += '\r\nEND:VCALENDAR';

  // Set headers for file download
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bill-reminders.ics"');
  res.send(icalContent);
};

/**
 * Get bills dashboard summary
 */
export const getBillsDashboard = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalBills,
    activeBills,
    overdueBills,
    dueThisWeek,
    dueThisMonth,
    totalPaidThisMonth,
    averageMonthlyAmount
  ] = await Promise.all([
    // Total bills
    prisma.bill.count({
      where: { userId }
    }),
    
    // Active bills
    prisma.bill.count({
      where: { userId, isActive: true }
    }),
    
    // Overdue bills
    prisma.bill.findMany({
      where: { userId, isOverdue: true },
      include: { category: true }
    }),
    
    // Due this week
    prisma.bill.findMany({
      where: {
        userId,
        isActive: true,
        nextDueDate: {
          gte: now,
          lte: nextWeek
        }
      },
      include: { category: true }
    }),
    
    // Due this month
    prisma.bill.count({
      where: {
        userId,
        isActive: true,
        nextDueDate: {
          gte: now,
          lte: nextMonth
        }
      }
    }),
    
    // Total paid this month
    prisma.billPayment.aggregate({
      where: {
        bill: { userId },
        paidDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        }
      },
      _sum: { amount: true }
    }),
    
    // Average monthly bill amount
    prisma.bill.aggregate({
      where: {
        userId,
        isActive: true,
        isFixedAmount: true,
        amount: { not: null }
      },
      _avg: { amount: true }
    })
  ]);

  const summary = {
    totalBills,
    activeBills,
    overdueBills: {
      count: overdueBills.length,
      totalAmount: overdueBills.reduce((sum, bill) => sum + (bill.amount || 0), 0),
      bills: overdueBills.map(bill => ({
        id: bill.id,
        name: bill.name,
        payee: bill.payee,
        amount: bill.amount,
        overdueByDays: bill.overdueByDays,
        category: bill.category?.name
      }))
    },
    dueThisWeek: {
      count: dueThisWeek.length,
      totalAmount: dueThisWeek.reduce((sum, bill) => sum + (bill.amount || 0), 0),
      bills: dueThisWeek.map(bill => ({
        id: bill.id,
        name: bill.name,
        payee: bill.payee,
        amount: bill.amount,
        nextDueDate: bill.nextDueDate,
        daysUntilDue: getDaysUntilDue(bill.nextDueDate),
        category: bill.category?.name
      }))
    },
    dueThisMonth,
    totalPaidThisMonth: totalPaidThisMonth._sum.amount || 0,
    averageMonthlyAmount: averageMonthlyAmount._avg.amount || 0,
    upcomingPayments: dueThisWeek.length + overdueBills.length
  };

  res.json(summary);
};
