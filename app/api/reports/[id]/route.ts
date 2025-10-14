import { NextRequest, NextResponse } from 'next/server';
import { getReportById, getReportParameters } from '@/lib/reports-db';
import { verifyAuthentication } from '@/app/api/api-utils';

// GET - Get a specific report with its parameters
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

		const reportId = parseInt((await params).id);

		if (isNaN(reportId)) {
			return NextResponse.json(
				{ error: 'Invalid report ID' },
				{ status: 400 }
			);
		}

		const report = getReportById(reportId);

		if (!report) {
			return NextResponse.json(
				{ error: 'Report not found' },
				{ status: 404 }
			);
		}

		const parameters = getReportParameters(reportId);

		return NextResponse.json({
			success: true,
			report,
			parameters,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Get report API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch report',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
