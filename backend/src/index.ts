import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db, schema } from './db/index.js';
import { eq, lt, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register CORS
await fastify.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Create a new diff
fastify.post<{
  Body: {
    textA: string;
    textB: string;
    ttlDays?: number;
    isPrivate?: boolean;
  };
}>('/api/diff', async (request, reply) => {
  const { textA, textB, ttlDays = 7, isPrivate = false } = request.body;

  // Validation
  if (!textA || !textB) {
    return reply.code(400).send({ error: 'textA and textB are required' });
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
  if (textA.length > MAX_SIZE || textB.length > MAX_SIZE) {
    return reply.code(400).send({ error: 'Text size exceeds 5MB limit' });
  }

  // Generate short ID
  const shortId = nanoid(10);

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  // Generate access token for private diffs
  const accessToken = isPrivate ? nanoid(32) : null;

  try {
    const [document] = await db
      .insert(schema.diffDocuments)
      .values({
        shortId,
        textA,
        textB,
        textASize: textA.length,
        textBSize: textB.length,
        ttlDays,
        expiresAt,
        isPrivate,
        accessToken,
      })
      .returning();

    const url = `/diff/${shortId}`;
    const fullUrl = isPrivate ? `${url}?token=${accessToken}` : url;

    return {
      id: document.id,
      shortId: document.shortId,
      url: fullUrl,
      expiresAt: document.expiresAt,
      isPrivate: document.isPrivate,
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: 'Failed to create diff' });
  }
});

// Get a diff by short ID
fastify.get<{
  Params: { id: string };
  Querystring: { token?: string };
}>('/api/diff/:id', async (request, reply) => {
  const { id } = request.params;
  const { token } = request.query;

  try {
    const [document] = await db
      .select()
      .from(schema.diffDocuments)
      .where(eq(schema.diffDocuments.shortId, id))
      .limit(1);

    if (!document) {
      return reply.code(404).send({ error: 'Diff not found' });
    }

    // Check if expired
    if (document.expiresAt && document.expiresAt < new Date()) {
      return reply.code(410).send({ error: 'Diff has expired' });
    }

    // Check access for private diffs
    if (document.isPrivate && document.accessToken !== token) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Increment view count
    await db
      .update(schema.diffDocuments)
      .set({
        viewCount: sql`${schema.diffDocuments.viewCount} + 1`,
      })
      .where(eq(schema.diffDocuments.shortId, id));

    return {
      id: document.id,
      shortId: document.shortId,
      textA: document.textA,
      textB: document.textB,
      textASize: document.textASize,
      textBSize: document.textBSize,
      createdAt: document.createdAt,
      expiresAt: document.expiresAt,
      viewCount: document.viewCount + 1,
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: 'Failed to retrieve diff' });
  }
});

// Cleanup expired diffs (can be called by a cron job)
fastify.post('/api/cleanup', async (request, reply) => {
  try {
    const result = await db
      .delete(schema.diffDocuments)
      .where(lt(schema.diffDocuments.expiresAt, new Date()))
      .returning();

    return {
      deleted: result.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: 'Cleanup failed' });
  }
});

// Stats endpoint
fastify.get('/api/stats', async () => {
  try {
    const [stats] = await db
      .select({
        totalDiffs: sql<number>`count(*)::int`,
        totalViews: sql<number>`sum(${schema.diffDocuments.viewCount})::int`,
        avgSize: sql<number>`avg((${schema.diffDocuments.textASize} + ${schema.diffDocuments.textBSize}))::int`,
      })
      .from(schema.diffDocuments);

    return stats;
  } catch (error) {
    fastify.log.error(error);
    return { totalDiffs: 0, totalViews: 0, avgSize: 0 };
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
