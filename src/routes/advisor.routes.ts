import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import * as advisorController from '../controllers/advisor.controller';

const router = Router();

/**
 * =============================================================================
 * SPENDING ADVISOR ROUTES
 * =============================================================================
 * 
 * This module provides AI-powered spending analysis and personalized financial
 * advice based on user transaction patterns and smart categorization algorithms.
 * 
 * Features:
 * - Personalized spending suggestions with impact analysis
 * - Comprehensive spending overview with budget tracking
 * - Detailed insights and pattern recognition
 * - Context-aware financial tips and recommendations
 * - AI-powered budget optimization suggestions
 * - Action tracking for suggestion implementation
 * 
 * All routes require authentication and return standardized JSON responses.
 */

/**
 * @swagger
 * tags:
 *   name: Spending Advisor
 *   description: AI-powered spending analysis and personalized financial advice
 */

// =============================================================================
// CORE SUGGESTION ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /advisor/suggestions:
 *   get:
 *     summary: Get personalized spending suggestions
 *     description: |
 *       Retrieve AI-powered spending suggestions based on user's transaction history and patterns.
 *       The system analyzes spending behaviors, categories, frequency, and amounts to provide
 *       actionable recommendations for better financial management.
 *       
 *       **Algorithm Features:**
 *       - Smart categorization pattern analysis
 *       - Spending frequency and timing analysis
 *       - Budget deviation detection
 *       - Comparative spending analysis
 *       - Trend-based recommendations
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
 *         description: Time period for analysis (affects suggestion relevance)
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
 *                   description: List of personalized spending suggestions
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Unique identifier for the suggestion
 *                         example: "daily_limit"
 *                       type:
 *                         type: string
 *                         enum: [limit, reduction, review, alert, tip, goal, habit]
 *                         description: Category of suggestion for UI grouping
 *                         example: "limit"
 *                       title:
 *                         type: string
 *                         description: Human-readable suggestion title
 *                         example: "Set Daily Spending Limit"
 *                       description:
 *                         type: string
 *                         description: Detailed explanation of the suggestion
 *                         example: "Keep your daily spending under 45.2 JOD to stay on track"
 *                       icon:
 *                         type: string
 *                         description: Emoji icon for visual representation
 *                         example: "💰"
 *                       priority:
 *                         type: string
 *                         enum: [low, medium, high, critical]
 *                         description: Urgency level for prioritization
 *                         example: "high"
 *                       category:
 *                         type: string
 *                         description: Spending category this suggestion applies to
 *                         example: "Food & Dining"
 *                       actionText:
 *                         type: string
 *                         description: CTA button text for the suggestion
 *                         example: "Set Limit"
 *                       difficultyLevel:
 *                         type: string
 *                         enum: [easy, medium, hard]
 *                         description: Implementation difficulty assessment
 *                         example: "medium"
 *                       impact:
 *                         type: object
 *                         description: Quantified impact of implementing this suggestion
 *                         properties:
 *                           currentAmount:
 *                             type: number
 *                             description: Current spending amount
 *                           suggestedAmount:
 *                             type: number
 *                             description: Recommended spending amount
 *                           savings:
 *                             type: number
 *                             description: Potential monthly savings
 *                           percentage:
 *                             type: number
 *                             description: Percentage reduction suggested
 *                       tags:
 *                         type: array
 *                         description: Searchable tags for suggestion filtering
 *                         items:
 *                           type: string
 *                 metadata:
 *                   type: object
 *                   description: Additional information about the suggestion set
 *                   properties:
 *                     totalSuggestions:
 *                       type: integer
 *                       description: Total number of available suggestions
 *                     priorityBreakdown:
 *                       type: object
 *                       description: Count of suggestions by priority level
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
 *                       description: List of categories covered by suggestions
 *                       items:
 *                         type: string
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       description: When suggestions were last computed
 *                 analysis:
 *                   type: object
 *                   description: Underlying analysis data used for suggestions
 *                   properties:
 *                     period:
 *                       type: object
 *                       description: Analysis time period information
 *                     spending:
 *                       type: object
 *                       description: Spending summary for the period
 *                     trends:
 *                       type: object
 *                       description: Identified spending trends
 *                     topCategories:
 *                       type: array
 *                       description: Highest spending categories
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       400:
 *         description: Bad request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid period parameter"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to generate suggestions"
 */
router.get('/suggestions', authenticate, asyncHandler(advisorController.getSpendingSuggestions));

