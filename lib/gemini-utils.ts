import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GEMINI_MODEL } from './constants';
import {
	VisualQuery,
	ReportParameter,
	SchemaData,
	Dropdown,
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

// Helper function to validate SQL references schema tables
function validateSqlReferencesSchema(
	sql: string,
	schemaData: SchemaData
): void {
	const tableNames = schemaData.schema.tables.map((t) =>
		t.name.toLowerCase()
	);
	const sqlLower = sql.toLowerCase();

	// Check if SQL references any table from the schema
	const referencesSchema = tableNames.some((tableName) =>
		sqlLower.includes(tableName)
	);

	if (!referencesSchema)
		throw new Error(
			'SQL query does not reference any tables. Please ensure your query includes at least 1 table.'
		);
}

export async function convertSqlToReport(
	sql: string,
	schemaData: SchemaData
): Promise<ConvertSqlToReportResponse> {
	validateSqlReferencesSchema(sql, schemaData);

	const genAI = getGeminiAI();

	// Build comprehensive schema information string
	const schemaInfo = schemaToString(schemaData.schema);

	const prompt = `You are a SQL to VisualQuery converter. Given a SQL query and database schema, convert it to a VisualQuery structure.

Database Schema:
${schemaInfo}

SQL Query to Convert:
${sql}

Instructions:
0. VALIDATION: Ensure the SQL query references at least one table from the provided database schema. If it doesn't, this is an error.

1. Parse the SQL query and extract:
   - Tables used (from FROM and JOIN clauses) - MUST be from the provided schema
   - Selected columns (from SELECT clause) - PRESERVE EXACT COLUMN NAMES AND EXPRESSIONS
   - Join conditions (from JOIN clauses)
   - WHERE conditions
   - GROUP BY clauses
   - ORDER BY clauses
   - LIMIT/TOP clause
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
   - Extract the table name and use the ACTUAL table name (not alias) as tableName
   - Use the ACTUAL table name (not alias) as the alias field as well
   - List all columns selected from that table
   - Include any custom expressions or calculated fields in customExpressions array

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

CRITICAL RULES:
- DO NOT create table aliases - use the actual table name for both tableName and alias
- PRESERVE exact column names and expressions from the SQL query
- For custom expressions (like UPPER(email)), store them in customExpressions array with the exact SQL expression
- Do NOT modify or transform the SQL expressions
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
									required: [
										'id',
										'tableName',
										'alias',
										'selectedColumns',
										'customExpressions',
										'allColumns',
									],
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
	suggested_dropdown_ids?: number[]; // Array of matching dropdown IDs
}

interface IdentifyParametersResponse {
	parameters: DetectedParameter[];
	normalizedSql: string;
}

/**
 * Identify parameters in a SQL query using AI
 * Analyzes WHERE clauses and other conditions to detect parameterizable values
 */
export async function identifyParametersInSql(
	sql: string,
	schemaData: SchemaData,
	availableDropdowns: Dropdown[]
): Promise<IdentifyParametersResponse> {
	const genAI = getGeminiAI();

	// Build schema information string
	const schemaInfo = schemaToString(schemaData.schema);

	// Build dropdowns information string
	const dropdownsInfo =
		availableDropdowns.length > 0
			? availableDropdowns
					.map(
						(d) =>
							`${d.id}: ${d.name} - Options: ${d.options
								.map((o) => `${o.label} (${o.value})`)
								.join(', ')}`
					)
					.join('\n')
			: 'No dropdowns available';

	const prompt = `You are a SQL parameter analyzer. Given a SQL query, database schema, and available dropdowns, identify which literal values in WHERE clauses and other conditions should become user-editable parameters.

Database Schema:
${schemaInfo}

Available Dropdowns:
${dropdownsInfo}

SQL Query to Analyze:
${sql}

Instructions:
1. Analyze the SQL query and identify WHERE clause conditions with literal values
2. For each condition, determine:
   - The column name (format: "tableName.columnName") - use EXACT column names from schema
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
   - suggested_dropdown_ids: If parameter values match dropdown option VALUES, suggest those dropdown IDs

SPECIAL HANDLING FOR COMPLEX EXPRESSIONS:
- For DATEDIFF(DAY,table.column,GETDATE()) <= value: 
  * Field name should be "tableName.columnName" (e.g., "OEEH.INVOICEDT")
  * Label should be "Days Since Invoice Date" or similar
  * Type should be 'number'
  * Default value should be the literal number (e.g., 90)
  * Normalized SQL: DATEDIFF(DAY,OEEH.INVOICEDT,GETDATE()) <= :OEEH.INVOICEDT
- For other complex expressions, follow the same pattern: use the actual column name, not synthetic names

EXAMPLE:
Input: "AND DATEDIFF(DAY,H.INVOICEDT,GETDATE()) <= 90"
Field: "OEEH.INVOICEDT"
Label: "Days Since Invoice Date"
Type: "number"
Default: 90
Normalized SQL: "AND DATEDIFF(DAY,OEEH.INVOICEDT,GETDATE()) <= :OEEH.INVOICEDT"

3. ALSO create a normalized version of the SQL where:
   - Replace all table aliases with full table names from the schema
   - Replace literal values with parameter placeholders in format :tableName.columnName
   - For complex expressions like DATEDIFF(DAY,table.column,GETDATE()) <= value, replace ONLY the literal value with :tableName.columnName
   - Do NOT modify function calls, operators, or SQL syntax - only replace literal values
   - Keep the same logic but make it alias-free and parameterized

4. Return both the detected parameters AND the normalized SQL

CRITICAL RULES:
- Only identify WHERE clause conditions with literal values
- Use the actual column names from the schema (e.g., OEEH.INVOICEDT, not OEEH.invoicedt_days_ago)
- Generate user-friendly labels (title case, spaces)
- Return the exact literal value as default_value
- Include the operator for context
- Position should be character indices in the original SQL string
- For normalized SQL: use full table names and :tableName.columnName placeholders
- NEVER create synthetic field names - use only actual database column names
- For field names, use the exact column name from the schema (e.g., INVOICEDT, not invoicedt_days_ago)

DROPDOWN SUGGESTION RULES (be proactive!):
- Suggest dropdowns if ANY parameter value(s) match dropdown option VALUES (even partial matches)
- ALSO suggest dropdowns for columns that semantically fit categorical data:
  * Status codes (STATUSCD, STAGECD, STATUS, STATE, etc.)
  * Type codes (TYPE, TYPECODE, CATEGORY, CLASS, etc.)
  * Boolean/flag columns (ACTIVE, ENABLED, DELETED, etc.)
  * Small numeric ranges (likely enums/codes)
- For multiselect (IN operator), suggest if ANY values match OR if column name suggests categorical data
- Can suggest multiple dropdowns if multiple match
- Be generous with suggestions - users can ignore them if not needed`;

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
								suggested_dropdown_ids: {
									type: SchemaType.ARRAY,
									items: { type: SchemaType.NUMBER },
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
					normalizedSql: { type: SchemaType.STRING },
				},
				required: ['parameters', 'normalizedSql'],
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

		if (
			!response.normalizedSql ||
			typeof response.normalizedSql !== 'string'
		) {
			throw new Error('Invalid normalized SQL from Gemini');
		}

		return response;
	} catch (error) {
		console.error('Gemini API error:', error);
		throw new Error(
			`Failed to identify parameters: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}
