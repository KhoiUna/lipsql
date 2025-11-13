import {
	VisualQuery,
	ValidationResult,
	ColumnSelection,
	CustomExpression,
	FunctionArgument,
	SchemaData,
} from './query-builder-types';

/**
 * SQL Dialect abstraction for database-specific syntax
 */
interface SqlDialect {
	escapeIdentifier(name: string): string;
	escapeValue(value: any): string;
	formatLimit(limit: number): string;
	formatSelectWithLimit(selectClause: string, limit?: number): string;
}

/**
 * PostgreSQL dialect
 */
class PostgresDialect implements SqlDialect {
	escapeIdentifier(identifier: string): string {
		return identifier;
	}

	escapeValue(value: any): string {
		if (value === null || value === undefined) {
			return 'NULL';
		}
		if (typeof value === 'number') {
			return value.toString();
		}
		return `'${String(value).replace(/'/g, "''")}'`;
	}

	formatLimit(limit: number): string {
		return `\nLIMIT ${limit}`;
	}

	formatSelectWithLimit(selectClause: string, limit?: number): string {
		return selectClause;
	}
}

/**
 * SQL Server dialect
 */
class SqlServerDialect implements SqlDialect {
	escapeIdentifier(identifier: string): string {
		return identifier;
	}

	escapeValue(value: any): string {
		if (value === null || value === undefined) {
			return 'NULL';
		}
		if (typeof value === 'number') {
			return value.toString();
		}
		return `'${String(value).replace(/'/g, "''")}'`;
	}

	formatLimit(limit: number): string {
		return ''; // SQL Server uses TOP in SELECT clause
	}

	formatSelectWithLimit(selectClause: string, limit?: number): string {
		if (limit && limit > 0) {
			// Handle DISTINCT - it must come before TOP
			if (selectClause.match(/^SELECT\s+DISTINCT/i)) {
				return selectClause.replace(
					/^SELECT\s+DISTINCT/i,
					`SELECT DISTINCT TOP ${limit}`
				);
			}
			return selectClause.replace(/^SELECT/i, `SELECT TOP ${limit}`);
		}
		return selectClause;
	}
}

/**
 * MySQL dialect
 */
class MySqlDialect implements SqlDialect {
	escapeIdentifier(identifier: string): string {
		return identifier;
	}

	escapeValue(value: any): string {
		if (value === null || value === undefined) {
			return 'NULL';
		}
		if (typeof value === 'number') {
			return value.toString();
		}
		return `'${String(value).replace(/'/g, "''")}'`;
	}

	formatLimit(limit: number): string {
		return `\nLIMIT ${limit}`;
	}

	formatSelectWithLimit(selectClause: string, limit?: number): string {
		return selectClause;
	}
}

/**
 * SQLite dialect
 */
class SqliteDialect implements SqlDialect {
	escapeIdentifier(identifier: string): string {
		return identifier;
	}

	escapeValue(value: any): string {
		if (value === null || value === undefined) {
			return 'NULL';
		}
		if (typeof value === 'number') {
			return value.toString();
		}
		return `'${String(value).replace(/'/g, "''")}'`;
	}

	formatLimit(limit: number): string {
		return `\nLIMIT ${limit}`;
	}

	formatSelectWithLimit(selectClause: string, limit?: number): string {
		return selectClause;
	}
}

/**
 * Function translator for database-specific SQL functions
 */
class FunctionTranslator {
	private databaseType: string;

	constructor(databaseType: string) {
		this.databaseType = (databaseType || 'postgres').toLowerCase();
	}

	translateConcat(args: FunctionArgument[], dialect: SqlDialect): string {
		const values = args.map((arg) => this.formatArgument(arg, dialect));

		switch (this.databaseType) {
			case 'sqlserver':
			case 'mssql':
				return `CONCAT(${values.join(', ')})`;
			case 'mysql':
				return `CONCAT(${values.join(', ')})`;
			case 'sqlite':
			case 'sqlite3':
				return values.join(' || ');
			case 'postgres':
			case 'postgresql':
			default:
				return `CONCAT(${values.join(', ')})`;
		}
	}

