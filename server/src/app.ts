import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { healthHandler, type HealthStats } from './health.js';

/** Express app: security headers, /healthz, static client bundle, SPA fallback. */
export function buildApp(getStats: () => HealthStats): Express {
  const app = express();
  app.disable('x-powered-by');
  // Behind Render's proxy: use forwarded client IPs and protocol.
  app.set('trust proxy', true);

  const connectSrc = config.isProd ? ["'self'", 'wss:'] : ["'self'", 'wss:', 'ws:'];
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          // React sets inline style attributes for measured sizes.
          styleSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc,
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      strictTransportSecurity: config.isProd,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Registered before static files and the SPA fallback (FR-036).
  app.get('/healthz', healthHandler(getStats));

  const indexHtml = path.join(config.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(
      '/assets',
      express.static(path.join(config.clientDist, 'assets'), { immutable: true, maxAge: '1y', index: false }),
    );
    app.use(express.static(config.clientDist, { index: false, maxAge: 0 }));
    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/socket.io/')) {
        next();
        return;
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  } else {
    app.use((_req, res) => {
      res.status(404).type('text/plain').send('Client bundle not built. Run: npm run build');
    });
  }
  return app;
}