/**
 * @swagger
 * /advisor/suggestions/{suggestionId}/action:
 *   post:
 *     summary: Take action on a spending suggestion
 *     description: |
 *       Accept, dismiss, or learn more about a specific spending suggestion.
 *       This endpoint allows users to interact with suggestions and tracks
 *       their implementation progress for better future recommendations.
 *       
 *       **Supported Actions:**
 *       - `accept`: Implement the suggestion and track it
 *       - `dismiss`: Permanently dismiss this suggestion
 *       - `learn_more`: Get additional information and resources
 *       - `set_reminder`: Set a reminder to implement later
 *     tags: [Spending Advisor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: suggestionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the suggestion to act upon
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
 *               metadata:
 *                 type: object
 *                 description: Optional additional data for the action
 *                 properties:
 *                   reminderDate:
 *                     type: string
 *                     format: date-time
 *                     description: When to remind (for set_reminder action)
 *                   customLimit:
 *                     type: number
 *                     description: Custom limit value (for accept action on limit suggestions)
 *                   reason:
 *                     type: string
 *                     description: Reason for dismissal (for dismiss action)
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
 *                   description: Human-readable confirmation message
 *                   example: "Daily spending limit has been set. You'll receive notifications when approaching the limit."
 *                 suggestionId:
 *                   type: string
 *                   description: The ID of the suggestion that was acted upon
 *                   example: "daily_limit"
 *                 action:
 *                   type: string
 *                   description: The action that was taken
 *                   example: "accept"
 *                 nextSteps:
 *                   type: array
 *                   description: Recommended follow-up actions
 *                   items:
 *                     type: string
 *                   example: ["Track your daily spending", "Get alerts when you're close to your limit"]
 *                 resources:
 *                   type: array
 *                   description: Educational resources and tools
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                         description: Resource title
 *                       type:
 *                         type: string
 *                         description: Type of resource (article, tip, tool)
 *                       estimatedSavings:
 *                         type: string
 *                         description: Potential savings from this resource
 *                 tracking:
 *                   type: object
 *                   description: Information about suggestion tracking
 *                   properties:
 *                     implementedAt:
 *                       type: string
 *                       format: date-time
 *                     reminderSet:
 *                       type: boolean
 *                     targetDate:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid action type"
 *       404:
 *         description: Suggestion not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Suggestion with ID 'daily_limit' not found"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/suggestions/:suggestionId/action', authenticate, asyncHandler(advisorController.takeSuggestionAction));

// =============================================================================
// OVERVIEW AND DASHBOARD ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /advisor/overview:
 *   get:
 *     summary: Get spending overview for dashboard
 *     description: |
 *       Get comprehensive spending overview with budget status, quick stats, and alerts.
 *       This endpoint provides a high-level view of the user's financial situation,
 *       perfect for dashboard widgets and quick financial health checks.
 *       
 *       **Key Features:**
 *       - Real-time budget tracking with projections
 *       - Spending velocity analysis
 *       - Alert system for budget overruns
 *       - Quick insights and statistics
 *       - Last transaction information
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
 *         example: "month"
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
 *                   description: Core spending and budget information
 *                   properties:
 *                     currentSpending:
 *                       type: object
 *                       description: Current period spending summary
 *                       properties:
 *                         amount:
 *                           type: number
 *                           description: Total spent in current period
 *                           example: 1250.75
 *                         currency:
 *                           type: string
 *                           description: Currency code
 *                           example: "JOD"
 *                         period:
 *                           type: string
 *                           description: Time period for this amount
 *                           example: "month"
 *                         lastTransaction:
 *                           type: object
 *                           description: Most recent transaction details
 *                           properties:
 *                             amount:
 *                               type: number
 *                               description: Transaction amount
 *                             category:
 *                               type: string
 *                               description: Transaction category
 *                             date:
 *                               type: string
 *                               format: date-time
 *                               description: Transaction timestamp
 *                             merchant:
 *                               type: string
 *                               description: Merchant or description
 *                     budget:
 *                       type: object
 *                       description: Budget status and projections
 *                       properties:
 *                         limit:
 *                           type: number
 *                           description: Set budget limit for the period
 *                           example: 1500.0
 *                         used:
 *                           type: number
 *                           description: Amount already spent
 *                           example: 1250.75
 *                         remaining:
 *                           type: number
 *                           description: Amount remaining in budget
 *                           example: 249.25
 *                         percentage:
 *                           type: number
 *                           description: Percentage of budget used
 *                           example: 83.4
 *                         status:
 *                           type: string
 *                           enum: [good, moderate, warning, critical]
 *                           description: Budget health indicator
 *                           example: "warning"
 *                         projectedTotal:
 *                           type: number
 *                           description: Projected spending by period end
 *                         projectedOverage:
 *                           type: number
 *                           description: Projected amount over budget (if any)
 *                     quickInsights:
 *                       type: object
 *                       description: Quick statistical insights
 *                       properties:
 *                         transactionCount:
 *                           type: integer
 *                           description: Number of transactions in period
 *                         avgTransactionSize:
 *                           type: number
 *                           description: Average transaction amount
 *                         mostExpensiveDay:
 *                           type: string
 *                           format: date-time
 *                           description: Date with highest spending
 *                         topCategory:
 *                           type: object
 *                           description: Category with most spending
 *                           properties:
 *                             name:
 *                               type: string
 *                             amount:
 *                               type: number
 *                             percentage:
 *                               type: number
 *                 period:
 *                   type: object
 *                   description: Time period information
 *                   properties:
 *                     type:
 *                       type: string
 *                       description: Period type
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: Period start date
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       description: Period end date
 *                     daysRemaining:
 *                       type: integer
 *                       description: Days remaining in current period
 *                     progress:
 *                       type: integer
 *                       description: Percentage of period completed
 *                 alerts:
 *                   type: array
 *                   description: Active alerts and warnings
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [budget_critical, projection_warning, daily_high, pattern_change]
 *                         description: Alert category
 *                       message:
 *                         type: string
 *                         description: Human-readable alert message
 *                       severity:
 *                         type: string
 *                         enum: [low, medium, high]
 *                         description: Alert urgency level
 *                       actionable:
 *                         type: boolean
 *                         description: Whether user can take immediate action
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid period parameter
 *       500:
 *         description: Internal server error
 */
