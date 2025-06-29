import { ParsedMessage } from '../models/message';
import prisma from '../prisma/client';
import { CategoryType } from '@prisma/client';

export interface CategorizationResult {
  categoryId: number | null;
  categoryName: string | null;
  confidence: number;
  reason: string;
  suggestions: CategorySuggestion[];
}

export interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidence: number;
  reason: string;
}

export class SmartCategorizationService {
  private static instance: SmartCategorizationService;

  private constructor() {}

  static getInstance(): SmartCategorizationService {
    if (!SmartCategorizationService.instance) {
      SmartCategorizationService.instance = new SmartCategorizationService();
    }
    return SmartCategorizationService.instance;
  }

  /**
   * Main categorization method that combines all learning algorithms
   */
  async categorizeTransaction(
    userId: number,
    parsedMessage: ParsedMessage
  ): Promise<CategorizationResult> {
    const { merchant, amount, type, source } = parsedMessage;
    
    if (!merchant || !amount) {
      return this.createEmptyResult();
    }

    const messageType = this.getMessageType(source, type);
    const normalizedMerchant = this.normalizeMerchantName(merchant);

    // Get all possible category suggestions with confidence scores
    const suggestions = await Promise.all([
      this.getExactMerchantMatch(userId, normalizedMerchant, messageType),
      this.getCliqPatternMatch(userId, normalizedMerchant, type, amount),
      this.getCategoryPatternMatch(userId, messageType, amount),
      this.getKeywordMatch(userId, merchant, type),
      this.getAmountPatternMatch(userId, amount, type),
      this.getTimePatternMatch(userId, messageType)
    ]);

    // Combine and weight the suggestions
    const weightedSuggestions = this.combineAndWeightSuggestions(suggestions.flat());
    
    // Determine the best category
    const bestMatch = weightedSuggestions[0];
    const confidence = bestMatch?.confidence || 0;

    return {
      categoryId: confidence > 0.5 ? bestMatch.categoryId : null,
      categoryName: confidence > 0.5 ? bestMatch.categoryName : null,
      confidence,
      reason: bestMatch?.reason || 'No strong pattern found',
      suggestions: weightedSuggestions.slice(0, 5) // Top 5 suggestions
    };
  }

  /**
   * Learn from user categorization decision
   */
  async learnFromUserDecision(
    userId: number,
    parsedMessage: ParsedMessage,
    categoryId: number,
    wasCorrection: boolean = false
  ): Promise<void> {
    const { merchant, amount, type, source, timestamp } = parsedMessage;
    
    if (!merchant) return;

    const messageType = this.getMessageType(source, type);
    const normalizedMerchant = this.normalizeMerchantName(merchant);

    // Record the categorization history
    await prisma.userCategorizationHistory.create({
      data: {
        userId,
        merchant,
        amount,
        categoryId,
        messageType,
        confidence: wasCorrection ? 0.0 : 1.0,
        wasCorrect: !wasCorrection,
        timestamp: new Date(timestamp)
      }
    });

    // Update or create merchant learning
    await this.updateMerchantLearning(userId, normalizedMerchant, categoryId, messageType, amount);

    // Update category patterns
    await this.updateCategoryPatterns(userId, categoryId, messageType, amount);

    // Update CLIQ patterns if applicable
    if (source === 'CliQ') {
      await this.updateCliqPatterns(userId, normalizedMerchant, categoryId, type, amount);
    }
  }

  /**
   * Get exact merchant match from learning history
   */
  private async getExactMerchantMatch(
    userId: number,
    normalizedMerchant: string,
    messageType: string
  ): Promise<CategorySuggestion[]> {
    const matches = await prisma.merchantLearning.findMany({
      where: {
        userId,
        normalizedName: normalizedMerchant,
        messageType
      },
      include: { category: true },
      orderBy: { confidence: 'desc' }
    });

    return matches.map(match => ({
      categoryId: match.categoryId,
      categoryName: match.category.name,
      confidence: Math.min(match.confidence * 0.9, 0.95), // Cap at 95%
      reason: `Exact merchant match (used ${match.useCount} times)`
    }));
  }

  /**
   * Get CLIQ-specific pattern matches
   */
  private async getCliqPatternMatch(
    userId: number,
    normalizedSender: string,
    transactionType: string,
    amount: number
  ): Promise<CategorySuggestion[]> {
    const patterns = await prisma.cliqPattern.findMany({
      where: {
        userId,
        normalizedSender,
        transactionType
      },
      include: { category: true },
      orderBy: { confidence: 'desc' }
    });

    return patterns.map(pattern => {
      let confidence = pattern.confidence * 0.85; // Base CLIQ confidence

      // Adjust confidence based on amount similarity
      if (pattern.averageAmount) {
        const amountDiff = Math.abs(amount - pattern.averageAmount) / pattern.averageAmount;
        const amountConfidence = Math.max(0, 1 - amountDiff);
        confidence *= (0.7 + 0.3 * amountConfidence);
      }

      // Boost confidence for recurring patterns
      if (pattern.isRecurring) {
        confidence *= 1.1;
      }

      return {
        categoryId: pattern.categoryId,
        categoryName: pattern.category.name,
        confidence: Math.min(confidence, 0.9),
        reason: `CLIQ pattern match${pattern.isRecurring ? ' (recurring)' : ''}`
      };
    });
  }

