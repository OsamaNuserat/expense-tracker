import { Request, Response } from 'express';
import prisma from '../prisma/client';

interface SpendingSuggestion {
  id: string;
  type: 'limit' | 'reduction' | 'review' | 'alert' | 'tip' | 'goal' | 'habit';
  title: string;
  description: string;
  icon: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  actionText?: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  impact?: {
    currentAmount: number;
    suggestedAmount: number;
    savings: number;
    percentage: number;
  };
  tags?: string[];
}

/**
 * Get personalized spending suggestions
 */
export const getSpendingSuggestions = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { period = 'month', limit = 5 } = req.query;

  // Calculate period dates
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate.setDate(1); // Start of current month
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    startDate.setMonth(quarter * 3, 1);
  }

  // Get spending data
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      category: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get previous period for comparison
  const prevStartDate = new Date(startDate);
  const prevEndDate = new Date(endDate);
  if (period === 'week') {
    prevStartDate.setDate(prevStartDate.getDate() - 7);
    prevEndDate.setDate(prevEndDate.getDate() - 7);
  } else if (period === 'month') {
    prevStartDate.setMonth(prevStartDate.getMonth() - 1);
    prevEndDate.setMonth(prevEndDate.getMonth() - 1);
  } else if (period === 'quarter') {
    prevStartDate.setMonth(prevStartDate.getMonth() - 3);
    prevEndDate.setMonth(prevEndDate.getMonth() - 3);
  }

  const prevExpenses = await prisma.expense.findMany({
    where: {
      userId,
      createdAt: {
        gte: prevStartDate,
        lte: prevEndDate
      }
    }
  });

  // Calculate metrics
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const prevTotalSpent = prevExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = period === 'month' ? 
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() : 
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const averageDaily = totalSpent / (daysInPeriod - daysRemaining);
  const projectedTotal = averageDaily * daysInPeriod;
  const changePercentage = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;

  // Group by category
  const categorySpending = expenses.reduce((acc, exp) => {
    const categoryName = exp.category.name;
    if (!acc[categoryName]) {
      acc[categoryName] = { total: 0, count: 0, categoryId: exp.categoryId };
    }
    acc[categoryName].total += exp.amount;
    acc[categoryName].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number; categoryId: number }>);

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    if (name.includes('food') || name.includes('restaurant') || name.includes('dining')) return '🍽️';
    if (name.includes('transport') || name.includes('gas') || name.includes('fuel')) return '🚗';
    if (name.includes('shopping') || name.includes('retail') || name.includes('clothes')) return '🛍️';
    if (name.includes('entertainment') || name.includes('movie') || name.includes('fun')) return '🎬';
    if (name.includes('health') || name.includes('medical') || name.includes('pharmacy')) return '🏥';
    if (name.includes('education') || name.includes('learning') || name.includes('book')) return '📚';
    if (name.includes('utility') || name.includes('bill') || name.includes('electric')) return '⚡';
    if (name.includes('grocery') || name.includes('supermarket')) return '🛒';
    if (name.includes('gym') || name.includes('fitness') || name.includes('sport')) return '💪';
    if (name.includes('coffee') || name.includes('café')) return '☕';
    return '💳';
  };

  // Generate suggestions
  const suggestions: SpendingSuggestion[] = [];

  // 1. Daily spending limit suggestion
  if (daysRemaining > 0 && period === 'month') {
    const remainingBudget = Math.max(0, (prevTotalSpent * 1.1) - totalSpent); // 10% buffer
    const dailyLimit = remainingBudget / daysRemaining;
    
    if (dailyLimit < averageDaily) {
      suggestions.push({
        id: 'daily_limit',
        type: 'limit',
        title: 'Set Daily Spending Limit',
        description: `Keep your daily spending under ${dailyLimit.toFixed(1)} JOD to stay on track`,
        icon: '💰',
        priority: dailyLimit < averageDaily * 0.5 ? 'critical' : 'high',
        actionText: 'Set Limit',
        difficultyLevel: 'medium',
        tags: ['budget', 'limit', 'daily'],
        impact: {
          currentAmount: averageDaily,
          suggestedAmount: dailyLimit,
          savings: (averageDaily - dailyLimit) * daysRemaining,
          percentage: ((averageDaily - dailyLimit) / averageDaily) * 100
        }
      });
    }
  }

  // 2. Category-specific suggestions
  Object.entries(categorySpending)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 3)
    .forEach(([categoryName, data]) => {
      const categoryPercentage = (data.total / totalSpent) * 100;
      const categoryIcon = getCategoryIcon(categoryName);
      
      // High spending category
      if (categoryPercentage > 30) {
        suggestions.push({
          id: `reduce_${categoryName.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'reduction',
          title: `Reduce ${categoryName} Spending`,
          description: `Try cutting ${categoryName.toLowerCase()} expenses by 15% this month`,
          icon: categoryIcon,
          priority: categoryPercentage > 50 ? 'high' : 'medium',
          category: categoryName,
          actionText: 'Start Saving',
          difficultyLevel: categoryPercentage > 50 ? 'medium' : 'easy',
          tags: ['saving', 'category', 'reduction'],
          impact: {
            currentAmount: data.total,
            suggestedAmount: data.total * 0.85,
            savings: data.total * 0.15,
            percentage: 15
          }
        });
      }

      // Smart category tips
      if (categoryName.toLowerCase().includes('food') && data.count > 20) {
        suggestions.push({
          id: `meal_prep_tip`,
          type: 'tip',
          title: 'Try Meal Prepping',
          description: 'Prepare meals at home to reduce dining out costs',
          icon: '👨‍🍳',
          priority: 'medium',
          category: categoryName,
          actionText: 'Learn More',
          difficultyLevel: 'medium',
          tags: ['tip', 'food', 'habits']
        });
      }

      if (categoryName.toLowerCase().includes('transport') && data.count > 15) {
        suggestions.push({
          id: `transport_tip`,
          type: 'tip',
          title: 'Consider Public Transport',
          description: 'Use buses or shared rides to save on transport costs',
          icon: '🚌',
          priority: 'medium',
          category: categoryName,
          actionText: 'Explore Options',
          difficultyLevel: 'easy',
          tags: ['tip', 'transport', 'alternative']
        });
      }

      // Increased spending vs previous period
      if (changePercentage > 15 && categoryPercentage > 15) {
        suggestions.push({
          id: `review_${categoryName.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'review',
          title: `Review ${categoryName} Expenses`,
          description: `Your ${categoryName.toLowerCase()} spending increased by ${changePercentage.toFixed(0)}% this ${period}`,
          icon: '📈',
          priority: 'medium',
          category: categoryName,
          actionText: 'View Details',
          difficultyLevel: 'easy',
          tags: ['review', 'analysis', 'trend']
        });
      }
    });

  // 3. Trending up alert
  if (changePercentage > 20) {
    suggestions.push({
      id: 'spending_trend',
      type: 'alert',
      title: 'Spending Trending Up',
      description: `Your spending is ${changePercentage.toFixed(0)}% higher than last ${period}`,
      icon: '⚠️',
      priority: changePercentage > 50 ? 'critical' : 'high',
      actionText: 'Take Action',
      difficultyLevel: 'medium',
      tags: ['alert', 'trend', 'urgent']
    });
  }

  // 4. Smart saving goals
  if (totalSpent > 0) {
    const weeklySavingsGoal = totalSpent * 0.1 / 4; // 10% savings goal per week
    suggestions.push({
      id: 'weekly_savings_goal',
      type: 'goal',
      title: 'Weekly Savings Challenge',
      description: `Try to save ${weeklySavingsGoal.toFixed(1)} JOD this week`,
      icon: '🎯',
      priority: 'medium',
      actionText: 'Accept Challenge',
      difficultyLevel: 'easy',
      tags: ['goal', 'savings', 'challenge'],
      impact: {
        currentAmount: 0,
        suggestedAmount: weeklySavingsGoal,
        savings: weeklySavingsGoal * 4, // Monthly savings
        percentage: 10
      }
    });
  }

  // 5. Habit formation suggestions
  const highFrequencyCategories = Object.entries(categorySpending)
    .filter(([, data]) => data.count > 10)
    .sort(([, a], [, b]) => b.count - a.count);

  if (highFrequencyCategories.length > 0) {
    const [topCategory, topData] = highFrequencyCategories[0];
    const averagePerTransaction = topData.total / topData.count;
    
    suggestions.push({
      id: 'spending_habit',
      type: 'habit',
      title: 'Build Better Spending Habits',
      description: `You spend ${averagePerTransaction.toFixed(1)} JOD on average for ${topCategory.toLowerCase()}`,
      icon: '🎯',
      priority: 'low',
      category: topCategory,
      actionText: 'Track Progress',
      difficultyLevel: 'easy',
      tags: ['habit', 'tracking', 'awareness']
    });
  }

  // 6. Smart tips based on spending patterns
  const daysSinceLastExpense = Math.floor((now.getTime() - expenses[0]?.createdAt.getTime()) / (1000 * 60 * 60 * 24)) || 0;
  
  if (daysSinceLastExpense < 1 && expenses.length > 5) {
    suggestions.push({
      id: 'spending_frequency_tip',
      type: 'tip',
      title: 'Take a Spending Break',
      description: 'You\'ve made several purchases today. Consider a 24-hour pause before your next purchase',
      icon: '⏸️',
      priority: 'low',
      actionText: 'Set Reminder',
      difficultyLevel: 'easy',
      tags: ['tip', 'mindful', 'pause']
    });
  }

  // 7. Weekend spending awareness
  const weekendSpending = expenses.filter(exp => {
    const day = exp.createdAt.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }).reduce((sum, exp) => sum + exp.amount, 0);
  
  const weekendPercentage = totalSpent > 0 ? (weekendSpending / totalSpent) * 100 : 0;
  
  if (weekendPercentage > 40) {
    suggestions.push({
      id: 'weekend_spending',
      type: 'tip',
      title: 'Weekend Spending Alert',
      description: `${weekendPercentage.toFixed(0)}% of your spending happens on weekends`,
      icon: '📅',
      priority: 'medium',
      actionText: 'Plan Ahead',
      difficultyLevel: 'medium',
      tags: ['tip', 'weekend', 'planning']
    });
  }

  // Limit suggestions and sort by priority
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  const limitedSuggestions = suggestions
    .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
    .slice(0, parseInt(limit as string));

  res.json({
    suggestions: limitedSuggestions,
    metadata: {
      totalSuggestions: suggestions.length,
      priorityBreakdown: {
        critical: suggestions.filter(s => s.priority === 'critical').length,
        high: suggestions.filter(s => s.priority === 'high').length,
        medium: suggestions.filter(s => s.priority === 'medium').length,
        low: suggestions.filter(s => s.priority === 'low').length
      },
      categories: [...new Set(suggestions.map(s => s.category).filter(Boolean))],
      lastUpdated: new Date().toISOString()
    },
    analysis: {
      period: {
        startDate,
        endDate,
        daysRemaining,
        type: period
      },
      spending: {
        totalSpent,
        averageDaily,
        projectedMonthly: period === 'month' ? projectedTotal : null,
        transactionCount: expenses.length
      },
      trends: {
        vsLastPeriod: changePercentage,
        trend: changePercentage > 5 ? 'increasing' : changePercentage < -5 ? 'decreasing' : 'stable',
        direction: changePercentage > 0 ? 'up' : changePercentage < 0 ? 'down' : 'stable'
      },
      topCategories: Object.entries(categorySpending)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 3)
        .map(([name, data]) => ({
          name,
          amount: data.total,
          percentage: (data.total / totalSpent) * 100,
          icon: getCategoryIcon(name)
        }))
    }
  });
};

