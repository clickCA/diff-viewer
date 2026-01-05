import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Diff documents table
 * Stores the original and modified text along with metadata
 */
export const diffDocuments = pgTable('diff_documents', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Short ID for URLs (e.g., "3f9c2e91")
  shortId: text('short_id').notNull().unique(),

  // The actual text content
  textA: text('text_a').notNull(),
  textB: text('text_b').notNull(),

  // Metadata
  textASize: integer('text_a_size').notNull(),
  textBSize: integer('text_b_size').notNull(),

  // Optional: Store pre-computed diff for performance
  computedDiff: text('computed_diff'),

  // TTL and expiration
  ttlDays: integer('ttl_days').default(7),
  expiresAt: timestamp('expires_at'),

  // Optional: Private diff with access token
  isPrivate: boolean('is_private').default(false).notNull(),
  accessToken: text('access_token'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // Stats
  viewCount: integer('view_count').default(0).notNull(),
});

// Type exports for TypeScript
export type DiffDocument = typeof diffDocuments.$inferSelect;
export type NewDiffDocument = typeof diffDocuments.$inferInsert;
