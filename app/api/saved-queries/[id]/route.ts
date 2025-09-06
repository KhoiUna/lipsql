import type { NextRequest } from 'next/server';
import { verifyAuthentication } from '../../api-utils';
import { updateSavedQueryName, deleteSavedQuery } from '@/lib/history-db';

export async function PUT(
	request: NextRequest,
	ctx: RouteContext<'/api/saved-queries/[id]'>
) {
	try {
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return Response.json({ error: authResult.error }, { status: 401 });
		}

		const { id } = await ctx.params;
		if (!id) {
			return Response.json(
				{ error: 'Invalid query ID' },
				{ status: 400 }
			);
		}

		const { savedName } = await request.json();

		// Validate input
		if (
			!savedName ||
			typeof savedName !== 'string' ||
			savedName.trim().length === 0
		) {
			return Response.json(
				{
					error: 'Saved name is required and must be a non-empty string',
				},
				{ status: 400 }
			);
		}

		// Update the query name
		updateSavedQueryName(id, savedName.trim());

		return Response.json({
			success: true,
			message: 'Query name updated successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Update saved query API Error:', error);
		return Response.json(
			{
				success: false,
				error: 'Failed to update query name',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete saved query
export async function DELETE(
	request: NextRequest,
	ctx: RouteContext<'/api/saved-queries/[id]'>
) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return Response.json({ error: authResult.error }, { status: 401 });
		}

		const { id } = await ctx.params;
		if (!id) {
			return Response.json(
				{ error: 'Invalid query ID' },
				{ status: 400 }
			);
		}

		deleteSavedQuery(id);

		return Response.json({
			success: true,
			message: 'Query deleted successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Delete saved query API Error:', error);
		return Response.json(
			{
				success: false,
				error: 'Failed to delete query',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