router.get('/overview', authenticate, asyncHandler(advisorController.getSpendingOverview));

// =============================================================================
// DETAILED ANALYTICS ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /advisor/insights:
 *   get:
 *     summary: Get detailed spending insights
 *     description: |
 *       Retrieve comprehensive spending analytics and patterns for deep financial analysis.
 *       This endpoint provides detailed breakdowns, trends, and behavioral insights
 *       that help users understand their spending patterns at a granular level.
 *       
 *       **Analytics Include:**
 *       - Category-wise spending breakdown with trends
 *       - Spending pattern analysis (timing, frequency, amounts)
 *       - Merchant and location insights
 *       - Comparative analysis with previous periods
 *       - Seasonal and cyclical pattern detection
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
 *         example: "month"
 *       - in: query
 *         name: compareWith
 *         schema:
 *           type: string
 *           enum: [previous_period, last_year, average]
 *         description: Optional comparison baseline
 *         example: "previous_period"
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
 *                   description: High-level spending summary
 *                   properties:
 *                     totalSpent:
 *                       type: number
 *                       description: Total amount spent in period
 *                       example: 1250.75
 *                     budgetStatus:
 *                       type: string
 *                       enum: [under_budget, on_track, over_budget]
 *                       description: Overall budget performance
 *                       example: "on_track"
 *                     percentageUsed:
 *                       type: number
 *                       description: Percentage of budget consumed
 *                       example: 78.5
 *                     comparison:
 *                       type: object
 *                       description: Comparison with baseline period
 *                       properties:
 *                         percentageChange:
 *                           type: number
 *                           description: Percentage change from comparison period
 *                         absoluteChange:
 *                           type: number
 *                           description: Absolute amount change
 *                         trend:
 *                           type: string
 *                           enum: [increasing, decreasing, stable]
 *                 topCategories:
 *                   type: array
 *                   description: Highest spending categories with analysis
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoryName:
 *                         type: string
 *                         description: Category display name
 *                         example: "Food & Dining"
 *                       amount:
 *                         type: number
 *                         description: Total spent in this category
 *                         example: 450.25
 *                       percentage:
 *                         type: number
 *                         description: Percentage of total spending
 *                         example: 36.0
 *                       trend:
 *                         type: string
 *                         enum: [increasing, decreasing, stable]
 *                         description: Spending trend for this category
 *                         example: "stable"
 *                       transactionCount:
 *                         type: integer
 *                         description: Number of transactions in category
 *                       avgTransactionSize:
 *                         type: number
 *                         description: Average transaction amount
 *                       budgetImpact:
 *                         type: string
 *                         description: Impact on overall budget
 *                 patterns:
 *                   type: object
 *                   description: Behavioral and temporal spending patterns
 *                   properties:
 *                     peakSpendingDay:
 *                       type: string
 *                       description: Day of week with highest spending
 *                       example: "Saturday"
 *                     peakSpendingHour:
 *                       type: integer
 *                       description: Hour of day with most transactions
 *                       example: 14
 *                     avgTransactionSize:
 *                       type: number
 *                       description: Average transaction amount
 *                       example: 27.85
 *                     frequentMerchants:
 *                       type: array
 *                       description: Most frequently used merchants
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           frequency:
 *                             type: integer
 *                           totalSpent:
 *                             type: number
 *                       example: [{"name": "Starbucks", "frequency": 15, "totalSpent": 180.50}]
 *                     spendingVelocity:
 *                       type: object
 *                       description: Rate of spending analysis
 *                       properties:
 *                         dailyAverage:
 *                           type: number
 *                         weeklyAverage:
 *                           type: number
 *                         projectedMonthly:
 *                           type: number
 *                 recommendations:
 *                   type: array
 *                   description: Insights-based recommendations
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [pattern_optimization, category_reduction, timing_adjustment]
 *                       message:
 *                         type: string
 *                       potentialSavings:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/insights', authenticate, asyncHandler(advisorController.getSpendingInsights));

