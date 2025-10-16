import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GEMINI_MODEL } from './constants';
import {
	VisualQuery,
	ReportParameter,
	SchemaData,
} from './query-builder-types';
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

interface ConvertSqlToReportResponse {
	query_config: VisualQuery;
	parameters: Omit<ReportParameter, 'id' | 'report_id'>[];
}

export async function convertSqlToReport(
	sql: string,
	schemaData: SchemaData
): Promise<ConvertSqlToReportResponse> {
	const genAI = getGeminiAI();

	// Build comprehensive schema information string
	const schemaInfo = schemaToString(schemaData.schema);

	const prompt = `You are a SQL to VisualQuery converter. Given a SQL query and database schema, convert it to a VisualQuery structure.

Database Schema:
${schemaInfo}

SQL Query to Convert:
${sql}

Instructions:
1. Parse the SQL query and extract:
   - Tables used (from FROM and JOIN clauses)
   - Selected columns (from SELECT clause)
   - Join conditions (from JOIN clauses)
   - WHERE conditions
   - GROUP BY clauses
   - ORDER BY clauses
   - LIMIT clause
   - DISTINCT keyword

2. Identify which WHERE conditions should become parameters (user inputs):
   - Conditions with literal values (e.g., = 'value', > 100) should be parameters
   - Use the column's data type to determine the parameter type:
     * 'dropdown' for single value selections
     * 'multiselect' for IN/NOT IN with multiple values
     * 'date' for date comparisons
     * 'daterange' for BETWEEN with dates
     * 'text' for string/text columns
     * 'number' for numeric columns
   - Generate user-friendly labels from column names (e.g., "Order Date" from "order_date")

3. For each table in the FROM/JOIN clauses:
   - Extract the table name and create an alias if not present
   - List all columns selected from that table
   - Include any custom expressions or calculated fields

4. For joins:
   - Identify join type (INNER, LEFT, RIGHT, FULL)
   - Extract join conditions with proper operators

5. Return the VisualQuery structure with:
   - distinct: boolean (true if SELECT DISTINCT is used)
   - tables: array of TableBlock objects with selected columns
   - joins: array of JoinBlock objects
   - conditions: array of WhereCondition objects (with parameters marked)
   - groupBy: array of GroupByClause objects
   - orderBy: array of OrderByClause objects
   - limit: number or undefined

6. Return parameters array with:
   - field: column name in format "tableName.columnName"
   - label: user-friendly label
   - type: parameter type ('dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number')
   - options_source: optional, can be null
   - default_value: the literal value from the SQL query
   - required: boolean (default false)

Important:
- Use proper table aliases from the SQL query
- Preserve column names exactly as they appear in the schema
- For aggregate functions, include them in the column selection with the aggregateFunction field
- Ensure all IDs are unique strings
- For conditions that should be parameters, keep the operator but set the value to the literal from SQL`;

	const model = genAI.getGenerativeModel({
		model: GEMINI_MODEL,
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: {
				type: SchemaType.OBJECT,
				properties: {
					query_config: {
						type: SchemaType.OBJECT,
						properties: {
							distinct: { type: SchemaType.BOOLEAN },
							tables: {
								type: SchemaType.ARRAY,
								items: {
									type: SchemaType.OBJECT,
									properties: {
										id: { type: SchemaType.STRING },
										tableName: { type: SchemaType.STRING },
										alias: { type: SchemaType.STRING },
										selectedColumns: {
											type: SchemaType.ARRAY,
											items: {
												type: SchemaType.OBJECT,
												properties: {
													tableName: {
														type: SchemaType.STRING,
													},
													columnName: {
														type: SchemaType.STRING,
													},
													alias: {
														type: SchemaType.STRING,
													},
													aggregateFunction: {
														type: SchemaType.STRING,
													},
												},
												required: [
													'tableName',
													'columnName',
												],
											},
										},
										customExpressions: {
											type: SchemaType.ARRAY,
											items: {
												type: SchemaType.OBJECT,
												properties: {
													id: {
														type: SchemaType.STRING,
													},
													expression: {
														type: SchemaType.STRING,
													},
													alias: {
														type: SchemaType.STRING,
													},
												},
												required: ['id', 'expression'],
											},
										},
										allColumns: {
											type: SchemaType.ARRAY,
											items: { type: SchemaType.STRING },
										},
									},
									required: ['id', 'tableName', 'alias'],
								},
							},
							joins: {
								type: SchemaType.ARRAY,
								items: {
									type: SchemaType.OBJECT,
									properties: {
										id: { type: SchemaType.STRING },
										joinType: { type: SchemaType.STRING },
										leftTable: { type: SchemaType.STRING },
										rightTable: { type: SchemaType.STRING },
										conditions: {
											type: SchemaType.ARRAY,
											items: {
												type: SchemaType.OBJECT,
												properties: {
													id: {
														type: SchemaType.STRING,
													},
													leftColumn: {
														type: SchemaType.STRING,
													},
													operator: {
														type: SchemaType.STRING,
													},
													rightColumn: {
														type: SchemaType.STRING,
													},
													logicOperator: {
														type: SchemaType.STRING,
													},
												},
												required: [
													'id',
													'leftColumn',
													'operator',
													'rightColumn',
												],
											},
										},
									},
									required: [
										'id',
										'joinType',
										'leftTable',
										'rightTable',
									],
								},
							},
							conditions: {
								type: SchemaType.ARRAY,
								items: {
									type: SchemaType.OBJECT,
									properties: {
										id: { type: SchemaType.STRING },
										column: { type: SchemaType.STRING },
										operator: { type: SchemaType.STRING },
										value: { type: SchemaType.STRING },
										logicOperator: {
											type: SchemaType.STRING,
										},
										groupStart: {
											type: SchemaType.BOOLEAN,
										},
										groupEnd: {
											type: SchemaType.BOOLEAN,
										},
									},
									required: ['id', 'column', 'operator'],
								},
							},
							groupBy: {
								type: SchemaType.ARRAY,
								items: {
									type: SchemaType.OBJECT,
									properties: {
										column: { type: SchemaType.STRING },
									},
									required: ['column'],
								},
							},
							orderBy: {
								type: SchemaType.ARRAY,
								items: {
									type: SchemaType.OBJECT,
									properties: {
										id: { type: SchemaType.STRING },
										column: { type: SchemaType.STRING },
										direction: { type: SchemaType.STRING },
									},
									required: ['id', 'column', 'direction'],
								},
							},
							limit: { type: SchemaType.NUMBER },
						},
						required: [
							'distinct',
							'tables',
							'joins',
							'conditions',
							'groupBy',
							'orderBy',
						],
					},
					parameters: {
						type: SchemaType.ARRAY,
						items: {
							type: SchemaType.OBJECT,
							properties: {
								field: { type: SchemaType.STRING },
								label: { type: SchemaType.STRING },
								type: { type: SchemaType.STRING },
								options_source: { type: SchemaType.STRING },
								default_value: { type: SchemaType.STRING },
								required: { type: SchemaType.BOOLEAN },
							},
							required: ['field', 'label', 'type', 'required'],
						},
					},
				},
				required: ['query_config', 'parameters'],
			},
		},
	});

	try {
		const result = await model.generateContent(prompt);
		const response = JSON.parse(result.response.text());

		// Validate the response structure
		if (!response.query_config || !response.parameters) {
			throw new Error('Invalid response structure from Gemini');
		}

		return response;
	} catch (error) {
		console.error('Gemini API error:', error);
		throw new Error(
			`Failed to convert SQL to report: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}
