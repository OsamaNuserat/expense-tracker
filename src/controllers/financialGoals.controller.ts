import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { GoalType, GoalPriority, TransactionType } from '@prisma/client';

/**
 * @desc    Get all financial goals for the authenticated user
 * @route   GET /api/financial-goals
 * @access  Private
 */
export const getFinancialGoals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const goals = await prisma.financialGoal.findMany({
      where: { userId },
      include: {
        category: true,
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        milestones: {
          orderBy: { targetAmount: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate progress for each goal
    const goalsWithProgress = goals.map(goal => ({
      ...goal,
      progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
      remaining: goal.targetAmount - goal.currentAmount,
      daysLeft: goal.targetDate ? Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
    }));

    res.json({
      success: true,
      data: goalsWithProgress
    });
  } catch (error) {
    console.error('Error fetching financial goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial goals'
    });
  }
};

/**
 * @desc    Get a single financial goal by ID
 * @route   GET /api/financial-goals/:id
 * @access  Private
 */
export const getFinancialGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const goalId = parseInt(req.params.id);

    const goal = await prisma.financialGoal.findFirst({
      where: { 
        id: goalId,
        userId 
      },
      include: {
        category: true,
        transactions: {
          orderBy: { createdAt: 'desc' }
        },
        milestones: {
          orderBy: { targetAmount: 'asc' }
        }
      }
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Financial goal not found'
      });
    }

    // Calculate progress
    const goalWithProgress = {
      ...goal,
      progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
      remaining: goal.targetAmount - goal.currentAmount,
      daysLeft: goal.targetDate ? Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
    };

    res.json({
      success: true,
      data: goalWithProgress
    });
  } catch (error) {
    console.error('Error fetching financial goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial goal'
    });
  }
};

/**
 * @desc    Create a new financial goal
 * @route   POST /api/financial-goals
 * @access  Private
 */
export const createFinancialGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { 
      title, 
      description, 
      goalType, 
      targetAmount, 
      targetDate, 
      currentAmount = 0,
      priority = 'MEDIUM',
      categoryId,
      autoContribute = false,
      monthlyTarget,
      reminderEnabled = true,
      reminderDay
    } = req.body;

    // Validation
    if (!title || !goalType || !targetAmount) {
      return res.status(400).json({
        success: false,
        message: 'Title, goal type, and target amount are required'
      });
    }

    if (targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Target amount must be greater than 0'
      });
    }

    if (targetDate && new Date(targetDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Target date must be in the future'
      });
    }

    // Validate goal type
    if (!Object.values(GoalType).includes(goalType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal type'
      });
    }

    // Validate priority if provided
    if (priority && !Object.values(GoalPriority).includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority level'
      });
    }

    const goal = await prisma.financialGoal.create({
      data: {
        userId,
        title,
        description,
        goalType,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        priority,
        categoryId: categoryId ? parseInt(categoryId) : null,
        autoContribute,
        monthlyTarget: monthlyTarget ? parseFloat(monthlyTarget) : null,
        reminderEnabled,
        reminderDay: reminderDay ? parseInt(reminderDay) : null
      },
      include: {
        category: true
      }
    });

    res.status(201).json({
      success: true,
      data: goal,
      message: 'Financial goal created successfully'
    });
  } catch (error) {
    console.error('Error creating financial goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create financial goal'
    });
  }
};

/**
 * @desc    Update a financial goal
 * @route   PUT /api/financial-goals/:id
 * @access  Private
 */
export const updateFinancialGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const goalId = parseInt(req.params.id);
    const updateData = req.body;

    // Check if goal exists and belongs to user
    const existingGoal = await prisma.financialGoal.findFirst({
      where: { 
        id: goalId,
        userId 
      }
    });

    if (!existingGoal) {
      return res.status(404).json({
        success: false,
        message: 'Financial goal not found'
      });
    }

    const updatedGoal = await prisma.financialGoal.update({
      where: { id: goalId },
      data: updateData,
      include: {
        category: true
      }
    });

    res.json({
      success: true,
      data: updatedGoal,
      message: 'Financial goal updated successfully'
    });
  } catch (error) {
    console.error('Error updating financial goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update financial goal'
    });
  }
};

/**
 * @desc    Add money to a financial goal
 * @route   POST /api/financial-goals/:id/contribute
 * @access  Private
 */
export const contributeToGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const goalId = parseInt(req.params.id);
    const { amount, description, source } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Check if goal exists and belongs to user
    const goal = await prisma.financialGoal.findFirst({
      where: { 
        id: goalId,
        userId 
      }
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Financial goal not found'
      });
    }

    if (!goal.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot contribute to inactive goal'
      });
    }

    const newAmount = goal.currentAmount + parseFloat(amount);
    const isCompleted = newAmount >= goal.targetAmount;

    // Update goal and create transaction
    const [updatedGoal, transaction] = await prisma.$transaction([
      prisma.financialGoal.update({
        where: { id: goalId },
        data: { 
          currentAmount: newAmount,
          isCompleted,
          completedAt: isCompleted && !goal.isCompleted ? new Date() : goal.completedAt
        }
      }),
      prisma.goalTransaction.create({
        data: {
          goalId,
          amount: parseFloat(amount),
          type: TransactionType.CONTRIBUTION,
          description,
          source
        }
      })
    ]);

    res.json({
      success: true,
      data: { goal: updatedGoal, transaction },
      message: isCompleted ? 'Congratulations! Goal achieved!' : 'Contribution added successfully'
    });
  } catch (error) {
    console.error('Error contributing to goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to contribute to goal'
    });
  }
};

/**
 * @desc    Delete a financial goal
 * @route   DELETE /api/financial-goals/:id
 * @access  Private
 */
export const deleteFinancialGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const goalId = parseInt(req.params.id);

    // Check if goal exists and belongs to user
    const goal = await prisma.financialGoal.findFirst({
      where: { 
        id: goalId,
        userId 
      }
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Financial goal not found'
      });
    }

    await prisma.financialGoal.delete({
      where: { id: goalId }
    });

    res.json({
      success: true,
      message: 'Financial goal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting financial goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete financial goal'
    });
  }
};

/**
 * @desc    Get financial goals statistics
 * @route   GET /api/financial-goals/stats
 * @access  Private
 */
export const getFinancialGoalsStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const goals = await prisma.financialGoal.findMany({
      where: { userId },
      include: {
        transactions: true
      }
    });

    const stats = {
      total: goals.length,
      active: goals.filter(g => g.isActive && !g.isCompleted).length,
      completed: goals.filter(g => g.isCompleted).length,
      inactive: goals.filter(g => !g.isActive).length,
      totalTargetAmount: goals.reduce((sum, g) => sum + g.targetAmount, 0),
      totalCurrentAmount: goals.reduce((sum, g) => sum + g.currentAmount, 0),
      totalRemaining: goals.reduce((sum, g) => sum + Math.max(0, g.targetAmount - g.currentAmount), 0),
      averageProgress: goals.length > 0 ? goals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount), 0) / goals.length * 100 : 0,
      goalsByType: goals.reduce((acc, goal) => {
        acc[goal.goalType] = (acc[goal.goalType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      goalsByPriority: goals.reduce((acc, goal) => {
        acc[goal.priority] = (acc[goal.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalTransactions: goals.reduce((sum, g) => sum + g.transactions.length, 0),
      recentActivity: goals
        .flatMap(g => g.transactions.map(t => ({ ...t, goalTitle: g.title })))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching financial goals stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial goals statistics'
    });
  }
};