// =============================================================================
// EDUCATIONAL AND GUIDANCE ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /advisor/tips:
 *   get:
 *     summary: Get personalized spending tips
 *     description: |
 *       Retrieve context-aware financial tips based on spending patterns and behaviors.
 *       These tips are dynamically generated based on the user's actual spending
 *       data and are designed to provide actionable advice for financial improvement.
 *       
 *       **Tip Categories:**
 *       - Awareness: Help users understand their spending patterns
 *       - Strategy: Provide specific saving strategies
 *       - Alternative: Suggest cheaper alternatives to current habits
 *       - Education: Financial literacy and best practices
 *       - Goal: Help set and achieve financial objectives
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
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [awareness, strategy, alternative, education, goal]
 *         description: Filter by tip type
 *         example: "strategy"
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *         description: Filter by implementation difficulty
 *         example: "easy"
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
 *                   description: List of personalized financial tips
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Unique tip identifier
 *                         example: "frequency_awareness"
 *                       title:
 *                         type: string
 *                         description: Tip headline
 *                         example: "Spending Frequency Alert"
 *                       description:
 *                         type: string
 *                         description: Detailed tip explanation with personalized data
 *                         example: "You've made 32 transactions this month. Consider batching purchases to reduce impulse buying."
 *                       icon:
 *                         type: string
 *                         description: Visual icon for the tip
 *                         example: "📊"
 *                       type:
 *                         type: string
 *                         enum: [awareness, strategy, alternative, education, goal]
 *                         description: Category of the tip
 *                         example: "awareness"
 *                       difficulty:
 *                         type: string
 *                         enum: [easy, medium, hard]
 *                         description: Implementation difficulty
 *                         example: "easy"
 *                       estimatedImpact:
 *                         type: object
 *                         description: Expected benefits of following this tip
 *                         properties:
 *                           timeToSave:
 *                             type: string
 *                             description: Time savings per implementation
 *                           monthlySavings:
 *                             type: number
 *                             description: Potential monthly savings
 *                           difficultyScore:
 *                             type: integer
 *                             description: Implementation difficulty (1-10)
 *                       actionSteps:
 *                         type: array
 *                         description: Specific steps to implement the tip
 *                         items:
 *                           type: string
 *                         example: ["Set weekly shopping days", "Create a shopping list", "Avoid impulse purchases"]
 *                       relatedCategories:
 *                         type: array
 *                         description: Spending categories this tip applies to
 *                         items:
 *                           type: string
 *                 basedOn:
 *                   type: object
 *                   description: Data foundation for these tips
 *                   properties:
 *                     period:
 *                       type: string
 *                       description: Analysis period for tip generation
 *                       example: "last_month"
 *                     transactionCount:
 *                       type: integer
 *                       description: Number of transactions analyzed
 *                       example: 32
 *                     categories:
 *                       type: array
 *                       description: Categories with enough data for tips
 *                       items:
 *                         type: string
 *                     dataPoints:
 *                       type: object
 *                       description: Key metrics used for tip generation
 *                 filters:
 *                   type: object
 *                   description: Applied filters and available options
 *                   properties:
 *                     applied:
 *                       type: object
 *                       description: Currently applied filters
 *                     available:
 *                       type: object
 *                       description: Available filter options
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid filter parameters
 *       500:
 *         description: Internal server error
 */
