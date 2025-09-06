import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '../../api-utils';
import { updateSavedQueryName, deleteSavedQuery } from '@/lib/history-db';

export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const id = parseInt(params.id);
		if (isNaN(id)) {
			return NextResponse.json(
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
			return NextResponse.json(
				{
					error: 'Saved name is required and must be a non-empty string',
				},
				{ status: 400 }
			);
		}

		// Update the query name
		updateSavedQueryName(id, savedName.trim());

		return NextResponse.json({
			success: true,
			message: 'Query name updated successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Update saved query API Error:', error);
		return NextResponse.json(
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
	{ params }: { params: { id: string } }
) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const id = parseInt(params.id);
		if (isNaN(id)) {
			return NextResponse.json(
				{ error: 'Invalid query ID' },
				{ status: 400 }
			);
		}

		// Delete the query
		deleteSavedQuery(id);

		return NextResponse.json({
			success: true,
			message: 'Query deleted successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Delete saved query API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to delete query',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
