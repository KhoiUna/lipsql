import { NextRequest, NextResponse } from 'next/server';
import { getReportsByFolder } from '@/lib/reports-db';
import { verifyAuthentication } from '@/app/api/api-utils';

// GET - Get all reports in a folder
export async function GET(
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

		const reports = getReportsByFolder(folderId);

		return NextResponse.json({
			success: true,
			reports,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Get folder reports API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch reports',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
