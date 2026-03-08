export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Streaming TMA Backend API',
    version: '1.0.0',
    description: 'API documentation for the Telegram Mini App Streaming Platform',
  },
  servers: [
    {
      url: 'https://tmaback.vercel.app',
      description: 'Production server (Vercel)',
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
          user_id: { type: 'string' },
          plan: { type: 'string', enum: ['free', 'vip'] },
          status: { type: 'string', enum: ['active', 'inactive', 'expired'] },
          started_at: { type: 'string', format: 'date-time' },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user_id: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
          provider: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Drama: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          cover: { type: 'string' },
          chapters: { type: 'number' },
          description: { type: 'string' },
          playCount: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          rank: { type: 'string' },
          episode_1_url: { type: 'string', description: 'Direct URL to episode 1 video (if requested with video=true)' },
        },
      },
      WatchHistory: {
        type: 'object',
        properties: {
          series_id: { type: 'string' },
          episode: { type: 'number' },
          progress: { type: 'number' },
          watched_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/': {
      get: {
        summary: 'Root check',
        tags: ['System'],
        responses: {
          200: {
            description: 'Status check',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: {
          200: {
            description: 'Health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    region: { type: 'string' },
                    node_env: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
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
    '/users/stats': {
      get: {
        summary: 'Get user watch statistics',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User stats and recent history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stats: {
                      type: 'object',
                      properties: {
                        total_episodes: { type: 'number' },
                        total_series: { type: 'number' },
                        total_favorites: { type: 'number' },
                        plan: { type: 'string' },
                      },
                    },
                    recent: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          series_id: { type: 'string' },
                          episode: { type: 'number' },
                          progress: { type: 'number' },
                          watched_at: { type: 'string', format: 'date-time' },
                          title: { type: 'string' },
                          cover: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/subscription': {
      get: {
        summary: 'Get current user subscription',
        tags: ['Subscription'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Subscription info returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Subscription' },
              },
            },
          },
        },
      },
    },
    '/subscription/upgrade': {
      post: {
        summary: 'Upgrade subscription plan',
        tags: ['Subscription'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  plan_type: { 
                    type: 'string', 
                    enum: ['weekly', 'monthly', 'yearly'],
                    default: 'monthly'
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Upgrade successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    subscription: { $ref: '#/components/schemas/Subscription' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/payments': {
      get: {
        summary: 'Get user payment history',
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of payments',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Payment' },
                },
              },
            },
          },
        },
      },
    },
    '/payments/create': {
      post: {
        summary: 'Create a new payment record',
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'number' },
                  currency: { type: 'string', default: 'USD' },
                  provider: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Payment created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Payment' },
              },
            },
          },
        },
      },
    },
    '/watch/home': {
      get: {
        summary: 'Get homepage content',
        tags: ['Watch'],
        parameters: [
          { name: 'lang', in: 'query', schema: { type: 'string', default: 'in' } }
        ],
        responses: {
          200: { description: 'Homepage data' },
        },
      },
    },
    '/watch/foryou': {
      get: {
        summary: 'Get For You recommendations',
        tags: ['Watch'],
        parameters: [
          { name: 'lang', in: 'query', schema: { type: 'string', default: 'in' } },
          { name: 'page', in: 'query', schema: { type: 'number', default: 1 } },
          { name: 'video', in: 'query', schema: { type: 'boolean', default: false }, description: 'Include episode_1_url for top 5 items' }
        ],
        responses: {
          200: { 
            description: 'List of dramas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Drama' } }
                  }
                }
              }
            }
          },
        },
      },
    },
    '/watch/trending': {
      get: {
        summary: 'Get trending dramas',
        tags: ['Watch'],
        parameters: [
          { name: 'lang', in: 'query', schema: { type: 'string', default: 'in' } }
        ],
        responses: {
          200: { description: 'List of dramas' },
        },
      },
    },
    '/watch/newest': {
      get: {
        summary: 'Get newest dramas',
        tags: ['Watch'],
        parameters: [
          { name: 'lang', in: 'query', schema: { type: 'string', default: 'in' } }
        ],
        responses: {
          200: { description: 'List of dramas' },
        },
      },
    },
    '/watch/vip': {
      get: {
        summary: 'Get VIP content',
        tags: ['Watch'],
        parameters: [
          { name: 'lang', in: 'query', schema: { type: 'string', default: 'in' } }
        ],
        responses: {
          200: { description: 'VIP content data' },
        },
      },
    },
    '/watch/search': {
      get: {
        summary: 'Search series',
        tags: ['Watch'],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'number', default: 1 } },
          { name: 'lang', in: 'query', schema: { type: 'string', default: 'in' } }
        ],
        responses: {
          200: { 
            description: 'Search results',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Drama' } }
              }
            }
          },
        },
      },
    },
    '/watch/detail/{id}': {
      get: {
        summary: 'Get series detail',
        tags: ['Watch'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'lang', in: 'query', schema: { type: 'string', default: 'in' } }
        ],
        responses: {
          200: { description: 'Series detail data' },
        },
      },
    },
    '/watch/episodes/{id}': {
      get: {
        summary: 'Get episode list',
        tags: ['Watch'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'lang', in: 'query', schema: { type: 'string', default: 'in' } }
        ],
        responses: {
          200: { description: 'Episode list' },
        },
      },
    },
    '/watch/stream/{id}/{episode}': {
      get: {
        summary: 'Get streaming link',
        tags: ['Watch'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'episode', in: 'path', required: true, schema: { type: 'number' } },
          { name: 'lang', in: 'query', schema: { type: 'string', default: 'in' } }
        ],
        responses: {
          200: { description: 'Streaming data' },
          403: { description: 'VIP required' },
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
    '/watch/history': {
      get: {
        summary: 'Get watch history',
        tags: ['Watch'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Watch history list',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/WatchHistory' },
                },
              },
            },
          },
        },
      },
    },
    '/favorites/toggle': {
      post: {
        summary: 'Toggle favorite',
        tags: ['Favorites'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  series_id: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { 
            description: 'Toggle status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    favorited: { type: 'boolean' }
                  }
                }
              }
            }
          },
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