	translateCast(args: FunctionArgument[], dialect: SqlDialect): string {
		if (args.length < 2) return 'CAST(NULL AS TEXT)';

		const value = this.formatArgument(args[0], dialect);
		const targetType = args[1].value;

		switch (this.databaseType) {
			case 'sqlserver':
			case 'mssql':
				return `CAST(${value} AS ${targetType})`;
			case 'mysql':
				return `CAST(${value} AS ${targetType})`;
			case 'sqlite':
			case 'sqlite3':
				return `CAST(${value} AS ${targetType})`;
			case 'postgres':
			case 'postgresql':
			default:
				return `CAST(${value} AS ${targetType})`;
		}
	}

	translateFormat(args: FunctionArgument[], dialect: SqlDialect): string {
		if (args.length < 2) return "''";

		const value = this.formatArgument(args[0], dialect);
		const format = args[1].value;

		switch (this.databaseType) {
			case 'sqlserver':
			case 'mssql':
				return `FORMAT(${value}, ${dialect.escapeValue(format)})`;
			case 'mysql':
				return `DATE_FORMAT(${value}, ${dialect.escapeValue(format)})`;
			case 'sqlite':
			case 'sqlite3':
				return `strftime(${dialect.escapeValue(format)}, ${value})`;
			case 'postgres':
			case 'postgresql':
			default:
				return `TO_CHAR(${value}, ${dialect.escapeValue(format)})`;
		}
	}

	translateUpper(args: FunctionArgument[], dialect: SqlDialect): string {
		if (args.length === 0) return 'UPPER(NULL)';
		const value = this.formatArgument(args[0], dialect);
		return `UPPER(${value})`;
	}

	translateLower(args: FunctionArgument[], dialect: SqlDialect): string {
		if (args.length === 0) return 'LOWER(NULL)';
		const value = this.formatArgument(args[0], dialect);
		return `LOWER(${value})`;
	}

	translateSubstring(args: FunctionArgument[], dialect: SqlDialect): string {
		if (args.length < 3) return 'SUBSTRING(NULL, 1, 1)';

		const value = this.formatArgument(args[0], dialect);
		const start = this.formatArgument(args[1], dialect);
		const length = this.formatArgument(args[2], dialect);

		switch (this.databaseType) {
			case 'sqlserver':
			case 'mssql':
			case 'mysql':
			case 'sqlite':
			case 'sqlite3':
			case 'postgres':
			case 'postgresql':
			default:
				return `SUBSTRING(${value}, ${start}, ${length})`;
		}
	}

	translateCoalesce(args: FunctionArgument[], dialect: SqlDialect): string {
		if (args.length === 0) return 'COALESCE(NULL)';
		const values = args.map((arg) => this.formatArgument(arg, dialect));
		return `COALESCE(${values.join(', ')})`;
	}

	translateTrim(args: FunctionArgument[], dialect: SqlDialect): string {
		if (args.length === 0) return 'TRIM(NULL)';
		const value = this.formatArgument(args[0], dialect);
		return `TRIM(${value})`;
	}

	translateLength(args: FunctionArgument[], dialect: SqlDialect): string {
		if (args.length === 0) return 'LENGTH(NULL)';
		const value = this.formatArgument(args[0], dialect);

		switch (this.databaseType) {
			case 'sqlserver':
			case 'mssql':
				return `LEN(${value})`;
			default:
				return `LENGTH(${value})`;
		}
	}

	translateCase(args: FunctionArgument[], dialect: SqlDialect): string {
		// CASE statements are raw expressions, return as-is
		if (args.length > 0 && args[0].type === 'expression') {
			return args[0].value;
		}
		return 'CASE END';
	}

	translateCustomExpression(
		expr: CustomExpression,
		dialect: SqlDialect
	): string {
		if (!expr.function || expr.function === 'NONE') {
			// Raw SQL expression
			return expr.expression;
		}

		const args = expr.functionArgs || [];

		switch (expr.function) {
			case 'CONCAT':
				return this.translateConcat(args, dialect);
			case 'CAST':
				return this.translateCast(args, dialect);
			case 'FORMAT':
				return this.translateFormat(args, dialect);
			case 'UPPER':
				return this.translateUpper(args, dialect);
			case 'LOWER':
				return this.translateLower(args, dialect);
			case 'SUBSTRING':
				return this.translateSubstring(args, dialect);
			case 'COALESCE':
				return this.translateCoalesce(args, dialect);
			case 'TRIM':
				return this.translateTrim(args, dialect);
			case 'LENGTH':
				return this.translateLength(args, dialect);
			case 'CASE':
				return this.translateCase(args, dialect);
			default:
				return expr.expression;
		}
	}

