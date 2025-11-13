import { NextRequest, NextResponse } from 'next/server';
import {
	getReportById,
	getReportParameters,
	updateReport,
	updateReportQuery,
	deleteReport,
} from '@/lib/reports-db';
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

// PUT - Update report
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

		const reportId = parseInt((await params).id);

		if (isNaN(reportId)) {
			return NextResponse.json(
				{ error: 'Invalid report ID' },
				{ status: 400 }
			);
		}

		// Check if report exists
		const report = getReportById(reportId);
		if (!report) {
			return NextResponse.json(
				{ error: 'Report not found' },
				{ status: 404 }
			);
		}

		const { name, description, query_config, parameters } =
			await request.json();

		// Validate input
		if (
			name !== undefined &&
			(typeof name !== 'string' || name.trim().length === 0)
		) {
			return NextResponse.json(
				{ error: 'Report name must be a non-empty string' },
				{ status: 400 }
			);
		}

		// If query_config and parameters are provided, update the entire query
		if (query_config !== undefined && parameters !== undefined) {
			// Add report_id to each parameter
			const parametersWithReportId = parameters.map((param: any) => ({
				...param,
				report_id: reportId,
			}));

			updateReportQuery(reportId, query_config, parametersWithReportId);

			return NextResponse.json({
				success: true,
				message: 'Report query updated successfully',
				timestamp: new Date().toISOString(),
			});
		}

		// Otherwise, just update name/description
		updateReport(reportId, {
			name: name?.trim(),
			description: description?.trim(),
		});

		return NextResponse.json({
			success: true,
			message: 'Report updated successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Update report API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to update report',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete report
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

		const reportId = parseInt((await params).id);

		if (isNaN(reportId)) {
			return NextResponse.json(
				{ error: 'Invalid report ID' },
				{ status: 400 }
			);
		}

		// Check if report exists
		const report = getReportById(reportId);
		if (!report) {
			return NextResponse.json(
				{ error: 'Report not found' },
				{ status: 404 }
			);
		}

		// Delete the report
		deleteReport(reportId);

		return NextResponse.json({
			success: true,
			message: 'Report deleted successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Delete report API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to delete report',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
