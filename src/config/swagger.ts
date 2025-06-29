import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Expense Tracker API',
      version: '1.0.0',
      description: 'Automated SMS-based expense tracker with enhanced security features',
      contact: {
        name: 'Osama Nuserat',
        email: 'osamanuserat3@gmail.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://expense-tracker-q432.onrender.com/api',
        description: 'Production server (Render)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            emailVerified: { type: 'boolean', example: false },
            lastLoginAt: { type: 'string', format: 'date-time', example: '2025-06-29T08:30:00Z' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Food & Dining' },
            keywords: { type: 'string', example: 'restaurant,food,cafe,dining' },
            type: { type: 'string', enum: ['EXPENSE', 'INCOME'], example: 'EXPENSE' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 123 },
            content: { type: 'string', example: 'CLIQ: You received 100.00 JOD from Ahmad Ali' },
            createdAt: { type: 'string', format: 'date-time' },
            parsedData: { type: 'object', nullable: true }
          }
        },
        ParsedData: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['EXPENSE', 'INCOME'] },
            amount: { type: 'number', format: 'float', example: 100.00 },
            merchant: { type: 'string', example: 'Ahmad Ali' },
            category: { type: 'string', example: 'Transfer' },
            source: { type: 'string', example: 'CLIQ' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 456 },
            amount: { type: 'number', format: 'float', example: 100.00 },
            categoryId: { type: 'integer', example: 5 },
            merchant: { type: 'string', example: 'Ahmad Ali' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        SurvivalBudget: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            amount: { type: 'number', format: 'float', example: 1000.00 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            spentAmount: { type: 'number', format: 'float', example: 320.75 },
            remainingAmount: { type: 'number', format: 'float', example: 679.25 },
            percentageUsed: { type: 'number', format: 'float', example: 32.08 },
            daysRemaining: { type: 'integer', example: 18 },
            dailyBudgetRemaining: { type: 'number', format: 'float', example: 37.74 },
            status: { type: 'string', enum: ['on_track', 'over_budget', 'critical'], example: 'on_track' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
            code: { type: 'string', example: 'ERROR_CODE' },
            details: { type: 'object' }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { 
              type: 'string', 
              example: 'Password validation failed: Password must contain at least one uppercase letter'
            }
          }
        },
        RateLimitError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Too many requests, please try again later.' },
            retryAfter: { type: 'integer', example: 60 }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Messages',
        description: 'SMS message parsing and management'
      },
      {
        name: 'Categories',
        description: 'Expense and income category management'
      },
      {
        name: 'Summary',
        description: 'Analytics and summary reports'
      },
      {
        name: 'Survival Budget',
        description: 'Budget tracking and management'
      },
      {
        name: 'Notifications',
        description: 'Push notification management'
      },
      {
        name: 'Health',
        description: 'API health check'
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
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
  
  console.log('📚 Swagger UI available at http://localhost:3000/api-docs');
  console.log('📄 Swagger JSON available at http://localhost:3000/api-docs.json');
};

export default specs;
