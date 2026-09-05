/**
 * @module RegistryServer
 * @description
 * Flint Community Plugin Registry API entry point.
 * Configured with permissive CORS for desktop and web applications,
 * real-time request logging, structured error handling, and libSQL initialization.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { initDatabase } from './db/database.js';
import { pluginRoutes } from './routes/plugins.js';

export const app = new Hono();

// Global CORS configuration allowing cross-origin calls from GitHub Pages and Tauri desktop applications
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['Content-Length', 'X-Total-Count'],
    maxAge: 86400,
  })
);

// Logging middleware for request observability
app.use('*', logger());

// Initialize database schema and pre-seed on first request or application boot
app.use('*', async (c, next) => {
  await initDatabase();
  await next();
});

// Root metadata endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Flint Community Plugin Registry API',
    version: '1.0.0',
    description: 'Serverless REST API providing discovery and distribution for Flint community extensions.',
    documentation: 'https://flintnotes.dev/docs/extensions',
    endpoints: {
      plugins: '/api/v1/plugins',
      pluginDetail: '/api/v1/plugins/:id',
      pluginDownload: '/api/v1/plugins/:id/download',
      publish: 'POST /api/v1/plugins/publish',
      health: '/health',
    },
  });
});

// Health check endpoint
app.get('/health', async (c) => {
  try {
    await initDatabase();
    return c.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    return c.json({ status: 'unhealthy', database: 'error', error: String(err) }, 500);
  }
});

// Mount plugin catalog routes
app.route('/api/v1/plugins', pluginRoutes);

// Global 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Endpoint ${c.req.method} ${c.req.path} does not exist.`,
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('[App Error]', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred.',
    },
    500
  );
});

// Start local Node.js server if running directly (non-worker / non-test environment)
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv[1] &&
  (process.argv[1].includes('index.ts') || process.argv[1].includes('index.js'));

if (isDirectRun || process.env.STANDALONE_SERVER === 'true') {
  const port = Number(process.env.PORT) || 3001;
  initDatabase()
    .then(() => {
      console.log(`[Flint Registry] Server listening on http://localhost:${port}`);
      serve({
        fetch: app.fetch,
        port,
      });
    })
    .catch((err) => {
      console.error('[Flint Registry] Failed to boot database:', err);
    });
}

export default app;