	private formatArgument(arg: FunctionArgument, dialect: SqlDialect): string {
		switch (arg.type) {
			case 'column':
				// Column reference (already in table.column format)
				const parts = arg.value.split('.');
				if (parts.length === 2) {
					return `${dialect.escapeIdentifier(
						parts[0]
					)}.${dialect.escapeIdentifier(parts[1])}`;
				}
				return dialect.escapeIdentifier(arg.value);
			case 'literal':
				return dialect.escapeValue(arg.value);
			case 'expression':
				return arg.value; // Raw expression
			default:
				return dialect.escapeValue(arg.value);
		}
	}
}

/**
 * Get dialect instance based on database type
 */
function getDialect(databaseType: string): SqlDialect {
	const dbType = (databaseType || 'postgres').toLowerCase();

	switch (dbType) {
		case 'sqlserver':
		case 'mssql':
			return new SqlServerDialect();
		case 'mysql':
			return new MySqlDialect();
		case 'sqlite':
		case 'sqlite3':
			return new SqliteDialect();
		case 'postgres':
		case 'postgresql':
		default:
			return new PostgresDialect();
	}
}

/**
 * Escapes SQL identifiers (table names, column names)
 * @deprecated Use dialect.escapeIdentifier() instead
 */
function escapeIdentifier(identifier: string): string {
	// Remove any existing quotes and escape with double quotes
	return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Escapes SQL string values
 * @deprecated Use dialect.escapeValue() instead
 */
function escapeValue(value: any): string {
	if (value === null || value === undefined) {
		return 'NULL';
	}
	if (typeof value === 'number') {
		return value.toString();
	}
	// Escape single quotes by doubling them
	return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Formats a column with its aggregate function
 */
function formatColumnWithAggregate(
	col: ColumnSelection,
	tableName: string,
	dialect: SqlDialect
): string {
	const columnRef = `${dialect.escapeIdentifier(
		tableName
	)}.${dialect.escapeIdentifier(col.columnName)}`;

	if (col.aggregateFunction && col.aggregateFunction !== 'NONE') {
		const formatted = `${col.aggregateFunction}(${columnRef})`;
		return col.alias
			? `${formatted} AS ${dialect.escapeIdentifier(col.alias)}`
			: formatted;
	}

	return col.alias
		? `${columnRef} AS ${dialect.escapeIdentifier(col.alias)}`
		: columnRef;
}

/**
 * Builds the SELECT clause from table blocks
 */
function buildSelectClause(
	query: VisualQuery,
	dialect: SqlDialect,
	functionTranslator: FunctionTranslator
): string {
	const columns: string[] = [];

	for (const table of query.tables) {
		// Add regular columns
		for (const col of table.selectedColumns) {
			columns.push(
				formatColumnWithAggregate(col, table.tableName, dialect)
			);
		}

		// Add custom expressions
		for (const expr of table.customExpressions || []) {
			const translatedExpr = functionTranslator.translateCustomExpression(
				expr,
				dialect
			);
			if (expr.alias) {
				columns.push(
					`${translatedExpr} AS ${dialect.escapeIdentifier(
						`"${expr.alias}"`
					)}`
				);
			} else {
				columns.push(translatedExpr);
			}
		}
	}

	if (columns.length === 0) {
		// If no columns selected, select all from first table
		if (query.tables.length > 0) {
			const distinctKeyword = query.distinct ? 'DISTINCT ' : '';
			return `SELECT ${distinctKeyword}${dialect.escapeIdentifier(
				query.tables[0].tableName
			)}.*`;
		}
		return 'SELECT *';
	}

	const distinctKeyword = query.distinct ? 'DISTINCT ' : '';
	return `SELECT ${distinctKeyword}${columns.join(', ')}`;
}

/**
 * Builds the FROM clause
 */
function buildFromClause(query: VisualQuery, dialect: SqlDialect): string {
	if (query.tables.length === 0) {
		throw new Error('At least one table must be selected');
	}

	const firstTable = query.tables[0];
	return `FROM ${dialect.escapeIdentifier(firstTable.tableName)}`;
}

/**
 * Builds JOIN clauses with multiple conditions support
 */
function buildJoinClauses(query: VisualQuery, dialect: SqlDialect): string {
	if (query.joins.length === 0) {
		return '';
	}

	const joins: string[] = [];

	for (const join of query.joins) {
		// Find the table info for the right table
		const rightTable = query.tables.find(
			(t) => t.tableName === join.rightTable
		);
		if (!rightTable) {
			continue; // Skip invalid joins
		}

		if (!join.conditions || join.conditions.length === 0) {
			continue; // Skip joins without conditions
		}

		// Build ON clause with multiple conditions
		const conditions: string[] = [];
		for (let i = 0; i < join.conditions.length; i++) {
			const condition = join.conditions[i];
			const conditionStr = `${dialect.escapeIdentifier(
				join.leftTable
			)}.${dialect.escapeIdentifier(condition.leftColumn)} ${
				condition.operator
			} ${dialect.escapeIdentifier(
				join.rightTable
			)}.${dialect.escapeIdentifier(condition.rightColumn)}`;

			conditions.push(conditionStr);

			// Add logic operator for next condition (if not last)
			if (i < join.conditions.length - 1 && condition.logicOperator) {
				conditions.push(condition.logicOperator);
			}
		}

		const joinClause = `${join.joinType} JOIN ${dialect.escapeIdentifier(
			join.rightTable
		)} ON ${conditions.join(' ')}`;
		joins.push(joinClause);
	}

	return joins.length > 0 ? '\n' + joins.join('\n') : '';
}

/**
 * Builds the WHERE clause from conditions
 */
function buildWhereClause(query: VisualQuery, dialect: SqlDialect): string {
	if (query.conditions.length === 0) return '';

	const conditions: string[] = [];

	for (let i = 0; i < query.conditions.length; i++) {
		const condition = query.conditions[i];
		let conditionStr = '';

		// Add opening parenthesis if group starts
		if (condition.groupStart) {
			conditionStr += '(';
		}

		// Parse column (format: "tableName.columnName")
		const [tableName, columnName] = condition.column.split('.');
		const columnRef = `${dialect.escapeIdentifier(
			tableName
		)}.${dialect.escapeIdentifier(columnName)}`;

		// Build condition based on operator
		switch (condition.operator) {
			case 'IS NULL':
				conditionStr += `${columnRef} IS NULL`;
				break;
			case 'IS NOT NULL':
				conditionStr += `${columnRef} IS NOT NULL`;
				break;
			case 'IN':
			case 'NOT IN':
				if (Array.isArray(condition.value)) {
					const values = condition.value
						.map((v) => dialect.escapeValue(v))
						.join(', ');
					conditionStr += `${columnRef} ${condition.operator} (${values})`;
				} else {
					conditionStr += `${columnRef} ${
						condition.operator
					} (${dialect.escapeValue(condition.value)})`;
				}
				break;
			case 'BETWEEN':
				if (
					typeof condition.value === 'object' &&
					'from' in condition.value &&
					'to' in condition.value
				) {
					conditionStr += `${columnRef} BETWEEN ${dialect.escapeValue(
						condition.value.from
					)} AND ${dialect.escapeValue(condition.value.to)}`;
				}
				break;
			default:
				conditionStr += `${columnRef} ${
					condition.operator
				} ${dialect.escapeValue(condition.value)}`;
		}

		// Add closing parenthesis if group ends
		if (condition.groupEnd) {
			conditionStr += ')';
		}

		conditions.push(conditionStr);

		// Add logic operator for next condition (if not last)
		if (i < query.conditions.length - 1 && condition.logicOperator) {
			conditions.push(condition.logicOperator);
		}
	}

	return conditions.length > 0 ? `\nWHERE ${conditions.join(' ')}` : '';
}

/**
 * Builds the GROUP BY clause
 */
function buildGroupByClause(query: VisualQuery, dialect: SqlDialect): string {
	if (query.groupBy.length === 0) {
		return '';
	}

	const columns: string[] = [];

	for (const groupBy of query.groupBy) {
		const [tableName, columnName] = groupBy.column.split('.');
		columns.push(
			`${dialect.escapeIdentifier(tableName)}.${dialect.escapeIdentifier(
				columnName
			)}`
		);
	}

	return columns.length > 0 ? `\nGROUP BY ${columns.join(', ')}` : '';
}

/**
 * Builds the ORDER BY clause
 */
function buildOrderByClause(query: VisualQuery, dialect: SqlDialect): string {
	if (query.orderBy.length === 0) {
		return '';
	}

	const columns: string[] = [];

	for (const orderBy of query.orderBy) {
		const [tableName, columnName] = orderBy.column.split('.');
		columns.push(
			`${dialect.escapeIdentifier(tableName)}.${dialect.escapeIdentifier(
				columnName
			)} ${orderBy.direction}`
		);
	}

	return columns.length > 0 ? `\nORDER BY ${columns.join(', ')}` : '';
}

/**
 * Builds the LIMIT clause
 */
function buildLimitClause(query: VisualQuery, dialect: SqlDialect): string {
	if (query.limit && query.limit > 0) {
		return dialect.formatLimit(query.limit);
	}
	return '';
}

/**
 * Main function to generate SQL from visual query
 */
export function generateSqlFromVisual(
	query: VisualQuery,
	databaseType: string = 'postgres'
): string {
	try {
		const dialect = getDialect(databaseType);
		const functionTranslator = new FunctionTranslator(databaseType);

		let selectClause = buildSelectClause(
			query,
			dialect,
			functionTranslator
		);
		const fromClause = buildFromClause(query, dialect);
		const joinClauses = buildJoinClauses(query, dialect);
		const whereClause = buildWhereClause(query, dialect);
		const groupByClause = buildGroupByClause(query, dialect);
		const orderByClause = buildOrderByClause(query, dialect);
		const limitClause = buildLimitClause(query, dialect);

		// Apply SQL Server TOP clause if needed
		selectClause = dialect.formatSelectWithLimit(selectClause, query.limit);

		return `${selectClause}\n${fromClause}${joinClauses}${whereClause}${groupByClause}${orderByClause}${limitClause}`;
	} catch (error) {
		throw new Error(
			`Failed to generate SQL: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}

/**
 * Validates the visual query structure
 */
export function validateQueryStructure(query: VisualQuery): ValidationResult {
	const errors: string[] = [];

	// Must have at least one table
	if (query.tables.length === 0) {
		errors.push('At least one table must be selected');
	}

	// Each table must have at least one selected column (unless selecting all)
	for (const table of query.tables) {
		if (table.selectedColumns.length === 0) {
			// This is actually okay - we'll select all columns
		}
	}

	// Validate joins reference existing tables and have valid conditions
	for (const join of query.joins) {
		const leftTableExists = query.tables.some(
			(t) => t.tableName === join.leftTable
		);
		const rightTableExists = query.tables.some(
			(t) => t.tableName === join.rightTable
		);

		if (!leftTableExists) {
			errors.push(
				`Join references non-existent table: ${join.leftTable}`
			);
		}
		if (!rightTableExists) {
			errors.push(
				`Join references non-existent table: ${join.rightTable}`
			);
		}

		// Validate join has at least one condition
		if (!join.conditions || join.conditions.length === 0) {
			errors.push(
				`Join between ${join.leftTable} and ${join.rightTable} must have at least one condition`
			);
		}

		// Validate each join condition
		if (join.conditions) {
			for (const condition of join.conditions) {
				if (!condition.leftColumn || !condition.rightColumn) {
					errors.push(
						`Join condition between ${join.leftTable} and ${join.rightTable} is incomplete`
					);
				}
			}
		}
	}

	// Validate conditions reference existing tables
	for (const condition of query.conditions) {
		if (condition.column.includes('.')) {
			const [tableName] = condition.column.split('.');
			const tableExists = query.tables.some(
				(t) => t.tableName === tableName
			);

			if (!tableExists) {
				errors.push(
					`Condition references non-existent table: ${tableName}`
				);
			}
		}

		// Validate value exists for operators that require it
		if (!['IS NULL', 'IS NOT NULL'].includes(condition.operator)) {
			if (
				condition.value === undefined ||
				condition.value === null ||
				condition.value === ''
			) {
				errors.push(
					`Condition on ${condition.column} requires a value`
				);
			}
		}
	}

	// Validate parenthesis grouping is balanced
	let openParens = 0;
	for (const condition of query.conditions) {
		if (condition.groupStart) openParens++;
		if (condition.groupEnd) openParens--;
		if (openParens < 0) {
			errors.push('Unbalanced parentheses in WHERE conditions');
			break;
		}
	}
	if (openParens !== 0) {
		errors.push('Unbalanced parentheses in WHERE conditions');
	}

	// Validate GROUP BY references existing tables
	for (const groupBy of query.groupBy) {
		if (groupBy.column.includes('.')) {
			const [tableName] = groupBy.column.split('.');
			const tableExists = query.tables.some(
				(t) => t.tableName === tableName
			);

			if (!tableExists) {
				errors.push(
					`GROUP BY references non-existent table: ${tableName}`
				);
			}
		}
	}

	// Validate ORDER BY references existing tables
	for (const orderBy of query.orderBy) {
		if (orderBy.column.includes('.')) {
			const [tableName] = orderBy.column.split('.');
			const tableExists = query.tables.some(
				(t) => t.tableName === tableName
			);

			if (!tableExists) {
				errors.push(
					`ORDER BY references non-existent table: ${tableName}`
				);
			}
		}
	}

	// Validate custom expressions
	for (const table of query.tables) {
		if (table.customExpressions) {
			for (const expr of table.customExpressions) {
				if (!expr.expression || expr.expression.trim() === '') {
					errors.push(
						`Custom expression in ${table.tableName} is empty`
					);
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Generates a short alias for a table name
 */
export function generateTableAlias(
	tableName: string,
	existingAliases: string[]
): string {
	// Try first letter
	let alias = tableName.charAt(0).toLowerCase();
	let counter = 1;

	while (existingAliases.includes(alias)) {
		alias = tableName.charAt(0).toLowerCase() + counter;
		counter++;
	}

	return alias;
}

/**
 * Parses schema string into structured data
 */
export function parseSchemaString(schemaString: string): Map<string, string[]> {
	const tables = new Map<string, string[]>();
	const lines = schemaString.split('\n');
	let currentTable: string | null = null;

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed.startsWith('Table:')) {
			currentTable = trimmed.replace('Table:', '').trim();
			tables.set(currentTable, []);
		} else if (trimmed.startsWith('- ') && currentTable) {
			// Extract column name (before the opening parenthesis)
			const match = trimmed.match(/- (\w+)/);
			if (match) {
				const columns = tables.get(currentTable) || [];
				columns.push(match[1]);
				tables.set(currentTable, columns);
			}
		}
	}

	return tables;
}

export function findColumnDataType({
	column,
	schemaData,
}: {
	column: string;
	schemaData: SchemaData | null;
}): string | undefined {
	return schemaData?.schema.tables
		.find((table) => table.name === column.split('.')[0])
		?.columns.find((col) => col.column === column.split('.')[1])?.type;
}

/**
 * Auto-detect parameter type based on operator
 */
export function detectParameterType({
	operator,
	columnDataType,
}: {
	operator: string;
	columnDataType?: string;
}): 'dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number' {
	if (
		columnDataType &&
		(columnDataType.includes('bool') ||
			columnDataType.includes('bit') ||
			columnDataType === 'tinyint(1)')
	)
		return 'dropdown';

	if (operator === 'IN' || operator === 'NOT IN') return 'multiselect';

	if (
		columnDataType &&
		(columnDataType.includes('date') || columnDataType.includes('time'))
	) {
		if (operator === 'BETWEEN') return 'daterange';
		return 'date';
	}

	switch (operator) {
		case '>':
		case '<':
		case '>=':
		case '<=':
		case 'BETWEEN':
			return 'number';
		default:
			return 'text';
	}
}

/**
 * Auto-generate label from column name
 */
export function generateParameterLabel(field: string): string {
	const parts = field.split('.');
	const columnName = parts[parts.length - 1];
	// Capitalize first letter
	return columnName.charAt(0).toUpperCase() + columnName.slice(1);
}

/**
 * Auto-detect options source from column
 */
export function detectOptionsSource(field: string): string | undefined {
	// Extract table.column format
	const parts = field.split('.');
	if (parts.length >= 2) {
		return field; // Return as-is for now (table.column)
	}
	return undefined;
}
