import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '../../api-utils';
import {
	getDatabaseSchema,
	getTableRelationships,
	getDatabaseName,
} from '@/lib/db-utils';
import { getAllDropdowns } from '@/lib/dropdowns-db';
import { identifyParametersInSql } from '@/lib/gemini-utils';

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

		const { sql } = await request.json();

		// Validate input
		if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
			return NextResponse.json(
				{ error: 'SQL parameter is required and must be a string' },
				{ status: 400 }
			);
		}

		// Get schema data for context
		const schema = await getDatabaseSchema();
		const relationships = await getTableRelationships();
		const databaseName = await getDatabaseName();
		const databaseType = process.env.DATABASE_TYPE || 'postgres';

		const schemaData = {
			schema,
			relationships,
			databaseType,
			databaseName,
		};

		// Get available dropdowns
		const dropdowns = getAllDropdowns();

		// Identify parameters using Gemini
		console.log('Identifying parameters in SQL...');
		const result = await identifyParametersInSql(
			sql,
			schemaData,
			dropdowns
		);
		const parameters = result.parameters;
		const normalizedSql = result.normalizedSql;

		// Fix multiselect parsing
		const parsedParameters = parameters.map((param) => {
			if (
				param.type === 'multiselect' &&
				typeof param.default_value === 'string'
			) {
				// Parse "4, 5" into ["4", "5"]
				const values = param.default_value
					.split(',')
					.map((v: string) => v.trim())
					.filter((v: string) => v.length > 0);
				return { ...param, default_value: values };
			}
			return param;
		});

		return NextResponse.json({
			success: true,
			parameters: parsedParameters,
			normalizedSql: normalizedSql,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Identify Parameters API Error:', error);

		const errorMessage =
			error instanceof Error
				? error.message
				: 'An unknown error occurred';

		return NextResponse.json(
			{
				success: false,
				error: errorMessage,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// Handle unsupported methods
export async function GET() {
	return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
