import { Express } from 'express';

/**
 * Safe Swagger Setup - Handles missing dependencies gracefully
 */
export const setupSwagger = (app: Express): void => {
  try {
    // Try to load Swagger dependencies
    const swaggerJsdoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');
    
    // If we get here, dependencies are available
    const specs = require('./swagger').default;
    
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Expense Tracker API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 3,
        docExpansion: 'list',
        filter: true
      }
    }));
    
    // Raw JSON endpoint
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });
    
    console.log('📚 Swagger UI available at /api-docs');
    console.log('📄 Swagger JSON available at /api-docs.json');
    
  } catch (error) {
    console.warn('⚠️ Swagger dependencies not available, skipping documentation setup');
    console.warn('This is normal in production environments without dev dependencies');
    
    // Provide a fallback endpoint
    app.get('/api-docs', (req, res) => {
      res.json({
        message: 'API Documentation not available',
        note: 'Swagger dependencies are not installed in this environment',
        endpoints: {
          'Authentication': '/api/auth/*',
          'Categories': '/api/categories',
          'Messages': '/api/messages/*',
          'Summary': '/api/summary',
          'Budget': '/api/budget/survival',
          'Notifications': '/api/notifications/*',
          'Health': '/health'
        }
      });
    });
    
    app.get('/api-docs.json', (req, res) => {
      res.status(503).json({
        error: 'OpenAPI specification not available',
        reason: 'Swagger dependencies not installed'
      });
    });
  }
};

export default { setupSwagger };
