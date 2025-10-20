import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GEMINI_MODEL } from './constants';
import { SchemaData } from './query-builder-types';
import { schemaToString } from './db-utils';

// Initialize Gemini AI
export function getGeminiAI(): GoogleGenerativeAI {
	const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
	if (!apiKey) {
		throw new Error(
			'GOOGLE_GENERATIVE_AI_API_KEY environment variable is required'
		);
	}
	return new GoogleGenerativeAI(apiKey);
}

export interface DetectedParameter {
	field: string;
	label: string;
	type: 'dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
	default_value: any;
	operator: string;
	position: {
		start: number;
		end: number;
	};
}

interface IdentifyParametersResponse {
	parameters: DetectedParameter[];
}

/**
 * Identify parameters in a SQL query using Gemini AI
 * Analyzes WHERE clauses and other conditions to detect parameterizable values
 */
export async function identifyParametersInSql(
	sql: string,
	schemaData: SchemaData
): Promise<DetectedParameter[]> {
	const genAI = getGeminiAI();

	// Build schema information string
	const schemaInfo = schemaToString(schemaData.schema);

	const prompt = `You are a SQL parameter analyzer. Given a SQL query and database schema, identify which literal values in WHERE clauses and other conditions should become user-editable parameters.

Database Schema:
${schemaInfo}

SQL Query to Analyze:
${sql}

Instructions:
1. Analyze the SQL query and identify WHERE clause conditions with literal values
2. For each condition, determine:
   - The column name (format: "tableName.columnName")
   - A user-friendly label (e.g., "Customer Name" from "customers.name")
   - The parameter type based on column data type and operator:
     * 'date' for date columns
     * 'daterange' for BETWEEN with dates
     * 'number' for numeric columns
     * 'text' for string/text columns
     * 'dropdown' for single value selections (use default_value as option)
     * 'multiselect' for IN/NOT IN with multiple values
   - The default value (the literal value from the SQL)
   - The operator (=, >, <, >=, <=, LIKE, IN, BETWEEN, etc.)
   - The position in the SQL (character start and end positions)

3. Return a JSON array of detected parameters

CRITICAL RULES:
- Only identify WHERE clause conditions with literal values
- Use the actual column names from the schema
- Generate user-friendly labels (title case, spaces)
- Return the exact literal value as default_value
- Include the operator for context
- Position should be character indices in the original SQL string`;

	const model = genAI.getGenerativeModel({
		model: GEMINI_MODEL,
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: {
				type: SchemaType.OBJECT,
				properties: {
					parameters: {
						type: SchemaType.ARRAY,
						items: {
							type: SchemaType.OBJECT,
							properties: {
								field: { type: SchemaType.STRING },
								label: { type: SchemaType.STRING },
								type: { type: SchemaType.STRING },
								default_value: { type: SchemaType.STRING },
								operator: { type: SchemaType.STRING },
								position: {
									type: SchemaType.OBJECT,
									properties: {
										start: { type: SchemaType.NUMBER },
										end: { type: SchemaType.NUMBER },
									},
									required: ['start', 'end'],
								},
							},
							required: [
								'field',
								'label',
								'type',
								'default_value',
								'operator',
							],
						},
					},
				},
				required: ['parameters'],
			},
		},
	});

	try {
		const result = await model.generateContent(prompt);
		const response = JSON.parse(
			result.response.text()
		) as IdentifyParametersResponse;

		// Validate the response structure
		if (!response.parameters || !Array.isArray(response.parameters)) {
			throw new Error('Invalid response structure from Gemini');
		}

		return response.parameters;
	} catch (error) {
		console.error('Gemini API error:', error);
		throw new Error(
			`Failed to identify parameters: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}
