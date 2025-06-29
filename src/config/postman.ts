import { Express } from 'express';
import specs from './swagger';

/**
 * Postman Collection Generator
 * Converts OpenAPI spec to Postman collection format
 */
export const setupPostmanExport = (app: Express): void => {
  app.get('/api-docs/postman', (req, res) => {
    try {
      const postmanCollection = generatePostmanCollection(specs);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="expense-tracker-api.postman_collection.json"');
      res.json(postmanCollection);
    } catch (error) {
      console.error('Error generating Postman collection:', error);
      res.status(500).json({ error: 'Failed to generate Postman collection' });
    }
  });

  console.log('📮 Postman collection available at http://localhost:3000/api-docs/postman');
};

function generatePostmanCollection(openApiSpec: any) {
  const collection = {
    info: {
      name: openApiSpec.info.title,
      description: openApiSpec.info.description,
      version: openApiSpec.info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{accessToken}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000/api',
        type: 'string'
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string'
      },
      {
        key: 'refreshToken',
        value: '',
        type: 'string'
      }
    ],
    item: [] as any[]
  };

  // Group endpoints by tags
  const groupedPaths: { [key: string]: any[] } = {};
  
  Object.entries(openApiSpec.paths || {}).forEach(([path, methods]: [string, any]) => {
    Object.entries(methods).forEach(([method, operation]: [string, any]) => {
      if (operation.tags && operation.tags.length > 0) {
        const tag = operation.tags[0];
        if (!groupedPaths[tag]) {
          groupedPaths[tag] = [];
        }
        groupedPaths[tag].push({
          path,
          method: method.toUpperCase(),
          operation
        });
      }
    });
  });

  // Convert to Postman folders and requests
  Object.entries(groupedPaths).forEach(([tag, endpoints]) => {
    const folder = {
      name: tag,
      description: `${tag} related endpoints`,
      item: endpoints.map(({ path, method, operation }) => {
        const request: any = {
          name: operation.summary || `${method} ${path}`,
          request: {
            method,
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            url: {
              raw: `{{baseUrl}}${path}`,
              host: ['{{baseUrl}}'],
              path: path.split('/').filter(Boolean)
            }
          }
        };

        // Add auth for protected endpoints
        if (operation.security && operation.security.length > 0) {
          request.request.auth = {
            type: 'bearer',
            bearer: [
              {
                key: 'token',
                value: '{{accessToken}}',
                type: 'string'
              }
            ]
          };
        }

        // Add request body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(method) && operation.requestBody) {
          const schema = operation.requestBody.content?.['application/json']?.schema;
          if (schema) {
            request.request.body = {
              mode: 'raw',
              raw: JSON.stringify(generateExampleFromSchema(schema, openApiSpec.components?.schemas), null, 2)
            };
          }
        }

        // Add query parameters
        if (operation.parameters) {
          const queryParams = operation.parameters
            .filter((param: any) => param.in === 'query')
            .map((param: any) => ({
              key: param.name,
              value: param.example || (param.schema?.example) || '',
              description: param.description,
              disabled: !param.required
            }));
          
          if (queryParams.length > 0) {
            request.request.url.query = queryParams;
          }
        }

        return request;
      })
    };

    collection.item.push(folder);
  });

  return collection;
}

function generateExampleFromSchema(schema: any, componentSchemas: any = {}): any {
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/components/schemas/', '');
    const refSchema = componentSchemas[refPath];
    if (refSchema) {
      return generateExampleFromSchema(refSchema, componentSchemas);
    }
  }

  if (schema.example !== undefined) {
    return schema.example;
  }

  switch (schema.type) {
    case 'object':
      const obj: any = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, propSchema]: [string, any]) => {
          obj[key] = generateExampleFromSchema(propSchema, componentSchemas);
        });
      }
      return obj;
    
    case 'array':
      if (schema.items) {
        return [generateExampleFromSchema(schema.items, componentSchemas)];
      }
      return [];
    
    case 'string':
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.enum) return schema.enum[0];
      return 'string';
    
    case 'number':
    case 'integer':
      return 0;
    
    case 'boolean':
      return true;
    
    default:
      return null;
  }
}

export default setupPostmanExport;
