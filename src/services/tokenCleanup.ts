import prisma from '../prisma/client';

export class TokenCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;

  static startCleanup() {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);

    // Run initial cleanup
    this.cleanupExpiredTokens();
  }

  static stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  static async cleanupExpiredTokens() {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      if (result.count > 0) {
        console.log(`Cleaned up ${result.count} expired refresh tokens`);
      }
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }

  static async cleanupUserTokens(userId: number) {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: { userId }
      });

      console.log(`Cleaned up ${result.count} tokens for user ${userId}`);
    } catch (error) {
      console.error(`Error cleaning up tokens for user ${userId}:`, error);
    }
  }
}
