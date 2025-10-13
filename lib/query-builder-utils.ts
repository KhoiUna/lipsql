import {
	VisualQuery,
	ValidationResult,
	ColumnSelection,
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
function buildSelectClause(query: VisualQuery, dialect: SqlDialect): string {
	const columns: string[] = [];

	for (const table of query.tables) {
		for (const col of table.selectedColumns) {
			columns.push(
				formatColumnWithAggregate(col, table.tableName, dialect)
			);
		}
	}

	if (columns.length === 0) {
		// If no columns selected, select all from first table
		if (query.tables.length > 0) {
			return `SELECT ${dialect.escapeIdentifier(
				query.tables[0].tableName
			)}.*`;
		}
		return 'SELECT *';
	}

	return `SELECT ${columns.join(', ')}`;
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
 * Builds JOIN clauses
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

		const joinClause = `${join.joinType} JOIN ${dialect.escapeIdentifier(
			join.rightTable
		)} ON ${dialect.escapeIdentifier(
			join.leftTable
		)}.${dialect.escapeIdentifier(
			join.leftColumn
		)} = ${dialect.escapeIdentifier(
			join.rightTable
		)}.${dialect.escapeIdentifier(join.rightColumn)}`;
		joins.push(joinClause);
	}

	return joins.length > 0 ? '\n' + joins.join('\n') : '';
}

/**
 * Builds the WHERE clause from conditions
 */
function buildWhereClause(query: VisualQuery, dialect: SqlDialect): string {
	if (query.conditions.length === 0) {
		return '';
	}

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
					Array.isArray(condition.value) &&
					condition.value.length === 2
				) {
					conditionStr += `${columnRef} BETWEEN ${dialect.escapeValue(
						condition.value[0]
					)} AND ${dialect.escapeValue(condition.value[1])}`;
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

		let selectClause = buildSelectClause(query, dialect);
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

	// Validate joins reference existing tables
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
