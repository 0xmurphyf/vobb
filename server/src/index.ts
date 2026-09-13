import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import pino from 'pino';

import {
  authRoutes,
  playerRoutes,
  characterRoutes,
  formationRoutes,
  gachaRoutes,
  battleRoutes,
  stageRoutes,
} from './routes/routes';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

const app = Fastify({
  logger,
});

// Plugins
await app.register(cors, {
  origin: process.env.CLIENT_ORIGINS?.split(',') || '*',
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  sign: { expiresIn: '15m' },
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

// Routes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(playerRoutes, { prefix: '/api/player' });
await app.register(characterRoutes, { prefix: '/api/characters' });
await app.register(formationRoutes, { prefix: '/api/formations' });
await app.register(gachaRoutes, { prefix: '/api/gacha' });
await app.register(battleRoutes, { prefix: '/api/battle' });
await app.register(stageRoutes, { prefix: '/api/stages' });

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    logger.error(err);
    process.exit(1);
  }
  logger.info(`vobb-server listening on ${HOST}:${PORT}`);
});

export { app };
