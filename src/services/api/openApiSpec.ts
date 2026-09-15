export const OPEN_API_SPECIFICATION = {
  openapi: '3.0.3',
  info: {
    title: 'Dayli.ai Climate Health Copilot Shared REST API',
    version: '1.0.0',
    description:
      'Universal REST API backend powering the Dayli.ai Website, Meta WhatsApp Business Cloud API, and Developer Simulator.',
    contact: {
      name: 'Dayli.ai Engineering Team',
      url: 'https://dayli.ai',
    },
  },
  servers: [
    { url: 'http://localhost:3000/api', description: 'Local Development Server' },
    { url: 'https://dayli.ai/api', description: 'Production API Gateway' },
  ],
  paths: {
    '/chat/message': {
      post: {
        summary: 'Universal Chat Message Execution',
        description: 'Processes incoming text query from Web, WhatsApp, or Simulator through AI Orchestration and Clinical Safety rules.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['session_id', 'message', 'channel'],
                properties: {
                  session_id: { type: 'string', example: 'sess_98421' },
                  message: { type: 'string', example: 'What should I drink in 42°C heat in 2nd trimester?' },
                  channel: { type: 'string', enum: ['web', 'whatsapp', 'simulator'], example: 'web' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Successful Response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                        intent: { type: 'string' },
                        risk_level: { type: 'string' },
                        actions: { type: 'array', items: { type: 'string' } },
                        referral: { type: 'object', nullable: true },
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
    '/climate': {
      get: {
        summary: 'Get Normalized Climate Intelligence',
        parameters: [
          { name: 'locationName', in: 'query', schema: { type: 'string' } },
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lon', in: 'query', schema: { type: 'number' } },
        ],
        responses: { 200: { description: 'Normalized Climate Data & Risk Scores' } },
      },
    },
    '/dashboard/summary': {
      get: {
        summary: 'Get Web Dashboard Overview Summary',
        responses: { 200: { description: 'Aggregated user, climate, hydration & referral status' } },
      },
    },
    '/health': {
      get: {
        summary: 'System Health Check',
        responses: { 200: { description: 'Health status of all backend engines' } },
      },
    },
  },
};
