import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import * as advisorController from '../controllers/advisor.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Spending Advisor
 *   description: AI-powered spending analysis and personalized financial advice
 */

/**
 * @swagger
 * /advisor/suggestions:
 *   get:
 *     summary: Get personalized spending suggestions
 *     description: Retrieve AI-powered spending suggestions based on user's transaction history and patterns
 *     tags: [Spending Advisor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter]
 *           default: month
 *         description: Time period for analysis
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 5
 *         description: Maximum number of suggestions to return
 *     responses:
 *       200:
 *         description: Spending suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "daily_limit"
 *                       type:
 *                         type: string
 *                         enum: [limit, reduction, review, alert, tip, goal, habit]
 *                         example: "limit"
 *                       title:
 *                         type: string
 *                         example: "Set Daily Spending Limit"
 *                       description:
 *                         type: string
 *                         example: "Keep your daily spending under 45.2 JOD to stay on track"
 *                       icon:
 *                         type: string
 *                         example: "💰"
 *                       priority:
 *                         type: string
 *                         enum: [low, medium, high, critical]
 *                         example: "high"
 *                       category:
 *                         type: string
 *                         example: "Food & Dining"
 *                       actionText:
 *                         type: string
 *                         example: "Set Limit"
 *                       difficultyLevel:
 *                         type: string
 *                         enum: [easy, medium, hard]
 *                         example: "medium"
 *                       impact:
 *                         type: object
 *                         properties:
 *                           currentAmount:
 *                             type: number
 *                           suggestedAmount:
 *                             type: number
 *                           savings:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     totalSuggestions:
 *                       type: integer
 *                     priorityBreakdown:
 *                       type: object
 *                       properties:
 *                         critical:
 *                           type: integer
 *                         high:
 *                           type: integer
 *                         medium:
 *                           type: integer
 *                         low:
 *                           type: integer
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: string
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                     spending:
 *                       type: object
 *                     trends:
 *                       type: object
 *                     topCategories:
 *                       type: array
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Internal server error
 */
router.get('/suggestions', authenticate, asyncHandler(advisorController.getSpendingSuggestions));

/**
 * @swagger
 * /advisor/suggestions/{suggestionId}/action:
 *   post:
 *     summary: Take action on a spending suggestion
 *     description: Accept, dismiss, or learn more about a specific spending suggestion
 *     tags: [Spending Advisor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: suggestionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the suggestion to act upon
 *         example: "daily_limit"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, dismiss, learn_more, set_reminder]
 *                 description: The action to take on the suggestion
 *                 example: "accept"
 *     responses:
 *       200:
 *         description: Action completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Daily spending limit has been set. You'll receive notifications when approaching the limit."
 *                 suggestionId:
 *                   type: string
 *                   example: "daily_limit"
 *                 action:
 *                   type: string
 *                   example: "accept"
 *                 nextSteps:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Track your daily spending", "Get alerts when you're close to your limit"]
 *                 resources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       type:
 *                         type: string
 *                       estimatedSavings:
 *                         type: string
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Suggestion not found
 */
router.post('/suggestions/:suggestionId/action', authenticate, asyncHandler(advisorController.takeSuggestionAction));

/**
 * @swagger
 * /advisor/overview:
 *   get:
 *     summary: Get spending overview for dashboard
 *     description: Get comprehensive spending overview with budget status, quick stats, and alerts
 *     tags: [Spending Advisor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter]
 *           default: month
 *         description: Period for overview analysis
 *     responses:
 *       200:
 *         description: Spending overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     currentSpending:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                           example: 1250.75
 *                         currency:
 *                           type: string
 *                           example: "JOD"
 *                         period:
 *                           type: string
 *                           example: "month"
 *                         lastTransaction:
 *                           type: object
 *                           properties:
 *                             amount:
 *                               type: number
 *                             category:
 *                               type: string
 *                             date:
 *                               type: string
 *                               format: date-time
 *                             merchant:
 *                               type: string
 *                     budget:
 *                       type: object
 *                       properties:
 *                         limit:
 *                           type: number
 *                           example: 1500.0
 *                         used:
 *                           type: number
 *                           example: 1250.75
 *                         remaining:
 *                           type: number
 *                           example: 249.25
 *                         percentage:
 *                           type: number
 *                           example: 83.4
 *                         status:
 *                           type: string
 *                           enum: [good, moderate, warning, critical]
 *                           example: "warning"
 *                         projectedTotal:
 *                           type: number
 *                         projectedOverage:
 *                           type: number
 *                     quickInsights:
 *                       type: object
 *                       properties:
 *                         transactionCount:
 *                           type: integer
 *                         avgTransactionSize:
 *                           type: number
 *                         mostExpensiveDay:
 *                           type: string
 *                           format: date-time
 *                         topCategory:
 *                           type: object
 *                 period:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     daysRemaining:
 *                       type: integer
 *                     progress:
 *                       type: integer
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [budget_critical, projection_warning, daily_high]
 *                       message:
 *                         type: string
 *                       severity:
 *                         type: string
 *                         enum: [low, medium, high]
 */
