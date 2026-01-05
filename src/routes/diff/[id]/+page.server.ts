import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, url }) => {
	const { id } = params;
	const token = url.searchParams.get('token');

	try {
		const [document] = await db
			.select()
			.from(schema.diffDocuments)
			.where(eq(schema.diffDocuments.shortId, id))
			.limit(1);

		if (!document) {
			throw error(404, 'Diff not found');
		}

		// Check if expired
		if (document.expiresAt && document.expiresAt < new Date()) {
			throw error(410, 'Diff has expired');
		}

		// Check access for private diffs
		if (document.isPrivate && document.accessToken !== token) {
			throw error(403, 'Access denied. This is a private diff.');
		}

		// Increment view count
		await db
			.update(schema.diffDocuments)
			.set({
				viewCount: sql`${schema.diffDocuments.viewCount} + 1`
			})
			.where(eq(schema.diffDocuments.shortId, id));

		return {
			diff: {
				id: document.id,
				shortId: document.shortId,
				textA: document.textA,
				textB: document.textB,
				createdAt: document.createdAt,
				expiresAt: document.expiresAt,
				viewCount: document.viewCount + 1
			}
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to load diff:', err);
		throw error(500, 'Failed to load diff');
	}
};
