import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, url }) => {
	const { id } = params;
	const token = url.searchParams.get('token');

	try {
		const [document] = await db
			.select()
			.from(schema.diffDocuments)
			.where(eq(schema.diffDocuments.shortId, id))
			.limit(1);

		if (!document) {
			return json({ error: 'Diff not found' }, { status: 404 });
		}

		// Check if expired
		if (document.expiresAt && document.expiresAt < new Date()) {
			return json({ error: 'Diff has expired' }, { status: 410 });
		}

		// Check access for private diffs
		if (document.isPrivate && document.accessToken !== token) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Increment view count
		await db
			.update(schema.diffDocuments)
			.set({
				viewCount: sql`${schema.diffDocuments.viewCount} + 1`
			})
			.where(eq(schema.diffDocuments.shortId, id));

		return json({
			id: document.id,
			shortId: document.shortId,
			textA: document.textA,
			textB: document.textB,
			textASize: document.textASize,
			textBSize: document.textBSize,
			createdAt: document.createdAt,
			expiresAt: document.expiresAt,
			viewCount: document.viewCount + 1
		});
	} catch (error) {
		console.error('Failed to retrieve diff:', error);
		return json({ error: 'Failed to retrieve diff' }, { status: 500 });
	}
};