router.get('/tips', authenticate, asyncHandler(advisorController.getPersonalizedTips));

// =============================================================================
// BUDGET OPTIMIZATION ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /advisor/budget-recommendations:
 *   get:
 *     summary: Get AI-powered budget recommendations
 *     description: |
 *       Retrieve intelligent budget suggestions based on spending history and patterns.
 *       This endpoint analyzes historical spending data, seasonal patterns, and
 *       financial goals to suggest optimal budget allocations for each category.
 *       
 *       **Recommendation Algorithm:**
 *       - Historical spending pattern analysis
 *       - Seasonal and cyclical adjustment
 *       - Goal-based budget optimization
 *       - Risk-adjusted recommendations
 *       - Inflation and trend consideration
 *     tags: [Spending Advisor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *           default: month
 *         description: Budget period for recommendations
 *         example: "month"
 *       - in: query
 *         name: goal
 *         schema:
 *           type: string
 *           enum: [save_more, maintain, emergency_fund, debt_reduction]
 *         description: Financial goal to optimize for
 *         example: "save_more"
 *       - in: query
 *         name: aggressiveness
 *         schema:
 *           type: string
 *           enum: [conservative, moderate, aggressive]
 *           default: moderate
 *         description: How aggressive the cost-cutting recommendations should be
 *         example: "moderate"
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
 *                   description: Category-wise budget recommendations
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoryId:
 *                         type: integer
 *                         description: Category database ID
 *                         example: 1
 *                       categoryName:
 *                         type: string
 *                         description: Human-readable category name
 *                         example: "Food & Dining"
 *                       currentSpending:
 *                         type: number
 *                         description: Current average spending in this category
 *                         example: 450.25
 *                       recommendedBudget:
 *                         type: number
 *                         description: AI-recommended budget for this category
 *                         example: 405.23
 *                       difference:
 *                         type: number
 *                         description: Difference between current and recommended
 *                         example: -45.02
 *                       percentageChange:
 *                         type: number
 *                         description: Percentage change from current spending
 *                         example: -10.0
 *                       reasoning:
 *                         type: string
 *                         description: Explanation for this recommendation
 *                         example: "Based on your 3-month average, we suggest reducing by 10% to meet your savings goal"
 *                       difficulty:
 *                         type: string
 *                         enum: [easy, moderate, challenging]
 *                         description: Expected difficulty to achieve this budget
 *                         example: "moderate"
 *                       strategies:
 *                         type: array
 *                         description: Specific strategies to achieve this budget
 *                         items:
 *                           type: string
 *                         example: ["Cook more meals at home", "Use grocery store loyalty programs", "Plan weekly menus"]
 *                       confidence:
 *                         type: number
 *                         description: AI confidence in this recommendation (0-1)
 *                         example: 0.85
 *                 summary:
 *                   type: object
 *                   description: Overall budget recommendation summary
 *                   properties:
 *                     currentTotalBudget:
 *                       type: number
 *                       description: Current total spending across all categories
 *                       example: 1500.0
 *                     recommendedTotalBudget:
 *                       type: number
 *                       description: Recommended total budget
 *                       example: 1350.0
 *                     potentialSavings:
 *                       type: number
 *                       description: Total potential monthly savings
 *                       example: 150.0
 *                     savingsPercentage:
 *                       type: number
 *                       description: Percentage savings achievable
 *                       example: 10.0
 *                     achievabilityScore:
 *                       type: number
 *                       description: How achievable these recommendations are (0-1)
 *                       example: 0.78
 *                 methodology:
 *                   type: object
 *                   description: Information about the recommendation process
 *                   properties:
 *                     dataPointsAnalyzed:
 *                       type: integer
 *                       description: Number of transactions analyzed
 *                     analysisWindow:
 *                       type: string
 *                       description: Time window used for analysis
 *                     adjustmentFactors:
 *                       type: array
 *                       description: Factors considered in recommendations
 *                       items:
 *                         type: string
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       description: When these recommendations were computed
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Insufficient data for recommendations
 *       500:
 *         description: Internal server error
 */
router.get('/budget-recommendations', authenticate, asyncHandler(advisorController.getBudgetRecommendations));

// =============================================================================
// ROUTE EXPORT
// =============================================================================

export default router;
