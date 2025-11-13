import { NextRequest, NextResponse } from 'next/server';
import { getFolders, createFolder } from '@/lib/reports-db';
import { verifyAuthentication } from '../api-utils';

// GET - Get all folders
export async function GET() {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const folders = getFolders();

		return NextResponse.json({
			success: true,
			folders,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Get folders API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch folders',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// POST - Create a new folder
export async function POST(request: NextRequest) {
	try {
		// Authentication check
		const authResult = await verifyAuthentication();
		if (!authResult.success) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: 401 }
			);
		}

		const { name, description } = await request.json();

		// Validate input
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return NextResponse.json(
				{
					error: 'Folder name is required and must be a non-empty string',
				},
				{ status: 400 }
			);
		}

		// Create the folder
		const folderId = createFolder({
			name: name.trim(),
			description: description?.trim() || undefined,
		});

		return NextResponse.json({
			success: true,
			folderId,
			message: 'Folder created successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Create folder API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to create folder',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
