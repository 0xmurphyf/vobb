import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

interface JwtPayload {
  userId: string;
  playerId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    playerId?: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.userId = decoded.userId;
    request.playerId = decoded.playerId;
  } catch (err) {
    reply.code(401).send({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.userId = decoded.userId;
    request.playerId = decoded.playerId;
  } catch {
    // Guest — no token required
  }
}
