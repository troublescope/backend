export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Streaming TMA Backend API',
    version: '1.0.0',
    description: 'API documentation for the Telegram Mini App Streaming Platform',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          telegram_id: { type: 'number' },
          username: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          photo_url: { type: 'string' },
          plan: { type: 'string', enum: ['free', 'vip'] },
        },
      },
      Subscription: {
        type: 'object',
        properties: {
          plan: { type: 'string', enum: ['free', 'vip'] },
          status: { type: 'string', enum: ['active', 'inactive', 'expired'] },
          started_at: { type: 'string', format: 'date-time' },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/telegram': {
      post: {
        summary: 'Authenticate with Telegram',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  initDataRaw: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/users/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    subscription: { $ref: '#/components/schemas/Subscription' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/watch/check': {
      post: {
        summary: 'Check episode access',
        tags: ['Watch'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  series_id: { type: 'string' },
                  episode: { type: 'number' },
                  total_episodes: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Access status returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    allowed: { type: 'boolean' },
                    reason: { type: 'string' },
                    free_limit: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/watch/save': {
      post: {
        summary: 'Save watch progress',
        tags: ['Watch'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  series_id: { type: 'string' },
                  episode: { type: 'number' },
                  progress: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Progress saved' },
        },
      },
    },
    '/favorites': {
      get: {
        summary: 'Get all favorites',
        tags: ['Favorites'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of favorites' },
        },
      },
      post: {
        summary: 'Add to favorites',
        tags: ['Favorites'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content_id: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Added to favorites' },
        },
      },
    },
    '/config': {
      get: {
        summary: 'Get system config',
        tags: ['Config'],
        responses: {
          200: { description: 'Configuration object' },
        },
      },
    },
  },
};