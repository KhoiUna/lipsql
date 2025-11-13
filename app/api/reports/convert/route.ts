import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '../../api-utils';
import {
	getDatabaseSchema,
	getTableRelationships,
	getDatabaseName,
} from '@/lib/db-utils';
import { convertSqlToReport } from '@/lib/gemini-utils';

// POST - Convert SQL query to VisualQuery structure
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

		if (!process.env.DATABASE_TYPE) {
			return NextResponse.json(
				{ error: 'DATABASE_TYPE environment variable is required' },
				{ status: 500 }
			);
		}

		const { sql } = await request.json();

		// Validate input
		if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
			return NextResponse.json(
				{
					error: 'SQL query is required and must be a non-empty string',
				},
				{ status: 400 }
			);
		}

		// Fetch schema data
		const schema = await getDatabaseSchema();
		const relationships = await getTableRelationships();
		const databaseName = await getDatabaseName();

		const schemaData = {
			schema: {
				tables: schema.tables.map((table) => ({
					name: table.name,
					columns: table.columns.map((col) => ({
						column: col.column,
						type: col.type,
						nullable: col.nullable,
						default: col.default,
					})),
				})),
			},
			relationships,
			databaseType: process.env.DATABASE_TYPE,
			databaseName,
		};

		// Convert SQL to report structure using Gemini
		const result = await convertSqlToReport(sql, schemaData);

		return NextResponse.json({
			success: true,
			query_config: result.query_config,
			parameters: result.parameters,
		});
	} catch (error) {
		console.error('Convert SQL to report error:', error);

		// Check if it's a validation error (schema mismatch)
		const isValidationError =
			error instanceof Error &&
			error.message.includes('does not reference any tables');

		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to convert SQL to report',
			},
			{ status: isValidationError ? 400 : 500 }
		);
	}
}