router.get('/overview', authenticate, asyncHandler(advisorController.getSpendingOverview));

/**
 * @swagger
 * /advisor/insights:
 *   get:
 *     summary: Get detailed spending insights
 *     description: Retrieve comprehensive spending analytics and patterns
 *     tags: [Spending Advisor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *         description: Analysis time period
 *     responses:
 *       200:
 *         description: Spending insights retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalSpent:
 *                       type: number
 *                       example: 1250.75
 *                     budgetStatus:
 *                       type: string
 *                       enum: [under_budget, on_track, over_budget]
 *                       example: "on_track"
 *                     percentageUsed:
 *                       type: number
 *                       example: 78.5
 *                 topCategories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoryName:
 *                         type: string
 *                         example: "Food & Dining"
 *                       amount:
 *                         type: number
 *                         example: 450.25
 *                       percentage:
 *                         type: number
 *                         example: 36.0
 *                       trend:
 *                         type: string
 *                         enum: [increasing, decreasing, stable]
 *                         example: "stable"
 *                 patterns:
 *                   type: object
 *                   properties:
 *                     peakSpendingDay:
 *                       type: string
 *                       example: "Saturday"
 *                     avgTransactionSize:
 *                       type: number
 *                       example: 27.85
 *                     frequentMerchants:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Starbucks", "Uber", "Carrefour"]
 */
router.get('/insights', authenticate, asyncHandler(advisorController.getSpendingInsights));

/**
 * @swagger
 * /advisor/tips:
 *   get:
 *     summary: Get personalized spending tips
 *     description: Retrieve context-aware financial tips based on spending patterns
 *     tags: [Spending Advisor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter tips for a specific spending category
 *         example: "Food & Dining"
 *     responses:
 *       200:
 *         description: Personalized tips retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tips:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "frequency_awareness"
 *                       title:
 *                         type: string
 *                         example: "Spending Frequency Alert"
 *                       description:
 *                         type: string
 *                         example: "You've made 32 transactions this month. Consider batching purchases to reduce impulse buying."
 *                       icon:
 *                         type: string
 *                         example: "📊"
 *                       type:
 *                         type: string
 *                         enum: [awareness, strategy, alternative, education, goal]
 *                         example: "awareness"
 *                       difficulty:
 *                         type: string
 *                         enum: [easy, medium, hard]
 *                         example: "easy"
 *                 basedOn:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                       example: "last_month"
 *                     transactionCount:
 *                       type: integer
 *                       example: 32
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/tips', authenticate, asyncHandler(advisorController.getPersonalizedTips));

/**
 * @swagger
 * /advisor/budget-recommendations:
 *   get:
 *     summary: Get AI-powered budget recommendations
 *     description: Retrieve intelligent budget suggestions based on spending history and patterns
 *     tags: [Spending Advisor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoryId:
 *                         type: integer
 *                         example: 1
 *                       categoryName:
 *                         type: string
 *                         example: "Food & Dining"
 *                       currentSpending:
 *                         type: number
 *                         example: 450.25
 *                       recommendedBudget:
 *                         type: number
 *                         example: 405.23
 *                       reasoning:
 *                         type: string
 *                         example: "Based on your 3-month average, we suggest reducing by 10%"
 *                       difficulty:
 *                         type: string
 *                         enum: [easy, moderate, challenging]
 *                         example: "moderate"
 *                 totalRecommendedBudget:
 *                   type: number
 *                   example: 1350.0
 *                 potentialSavings:
 *                   type: number
 *                   example: 150.75
 */
router.get('/budget-recommendations', authenticate, asyncHandler(advisorController.getBudgetRecommendations));

export default router;
