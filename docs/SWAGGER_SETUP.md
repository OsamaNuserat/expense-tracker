# Swagger/OpenAPI Documentation Setup

## Overview
The Expense Tracker API includes comprehensive OpenAPI 3.0 documentation powered by Swagger UI. This provides an interactive interface for testing API endpoints and viewing detailed documentation.

## Access Points

### 🌐 Interactive Documentation
- **URL**: http://localhost:3000/api-docs
- **Features**:
  - Interactive API testing
  - Request/response examples
  - Schema definitions
  - Authentication testing
  - Parameter validation

### 📄 JSON Schema
- **URL**: http://localhost:3000/api-docs.json
- **Use Cases**:
  - Import into Postman
  - Generate client SDKs
  - API testing automation
  - External documentation tools

## Key Features

### 🔐 Security Testing
- JWT Bearer token authentication
- Token persistence across browser sessions
- Authorization testing for protected endpoints
- Rate limiting visualization

### 📊 Comprehensive Schemas
- User management models
- Message parsing structures
- Category and transaction definitions
- Survival budget tracking
- Error response formats

### 🎯 Interactive Testing
- Try out API calls directly from the browser
- Real-time request/response validation
- Parameter auto-completion
- Response schema validation

## Configuration

### Swagger Options
```typescript
swaggerOptions: {
  persistAuthorization: true,    // Remember JWT tokens
  displayRequestDuration: true,  // Show response times
  defaultModelsExpandDepth: 3,   // Schema detail level
  defaultModelExpandDepth: 3,    // Model expansion
  docExpansion: 'list',         // Default view mode
  filter: true                  // Enable search filtering
}
```

### Security Schemes
- **Bearer Authentication**: JWT tokens for protected endpoints
- **Rate Limiting**: Documented limits for different endpoint groups
- **CORS Configuration**: Allowed origins and credentials

## Using with Development Tools

### Postman Integration
1. Open Postman
2. Import from URL: `http://localhost:3000/api-docs.json`
3. Postman will auto-generate a complete collection
4. Set up environment variables for base URL and tokens

### SDK Generation
Use OpenAPI generators to create client SDKs:
```bash
# Example: Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/api-docs.json \
  -g typescript-axios \
  -o ./generated-client
```

### Testing Integration
```javascript
// Example: Using with Jest or similar
const swaggerSpec = await fetch('http://localhost:3000/api-docs.json')
  .then(res => res.json());

// Validate API responses against OpenAPI schema
```

## Adding New Endpoints

### 1. Route Documentation
Add JSDoc comments to route files:
```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     summary: Endpoint description
 *     tags: [YourTag]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/YourSchema'
 *     responses:
 *       200:
 *         description: Success response
 */
```

### 2. Schema Definitions
Add to `swagger.ts` schemas section:
```typescript
YourSchema: {
  type: 'object',
  properties: {
    field: { type: 'string', example: 'value' }
  }
}
```

### 3. Tags and Organization
Update tags array for proper grouping:
```typescript
{
  name: 'Your Feature',
  description: 'Feature description'
}
```

## Best Practices

### ✅ Do:
- Include detailed examples for all fields
- Document all possible error responses
- Use meaningful descriptions
- Group related endpoints with tags
- Include request/response schemas

### ❌ Don't:
- Leave endpoints without documentation
- Use generic error messages
- Forget to document authentication requirements
- Skip parameter validation rules
- Omit response examples

## Troubleshooting

### Common Issues:
1. **Missing endpoints**: Check if files are included in `apis` path
2. **Schema errors**: Validate JSON schema syntax
3. **Authentication issues**: Verify JWT token format
4. **Loading problems**: Check server logs for Swagger initialization

### Debug Mode:
Enable verbose Swagger logging:
```typescript
const specs = swaggerJsdoc({
  ...options,
  swaggerDefinition: {
    ...options.definition,
    'x-debug': true
  }
});
```

## Future Enhancements

### Planned Features:
- [ ] API versioning support
- [ ] Request/response examples from real data
- [ ] Performance metrics integration
- [ ] Advanced security documentation
- [ ] Multi-environment configuration
- [ ] Custom themes and branding

### Integration Opportunities:
- CI/CD documentation validation
- Automated testing based on schemas
- Client SDK auto-generation
- API monitoring integration
- Documentation deployment automation
