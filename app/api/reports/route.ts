import { NextRequest, NextResponse } from 'next/server';
import { createReport, createReportParameter } from '@/lib/reports-db';
import { verifyAuthentication } from '../api-utils';

// POST - Create a new report with parameters
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

		const {
			folder_id,
			name,
			description,
			type,
			query_config,
			base_sql,
			default_visible_columns,
			parameters,
		} = await request.json();

		// Validate input
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return NextResponse.json(
				{
					error: 'Report name is required and must be a non-empty string',
				},
				{ status: 400 }
			);
		}

		if (!folder_id || typeof folder_id !== 'number') {
			return NextResponse.json(
				{ error: 'Folder ID is required and must be a number' },
				{ status: 400 }
			);
		}

		// Validate type
		const reportType = type || 'visual';
		if (reportType !== 'visual' && reportType !== 'ai') {
			return NextResponse.json(
				{ error: 'Type must be either "visual" or "ai"' },
				{ status: 400 }
			);
		}

		// Validate AI report requirements
		if (reportType === 'ai') {
			if (!base_sql || typeof base_sql !== 'string') {
				return NextResponse.json(
					{ error: 'base_sql is required for AI reports' },
					{ status: 400 }
				);
			}
		}

		if (!query_config || typeof query_config !== 'object') {
			return NextResponse.json(
				{ error: 'Query config is required and must be an object' },
				{ status: 400 }
			);
		}

		// Create the report
		const reportId = createReport({
			folder_id,
			name: name.trim(),
			description: description?.trim() || undefined,
			type: reportType,
			query_config,
			base_sql: reportType === 'ai' ? base_sql : undefined,
			default_visible_columns: default_visible_columns || [],
		});

		// Create parameters if provided
		if (parameters && Array.isArray(parameters)) {
			for (const param of parameters) {
				createReportParameter({
					report_id: reportId,
					field: param.field,
					label: param.label,
					type: param.type,
					options_source: param.options_source,
					default_value: param.default_value,
					required: param.required || false,
				});
			}
		}

		return NextResponse.json({
			success: true,
			reportId,
			message: 'Report created successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Create report API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to create report',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
