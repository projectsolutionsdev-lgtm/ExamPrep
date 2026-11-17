import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/api.ts';
import { connectToMongoDB, getDBStatus } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isBackendOnly = process.env.BACKEND_ONLY === 'true' || process.env.RENDER === 'true';

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  'https://exam-prep-dev-4319-f847.vercel.app',
  ...configuredOrigins
]);

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints for Render & Cloud Run container lifecycle probes
app.get(['/health', '/_health', '/api/health'], (_req, res) => {
  res.status(200).send('OK');
});

// Mount MongoDB Atlas API routes
app.use('/api', apiRouter);

// Fallback for unmatched API routes to ensure JSON 404 response
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Initialize MongoDB Atlas connection
connectToMongoDB().catch((err) => {
  console.warn('Initial MongoDB connection warning:', err?.message || err);
});

const mountApiOnlyRoot = () => {
  app.get('/', async (_req, res) => {
    await connectToMongoDB();
    res.json({
      service: 'ExamPrep & Current Affairs Backend API',
      status: 'ok',
      mode: 'backend-only',
      database: getDBStatus(),
      endpoints: [
        '/api/status',
        '/api/health',
        '/api/bootstrap',
        '/api/questions',
        '/api/current-affairs',
        '/api/mock-tests',
        '/api/test-attempts',
        '/api/user-profile',
        '/api/bookmarks',
        '/api/analytics'
      ]
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Backend API route not found. Use /api/*' });
  });
};

// Mount Vite middleware in development, serve static dist when full-stack, or stay API-only on Render
async function setupServer() {
  const distPath = path.join(__dirname, 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(indexHtmlPath);

  if (isBackendOnly) {
    mountApiOnlyRoot();
  } else if (hasDist) {
    app.use(express.static(distPath, { maxAge: '1h', etag: true }));
    app.get('*', (_req, res) => {
      res.sendFile(indexHtmlPath);
    });
  } else if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite middleware initialization notice:', e);
      mountApiOnlyRoot();
    }
  } else {
    mountApiOnlyRoot();
  }

  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (${isBackendOnly ? 'backend-only API mode' : 'full-stack mode'})`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received: shutting down gracefully');
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received: shutting down gracefully');
    server.close(() => {
      process.exit(0);
    });
  });
}

setupServer();