  /**
   * Get category pattern matches based on amount and timing
   */
  private async getCategoryPatternMatch(
    userId: number,
    messageType: string,
    amount: number
  ): Promise<CategorySuggestion[]> {
    const patterns = await prisma.categoryPattern.findMany({
      where: { userId, messageType },
      include: { category: true }
    });

    const suggestions: CategorySuggestion[] = [];

    for (const pattern of patterns) {
      const typicalAmounts = pattern.typicalAmounts as any;
      let confidence = 0;

      if (typicalAmounts?.ranges) {
        for (const range of typicalAmounts.ranges) {
          if (amount >= range.min && amount <= range.max) {
            confidence = Math.max(confidence, range.frequency * 0.6);
          }
        }
      }

      if (confidence > 0.3) {
        suggestions.push({
          categoryId: pattern.categoryId,
          categoryName: pattern.category.name,
          confidence,
          reason: 'Amount pattern match'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get keyword-based matches (enhanced version of current system)
   */
  private async getKeywordMatch(
    userId: number,
    merchant: string,
    type: string
  ): Promise<CategorySuggestion[]> {
    const categories = await prisma.category.findMany({
      where: {
        userId,
        type: type.toUpperCase() as CategoryType
      }
    });

    const suggestions: CategorySuggestion[] = [];
    const merchantLower = merchant.toLowerCase();

    for (const category of categories) {
      if (category.keywords) {
        const keywords = category.keywords.toLowerCase().split(',').map(k => k.trim());
        let matchCount = 0;

        for (const keyword of keywords) {
          if (merchantLower.includes(keyword)) {
            matchCount++;
          }
        }

        if (matchCount > 0) {
          const confidence = Math.min(matchCount / keywords.length * 0.5, 0.7);
          suggestions.push({
            categoryId: category.id,
            categoryName: category.name,
            confidence,
            reason: `Keyword match (${matchCount}/${keywords.length})`
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Get amount pattern matches across categories
   */
  private async getAmountPatternMatch(
    userId: number,
    amount: number,
    type: string
  ): Promise<CategorySuggestion[]> {
    // Get historical amounts for each category
    const history = await prisma.userCategorizationHistory.findMany({
      where: { userId },
      include: { category: true }
    });

    const categoryAmounts: { [categoryId: number]: number[] } = {};
    
    history.forEach(record => {
      if (!categoryAmounts[record.categoryId]) {
        categoryAmounts[record.categoryId] = [];
      }
      categoryAmounts[record.categoryId].push(record.amount);
    });

    const suggestions: CategorySuggestion[] = [];

    Object.entries(categoryAmounts).forEach(([categoryId, amounts]) => {
      if (amounts.length < 3) return; // Need at least 3 data points

      const avg = amounts.reduce((a, b) => a + b) / amounts.length;
      const variance = amounts.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      // Check if current amount fits the pattern
      const zScore = Math.abs(amount - avg) / (stdDev || 1);
      
      if (zScore < 1.5) { // Within 1.5 standard deviations
        const confidence = Math.max(0, (1.5 - zScore) / 1.5 * 0.4);
        const category = history.find(h => h.categoryId === parseInt(categoryId))?.category;
        
        if (category && confidence > 0.2) {
          suggestions.push({
            categoryId: parseInt(categoryId),
            categoryName: category.name,
            confidence,
            reason: 'Amount pattern similarity'
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Get time-based pattern matches
   */
  private async getTimePatternMatch(
    userId: number,
    messageType: string
  ): Promise<CategorySuggestion[]> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    // This would analyze historical timing patterns
    // For now, return empty array but structure is in place
    return [];
  }

  /**
   * Combine suggestions from different algorithms and apply weights
   */
  private combineAndWeightSuggestions(
    suggestions: CategorySuggestion[]
  ): CategorySuggestion[] {
    const categoryMap = new Map<number, CategorySuggestion>();

    suggestions.forEach(suggestion => {
      const existing = categoryMap.get(suggestion.categoryId);
      
      if (existing) {
        // Combine confidences using weighted average
        const totalConfidence = existing.confidence + suggestion.confidence;
        const weightedConfidence = Math.min(totalConfidence * 0.8, 0.95);
        
        categoryMap.set(suggestion.categoryId, {
          ...existing,
          confidence: weightedConfidence,
          reason: `${existing.reason} + ${suggestion.reason}`
        });
      } else {
        categoryMap.set(suggestion.categoryId, suggestion);
      }
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Update merchant learning patterns
   */
  private async updateMerchantLearning(
    userId: number,
    normalizedMerchant: string,
    categoryId: number,
    messageType: string,
    amount: number
  ): Promise<void> {
    const existing = await prisma.merchantLearning.findUnique({
      where: {
        userId_merchant_categoryId_messageType: {
          userId,
          merchant: normalizedMerchant,
          categoryId,
          messageType
        }
      }
    });

    if (existing) {
      // Update existing pattern
      const newUseCount = existing.useCount + 1;
      const newAverage = ((existing.averageAmount || 0) * existing.useCount + amount) / newUseCount;
      
      await prisma.merchantLearning.update({
        where: { id: existing.id },
        data: {
          useCount: newUseCount,
          confidence: Math.min(existing.confidence * 1.1, 0.95),
          averageAmount: newAverage,
          lastUsed: new Date()
        }
      });
    } else {
      // Create new pattern
      await prisma.merchantLearning.create({
        data: {
          userId,
          merchant: normalizedMerchant,
          normalizedName: normalizedMerchant,
          categoryId,
          messageType,
          confidence: 0.7,
          averageAmount: amount,
          useCount: 1
        }
      });
    }
  }

  /**
   * Update category patterns
   */
  private async updateCategoryPatterns(
    userId: number,
    categoryId: number,
    messageType: string,
    amount: number
  ): Promise<void> {
    const existing = await prisma.categoryPattern.findUnique({
      where: {
        userId_categoryId_messageType: {
          userId,
          categoryId,
          messageType
        }
      }
    });

    if (existing) {
      // Update amount ranges
      const typicalAmounts = existing.typicalAmounts as any || { ranges: [] };
      
      // Simple range updating logic - could be enhanced
      let rangeUpdated = false;
      for (const range of typicalAmounts.ranges) {
        if (amount >= range.min * 0.8 && amount <= range.max * 1.2) {
          range.min = Math.min(range.min, amount);
          range.max = Math.max(range.max, amount);
          range.frequency = Math.min(range.frequency + 0.1, 1.0);
          rangeUpdated = true;
          break;
        }
      }

      if (!rangeUpdated) {
        typicalAmounts.ranges.push({
          min: amount * 0.9,
          max: amount * 1.1,
          frequency: 0.5
        });
      }

      await prisma.categoryPattern.update({
        where: { id: existing.id },
        data: {
          typicalAmounts,
          transactionCount: existing.transactionCount + 1,
          lastUpdated: new Date()
        }
      });
    } else {
      // Create new pattern
      await prisma.categoryPattern.create({
        data: {
          userId,
          categoryId,
          messageType,
          typicalAmounts: {
            ranges: [{
              min: amount * 0.9,
              max: amount * 1.1,
              frequency: 0.5
            }]
          },
          timePatterns: {}, // Initialize empty
          keywordPatterns: {}, // Initialize empty
          transactionCount: 1
        }
      });
    }
  }

  /**
   * Update CLIQ-specific patterns
   */
  private async updateCliqPatterns(
    userId: number,
    normalizedSender: string,
    categoryId: number,
    transactionType: string,
    amount: number
  ): Promise<void> {
    const existing = await prisma.cliqPattern.findUnique({
      where: {
        userId_normalizedSender_transactionType: {
          userId,
          normalizedSender,
          transactionType
        }
      }
    });

    if (existing) {
      // Update existing CLIQ pattern
      const newUseCount = existing.useCount + 1;
      const newAverage = (existing.averageAmount * existing.useCount + amount) / newUseCount;
      const variance = Math.pow(amount - existing.averageAmount, 2);
      
      await prisma.cliqPattern.update({
        where: { id: existing.id },
        data: {
          categoryId, // Update category in case user changed it
          useCount: newUseCount,
          averageAmount: newAverage,
          amountVariance: variance,
          confidence: Math.min(existing.confidence * 1.05, 0.9),
          lastSeen: new Date(),
          isRecurring: newUseCount >= 3, // Mark as recurring after 3 uses
        }
      });
    } else {
      // Create new CLIQ pattern
      const isBusinessLike = this.detectBusinessName(normalizedSender);
      
      await prisma.cliqPattern.create({
        data: {
          userId,
          senderName: normalizedSender,
          normalizedSender,
          categoryId,
          transactionType,
          averageAmount: amount,
          confidence: 0.6,
          isBusinessLike
        }
      });
    }
  }

  /**
   * Utility methods
   */
  private normalizeMerchantName(merchant: string): string {
    return merchant
      .toLowerCase()
      .replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '') // Keep only letters and Arabic
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getMessageType(source: string | null | undefined, type: string): string {
    if (source === 'CliQ') {
      return type === 'income' ? 'cliq_incoming' : 'cliq_outgoing';
    }
    return type === 'income' ? 'bank_credit' : 'bank_debit';
  }

  private detectBusinessName(name: string): boolean {
    const businessKeywords = [
      'company', 'corp', 'ltd', 'llc', 'inc', 'شركة', 'مؤسسة', 'معهد',
      'bank', 'مصرف', 'بنك', 'store', 'shop', 'متجر', 'محل'
    ];
    
    const nameLower = name.toLowerCase();
    return businessKeywords.some(keyword => nameLower.includes(keyword));
  }

  private createEmptyResult(): CategorizationResult {
    return {
      categoryId: null,
      categoryName: null,
      confidence: 0,
      reason: 'Insufficient data for categorization',
      suggestions: []
    };
  }
}

export const smartCategorizationService = SmartCategorizationService.getInstance();
