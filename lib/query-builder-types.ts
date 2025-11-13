export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
export type JoinOperatorType = '=' | '!=' | '>' | '<' | '>=' | '<=';
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
export type SqlFunction =
	| 'CONCAT'
	| 'CAST'
	| 'FORMAT'
	| 'CASE'
	| 'UPPER'
	| 'LOWER'
	| 'SUBSTRING'
	| 'COALESCE'
	| 'TRIM'
	| 'LENGTH'
	| 'NONE';

export interface FunctionArgument {
	type: 'column' | 'literal' | 'expression';
	value: string; // column name (table.column), literal value, or sub-expression
}

export interface CustomExpression {
	id: string;
	expression: string; // raw SQL expression or generated from function
	alias?: string;
	function?: SqlFunction; // for function builder
	functionArgs?: FunctionArgument[]; // arguments for function builder
}

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
	customExpressions: CustomExpression[]; // Custom SQL expressions for this table
	allColumns: string[]; // Available columns from schema
}

export interface JoinCondition {
	id: string;
	leftColumn: string;
	operator: JoinOperatorType;
	rightColumn: string;
	logicOperator?: LogicOperator; // connects to next condition
}

export interface JoinBlock {
	id: string;
	joinType: JoinType;
	leftTable: string;
	rightTable: string;
	conditions: JoinCondition[]; // multiple join conditions
}

export interface WhereCondition {
	id: string;
	column: string; // format: "tableName.columnName"
	operator: OperatorType;
	value?:
		| string
		| number
		| (string | number)[]
		| { from: string | number; to: string | number };
	logicOperator?: LogicOperator; // connects to next condition
	groupStart?: boolean; // starts a parenthesis group
	groupEnd?: boolean; // ends a parenthesis group
	dropdownId?: number; // reference to dropdown for IN/NOT IN
	useDropdown?: boolean; // toggle between dropdown and CSV mode
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
	distinct: boolean; // DISTINCT keyword
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
	schema: {
		tables: {
			name: string;
			columns: {
				column: string;
				type: string;
				nullable: boolean;
				default?: string;
			}[];
		}[];
	};
	relationships: Relationship[];
	databaseType: string;
	databaseName: string;
}

// Report system types
export interface Folder {
	id: number;
	name: string;
	description?: string;
	created_at: string;
}

export interface Report {
	id: number;
	folder_id: number;
	name: string;
	description?: string;
	type: 'visual' | 'ai';
	query_config: VisualQuery;
	base_sql?: string;
	default_visible_columns: string[];
	created_at: string;
}

export interface ReportParameter {
	id: number;
	report_id: number;
	field: string;
	label: string;
	type: 'dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
	options_source?: string;
	default_value?: any;
	required: boolean;
	dropdown_id?: number; // reference to dropdown for multiselect
	suggested_dropdowns?: number[]; // IDs of suggested dropdowns
}

export interface DropdownOption {
	value: string;
	label: string;
}

export interface Dropdown {
	id: number;
	name: string;
	description?: string;
	options: DropdownOption[];
	created_at: string;
	updated_at: string;
}
