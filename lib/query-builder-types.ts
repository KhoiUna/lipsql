export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
export type OperatorType =
	| '='
	| '!='
	| '>'
	| '<'
	| '>='
	| '<='
	| 'LIKE'
	| 'NOT LIKE'
	| 'IN'
	| 'NOT IN'
	| 'IS NULL'
	| 'IS NOT NULL'
	| 'BETWEEN';
export type LogicOperator = 'AND' | 'OR';
export type AggregateFunction =
	| 'COUNT'
	| 'SUM'
	| 'AVG'
	| 'MAX'
	| 'MIN'
	| 'NONE';
export type OrderDirection = 'ASC' | 'DESC';

export interface ColumnSelection {
	tableName: string;
	columnName: string;
	alias?: string;
	aggregateFunction?: AggregateFunction;
}

export interface TableBlock {
	id: string;
	tableName: string;
	alias: string;
	selectedColumns: ColumnSelection[];
	allColumns: string[]; // Available columns from schema
}

export interface JoinBlock {
	id: string;
	joinType: JoinType;
	leftTable: string;
	leftColumn: string;
	rightTable: string;
	rightColumn: string;
}

export interface WhereCondition {
	id: string;
	column: string; // format: "tableName.columnName"
	operator: OperatorType;
	value?: string | number | (string | number)[];
	logicOperator?: LogicOperator; // connects to next condition
	groupStart?: boolean; // starts a parenthesis group
	groupEnd?: boolean; // ends a parenthesis group
}

export interface OrderByClause {
	id: string;
	column: string; // format: "tableName.columnName"
	direction: OrderDirection;
}

export interface GroupByClause {
	column: string; // format: "tableName.columnName"
}

export interface VisualQuery {
	tables: TableBlock[];
	joins: JoinBlock[];
	conditions: WhereCondition[];
	groupBy: GroupByClause[];
	orderBy: OrderByClause[];
	limit?: number;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

// Schema types from API
export interface TableSchema {
	tableName: string;
	columns: ColumnInfo[];
}

export interface ColumnInfo {
	column: string;
	type: string;
	nullable: boolean;
	default?: string;
}

export interface Relationship {
	table: string;
	column: string;
	foreignTable: string;
	foreignColumn: string;
}

export interface SchemaData {
	schema: string; // raw schema string
	relationships: Relationship[];
	databaseType: string;
	databaseName: string;
}
