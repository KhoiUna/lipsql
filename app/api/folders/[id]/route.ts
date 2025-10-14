import { NextRequest, NextResponse } from 'next/server';
import { updateFolder, deleteFolder, getFolderById } from '@/lib/reports-db';
import { verifyAuthentication } from '@/app/api/api-utils';

// PUT - Update folder
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
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

		const folderId = parseInt((await params).id);

		if (isNaN(folderId)) {
			return NextResponse.json(
				{ error: 'Invalid folder ID' },
				{ status: 400 }
			);
		}

		// Check if folder exists
		const folder = getFolderById(folderId);
		if (!folder) {
			return NextResponse.json(
				{ error: 'Folder not found' },
				{ status: 404 }
			);
		}

		const { name, description } = await request.json();

		// Validate input
		if (
			name !== undefined &&
			(typeof name !== 'string' || name.trim().length === 0)
		) {
			return NextResponse.json(
				{ error: 'Folder name must be a non-empty string' },
				{ status: 400 }
			);
		}

		// Update the folder
		updateFolder(folderId, {
			name: name?.trim(),
			description: description?.trim(),
		});

		return NextResponse.json({
			success: true,
			message: 'Folder updated successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Update folder API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to update folder',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete folder (cascade to reports)
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
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

		const folderId = parseInt((await params).id);

		if (isNaN(folderId)) {
			return NextResponse.json(
				{ error: 'Invalid folder ID' },
				{ status: 400 }
			);
		}

		// Check if folder exists
		const folder = getFolderById(folderId);
		if (!folder) {
			return NextResponse.json(
				{ error: 'Folder not found' },
				{ status: 404 }
			);
		}

		// Delete the folder (CASCADE will delete all reports)
		deleteFolder(folderId);

		return NextResponse.json({
			success: true,
			message: 'Folder deleted successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Delete folder API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to delete folder',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