/**
 * Get detailed spending insights
 */
export const getSpendingInsights = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { period = 'month' } = req.query;

  // Calculate period dates
  const now = new Date();
  const startDate = new Date();
  
  if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate.setDate(1);
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    startDate.setMonth(quarter * 3, 1);
  } else if (period === 'year') {
    startDate.setMonth(0, 1);
  }

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: now
      }
    },
    include: {
      category: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Category breakdown
  const categoryBreakdown = expenses.reduce((acc, exp) => {
    const categoryName = exp.category.name;
    if (!acc[categoryName]) {
      acc[categoryName] = { amount: 0, count: 0 };
    }
    acc[categoryName].amount += exp.amount;
    acc[categoryName].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  const topCategories = Object.entries(categoryBreakdown)
    .map(([name, data]) => ({
      categoryName: name,
      amount: data.amount,
      percentage: (data.amount / totalSpent) * 100,
      trend: 'stable' // Simplified for now
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Spending patterns
  const dayOfWeekSpending = expenses.reduce((acc, exp) => {
    const day = exp.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
    acc[day] = (acc[day] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const peakSpendingDay = Object.entries(dayOfWeekSpending)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  const avgTransactionSize = expenses.length > 0 ? totalSpent / expenses.length : 0;

  const merchantFrequency = expenses.reduce((acc, exp) => {
    if (exp.merchant) {
      acc[exp.merchant] = (acc[exp.merchant] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const frequentMerchants = Object.entries(merchantFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([merchant]) => merchant);

  res.json({
    overview: {
      totalSpent,
      budgetStatus: 'on_track', // Simplified
      percentageUsed: 78.5 // Simplified
    },
    topCategories,
    patterns: {
      peakSpendingDay,
      avgTransactionSize,
      frequentMerchants
    }
  });
};

/**
 * Get budget recommendations
 */
export const getBudgetRecommendations = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  // Get last 3 months of data for better recommendations
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      createdAt: {
        gte: threeMonthsAgo
      }
    },
    include: {
      category: true
    }
  });

  // Calculate monthly averages by category
  const categoryAverages = expenses.reduce((acc, exp) => {
    const categoryName = exp.category.name;
    const categoryId = exp.categoryId;
    if (!acc[categoryId]) {
      acc[categoryId] = { 
        name: categoryName, 
        total: 0, 
        months: new Set() 
      };
    }
    acc[categoryId].total += exp.amount;
    acc[categoryId].months.add(`${exp.createdAt.getFullYear()}-${exp.createdAt.getMonth()}`);
    return acc;
  }, {} as Record<number, { name: string; total: number; months: Set<string> }>);

  const recommendations = Object.entries(categoryAverages).map(([categoryId, data]) => {
    const monthCount = Math.max(data.months.size, 1);
    const monthlyAverage = data.total / monthCount;
    const recommendedBudget = monthlyAverage * 0.9; // 10% reduction goal

    return {
      categoryId: parseInt(categoryId),
      categoryName: data.name,
      currentSpending: monthlyAverage,
      recommendedBudget,
      reasoning: `Based on your ${monthCount}-month average, we suggest reducing by 10%`,
      difficulty: monthlyAverage > recommendedBudget * 1.2 ? 'challenging' : 
                  monthlyAverage > recommendedBudget * 1.1 ? 'moderate' : 'easy'
    };
  });

  const totalRecommendedBudget = recommendations.reduce((sum, rec) => sum + rec.recommendedBudget, 0);
  const totalCurrentSpending = recommendations.reduce((sum, rec) => sum + rec.currentSpending, 0);
  const potentialSavings = totalCurrentSpending - totalRecommendedBudget;

  res.json({
    recommendations,
    totalRecommendedBudget,
    potentialSavings
  });
};

/**
 * Take action on a specific suggestion
 */
export const takeSuggestionAction = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { suggestionId } = req.params;
  const { action = 'accept' } = req.body;

  // Log the action (you could store this in a database for analytics)
  const actionLog = {
    userId,
    suggestionId,
    action,
    timestamp: new Date(),
    sessionId: req.headers['x-session-id'] || 'unknown'
  };

  // Handle different types of actions
  let response: any = {
    success: true,
    message: 'Action completed successfully',
    suggestionId,
    action
  };

  switch (suggestionId) {
    case 'daily_limit':
      if (action === 'accept') {
        // Here you could save user preferences, create budget alerts, etc.
        response.message = 'Daily spending limit has been set. You\'ll receive notifications when approaching the limit.';
        response.nextSteps = [
          'Track your daily spending',
          'Get alerts when you\'re close to your limit',
          'Review progress weekly'
        ];
      }
      break;

    case 'weekly_savings_goal':
      if (action === 'accept') {
        response.message = 'Savings challenge accepted! We\'ll track your progress.';
        response.nextSteps = [
          'Set up automatic savings reminders',
          'Track weekly progress',
          'Celebrate when you reach your goal'
        ];
      }
      break;

    case 'meal_prep_tip':
      if (action === 'learn_more') {
        response.message = 'Great choice! Here are some meal prep resources.';
        response.resources = [
          {
            title: 'Beginner\'s Guide to Meal Prep',
            type: 'article',
            estimatedSavings: '30-40% on food costs'
          },
          {
            title: 'Quick 30-minute meal prep ideas',
            type: 'video',
            estimatedSavings: '2-3 hours per week'
          }
        ];
      }
      break;

    default:
      // Generic handling for category-based suggestions
      if (suggestionId.startsWith('reduce_')) {
        const category = suggestionId.replace('reduce_', '').replace(/_/g, ' ');
        response.message = `Started tracking ${category} reduction goal. We'll monitor your progress.`;
        response.trackingEnabled = true;
      }
      break;
  }

  // You could store this action in a database for future reference
  // await prisma.suggestionAction.create({ data: actionLog });

  res.json(response);
};

/**
 * Get personalized tips based on spending patterns
 */
export const getPersonalizedTips = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { category } = req.query;

  // Get recent spending data
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      createdAt: { gte: lastMonth },
      ...(category && { category: { name: category as string } })
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  });

  const tips = [];

  // Generate context-specific tips
  if (expenses.length > 0) {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgTransaction = totalSpent / expenses.length;

    // High-frequency spending tips
    if (expenses.length > 20) {
      tips.push({
        id: 'frequency_awareness',
        title: 'Spending Frequency Alert',
        description: `You've made ${expenses.length} transactions this month. Consider batching purchases to reduce impulse buying.`,
        icon: '📊',
        type: 'awareness',
        difficulty: 'easy'
      });
    }

    // Transaction size tips
    if (avgTransaction > 50) {
      tips.push({
        id: 'transaction_size',
        title: 'Review Large Purchases',
        description: `Your average transaction is ${avgTransaction.toFixed(1)} JOD. Consider the 24-hour rule for purchases over 50 JOD.`,
        icon: '🤔',
        type: 'strategy',
        difficulty: 'medium'
      });
    }

    // Category-specific tips
    const categoryGroups = expenses.reduce((acc, exp) => {
      const catName = exp.category.name.toLowerCase();
      acc[catName] = (acc[catName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(categoryGroups).forEach(([catName, count]) => {
      if (catName.includes('food') && count > 15) {
        tips.push({
          id: 'food_optimization',
          title: 'Food Spending Optimization',
          description: 'Try the 50/30/20 rule: 50% groceries, 30% dining out, 20% coffee/snacks.',
          icon: '🍽️',
          type: 'strategy',
          difficulty: 'medium'
        });
      }

      if (catName.includes('transport') && count > 10) {
        tips.push({
          id: 'transport_alternatives',
          title: 'Explore Transport Alternatives',
          description: 'Consider carpooling, public transport, or walking for short distances.',
          icon: '🚌',
          type: 'alternative',
          difficulty: 'easy'
        });
      }
    });
  }

  // Add some general tips if no specific patterns found
  if (tips.length === 0) {
    tips.push(
      {
        id: 'budgeting_basics',
        title: 'Start With the 50/30/20 Rule',
        description: '50% needs, 30% wants, 20% savings. Track your spending to see where you stand.',
        icon: '📈',
        type: 'education',
        difficulty: 'easy'
      },
      {
        id: 'emergency_fund',
        title: 'Build an Emergency Fund',
        description: 'Aim to save 3-6 months of expenses for unexpected situations.',
        icon: '🛡️',
        type: 'goal',
        difficulty: 'hard'
      }
    );
  }

  res.json({
    tips: tips.slice(0, 5), // Limit to 5 tips
    basedOn: {
      period: 'last_month',
      transactionCount: expenses.length,
      categories: [...new Set(expenses.map(exp => exp.category.name))]
    }
  });
};

/**
 * Get spending overview for dashboard UI
 */
export const getSpendingOverview = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { period = 'month' } = req.query;

  // Calculate period dates
  const now = new Date();
  const startDate = new Date();
  
  if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate.setDate(1);
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    startDate.setMonth(quarter * 3, 1);
  }

  // Get current period expenses
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: now
      }
    },
    include: {
      category: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get user's survival budget if exists
  const survivalBudget = await prisma.survivalBudget.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const budgetLimit = survivalBudget?.amount || 1000; // Default budget
  const budgetUsedPercentage = (totalSpent / budgetLimit) * 100;

  // Quick stats for dashboard
  const stats = {
    currentSpending: {
      amount: totalSpent,
      currency: 'JOD',
      period: period as string,
      lastTransaction: expenses[0] ? {
        amount: expenses[0].amount,
        category: expenses[0].category.name,
        date: expenses[0].createdAt,
        merchant: expenses[0].merchant
      } : null
    },
    budget: {
      limit: budgetLimit,
      used: totalSpent,
      remaining: Math.max(0, budgetLimit - totalSpent),
      percentage: Math.min(100, budgetUsedPercentage),
      status: budgetUsedPercentage > 90 ? 'critical' : 
              budgetUsedPercentage > 75 ? 'warning' : 
              budgetUsedPercentage > 50 ? 'moderate' : 'good',
      projectedTotal: 0, // Will be set below
      projectedOverage: 0 // Will be set below
    },
    quickInsights: {
      transactionCount: expenses.length,
      avgTransactionSize: expenses.length > 0 ? totalSpent / expenses.length : 0,
      mostExpensiveDay: expenses.length > 0 ? expenses.reduce((max, exp) => 
        exp.amount > max.amount ? exp : max, expenses[0]
      ).createdAt : null,
      topCategory: expenses.length > 0 ? (() => {
        const categoryTotals = expenses.reduce((acc, exp) => {
          const catName = exp.category.name;
          acc[catName] = (acc[catName] || 0) + exp.amount;
          return acc;
        }, {} as Record<string, number>);
        
        const topCat = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0];
        return topCat ? { name: topCat[0], amount: topCat[1] } : null;
      })() : null
    }
  };

  // Spending velocity (how fast user is spending)
  const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = period === 'month' ? 
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() : 
    Math.max(0, Math.ceil((new Date(startDate.getTime() + (period === 'week' ? 7 : 90) * 24 * 60 * 60 * 1000).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const dailyAverage = totalSpent / Math.max(1, daysInPeriod - daysRemaining);
  const projectedTotal = dailyAverage * daysInPeriod;

  stats.budget.projectedTotal = projectedTotal;
  stats.budget.projectedOverage = Math.max(0, projectedTotal - budgetLimit);

  res.json({
    overview: stats,
    period: {
      type: period,
      startDate,
      endDate: now,
      daysRemaining,
      progress: Math.round(((daysInPeriod - daysRemaining) / daysInPeriod) * 100)
    },
    alerts: [
      ...(budgetUsedPercentage > 90 ? [{
        type: 'budget_critical',
        message: 'You\'ve used 90% of your monthly budget',
        severity: 'high'
      }] : []),
      ...(projectedTotal > budgetLimit * 1.1 ? [{
        type: 'projection_warning',
        message: `At current rate, you'll exceed budget by ${(projectedTotal - budgetLimit).toFixed(0)} JOD`,
        severity: 'medium'
      }] : []),
      ...(dailyAverage > budgetLimit / 30 * 1.5 ? [{
        type: 'daily_high',
        message: 'Your daily spending is above average',
        severity: 'low'
      }] : [])
    ]
  });
};
