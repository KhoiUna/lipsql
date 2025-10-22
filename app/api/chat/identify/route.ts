import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '../../api-utils';
import { identifyParametersInSql } from '@/lib/gemini-chat-utils';
import {
	getDatabaseSchema,
	getTableRelationships,
	getDatabaseName,
} from '@/lib/db-utils';
import { getAllDropdowns } from '@/lib/dropdowns-db';
import { saveChatParameters, getCurrentChatSession } from '@/lib/chat-db';

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
		const parameters = await identifyParametersInSql(
			sql,
			schemaData,
			dropdowns
		);

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

		// Get current session and save parameters
		const session = getCurrentChatSession();
		if (session) {
			// Convert to chat parameter format
			const chatParameters = parsedParameters.map((param) => ({
				session_id: session.id,
				field: param.field,
				label: param.label,
				type: param.type,
				default_value: param.default_value,
				enabled: true,
				dropdown_id: param.suggested_dropdown_ids?.[0] || undefined,
			}));

			saveChatParameters(session.id, chatParameters);
		}

		return NextResponse.json({
			success: true,
			parameters: parsedParameters,
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
