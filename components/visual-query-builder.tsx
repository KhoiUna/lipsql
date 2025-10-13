'use client';

import { useState, useEffect } from 'react';
import {
	VisualQuery,
	TableBlock as TableBlockType,
	JoinBlock as JoinBlockType,
	WhereCondition,
	OrderByClause,
	SchemaData,
} from '@/lib/query-builder-types';
import {
	generateSqlFromVisual,
	validateQueryStructure,
	generateTableAlias,
	parseSchemaString,
} from '@/lib/query-builder-utils';
import TableBlock from './query-builder/table-block';
import JoinBlock from './query-builder/join-block';
import ConditionBuilder from './query-builder/condition-builder';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Play, Plus, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface VisualQueryBuilderProps {
	isOpen: boolean;
	onClose: () => void;
	onExecuteQuery: (sql: string) => void;
	schemaData: SchemaData | null;
}

export default function VisualQueryBuilder({
	isOpen,
	onClose,
	onExecuteQuery,
	schemaData,
}: VisualQueryBuilderProps) {
	const [query, setQuery] = useState<VisualQuery>({
		tables: [],
		joins: [],
		conditions: [],
		groupBy: [],
		orderBy: [],
		limit: undefined,
	});

	const [generatedSql, setGeneratedSql] = useState<string>('');
	const [showSqlPreview, setShowSqlPreview] = useState<boolean>(false);

	// Parse schema to get available tables and columns
	const tablesMap = schemaData
		? parseSchemaString(schemaData.schema)
		: new Map<string, string[]>();
	const availableTables = Array.from(tablesMap.keys());
	const relationships = schemaData?.relationships || [];

	// Reset query when modal opens
	useEffect(() => {
		if (isOpen) {
			setQuery({
				tables: [],
				joins: [],
				conditions: [],
				groupBy: [],
				orderBy: [],
				limit: undefined,
			});
			setGeneratedSql('');
			setShowSqlPreview(false);
		}
	}, [isOpen]);

	// Update generated SQL whenever query changes
	useEffect(() => {
		if (query.tables.length > 0) {
			try {
				const sql = generateSqlFromVisual(
					query,
					schemaData?.databaseType || 'postgres'
				);
				setGeneratedSql(sql);
			} catch (error) {
				setGeneratedSql('');
			}
		} else {
			setGeneratedSql('');
		}
	}, [query, schemaData?.databaseType]);

	const handleAddTable = (tableName: string) => {
		if (!tableName) return;

		// Check if table already added
		if (query.tables.some((t) => t.tableName === tableName)) {
			toast.error('Table already added');
			return;
		}

		const columns = tablesMap.get(tableName) || [];
		const existingAliases = query.tables.map((t) => t.alias);
		const alias = generateTableAlias(tableName, existingAliases);

		const newTable: TableBlockType = {
			id: `table-${Date.now()}`,
			tableName,
			alias,
			selectedColumns: [],
			allColumns: columns,
		};

		setQuery((prev) => ({
			...prev,
			tables: [...prev.tables, newTable],
		}));

		// Auto-suggest joins if FK relationships exist
		autoSuggestJoins(tableName);
	};

	const autoSuggestJoins = (newTableName: string) => {
		if (query.tables.length === 0) return;

		// Find potential FK relationships
		const potentialJoins: JoinBlockType[] = [];

		for (const existingTable of query.tables) {
			// Check if new table has FK to existing table
			const fkToExisting = relationships.find(
				(rel) =>
					rel.table === newTableName &&
					rel.foreignTable === existingTable.tableName
			);

			if (fkToExisting) {
				potentialJoins.push({
					id: `join-${Date.now()}-${potentialJoins.length}`,
					joinType: 'INNER',
					leftTable: existingTable.tableName,
					leftColumn: fkToExisting.foreignColumn,
					rightTable: newTableName,
					rightColumn: fkToExisting.column,
				});
			}

			// Check if existing table has FK to new table
			const fkFromExisting = relationships.find(
				(rel) =>
					rel.table === existingTable.tableName &&
					rel.foreignTable === newTableName
			);

			if (fkFromExisting) {
				potentialJoins.push({
					id: `join-${Date.now()}-${potentialJoins.length}`,
					joinType: 'INNER',
					leftTable: existingTable.tableName,
					leftColumn: fkFromExisting.column,
					rightTable: newTableName,
					rightColumn: fkFromExisting.foreignColumn,
				});
			}
		}

		if (potentialJoins.length > 0) {
			// Add the first suggested join
			setQuery((prev) => ({
				...prev,
				joins: [...prev.joins, potentialJoins[0]],
			}));
			toast.success('Join auto-detected based on foreign key');
		}
	};

	const handleRemoveTable = (tableId: string) => {
		setQuery((prev) => ({
			...prev,
			tables: prev.tables.filter((t) => t.id !== tableId),
		}));
	};

	const handleUpdateTable = (updatedTable: TableBlockType) => {
		setQuery((prev) => ({
			...prev,
			tables: prev.tables.map((t) =>
				t.id === updatedTable.id ? updatedTable : t
			),
		}));
	};

	const handleAddJoin = () => {
		if (query.tables.length < 2) {
			toast.error('Add at least 2 tables to create a join');
			return;
		}

		const firstTable = query.tables[0];
		const secondTable = query.tables[1];
		const firstColumns = tablesMap.get(firstTable.tableName) || [];
		const secondColumns = tablesMap.get(secondTable.tableName) || [];

		const newJoin: JoinBlockType = {
			id: `join-${Date.now()}`,
			joinType: 'INNER',
			leftTable: firstTable.tableName,
			leftColumn: firstColumns[0] || '',
			rightTable: secondTable.tableName,
			rightColumn: secondColumns[0] || '',
		};

		setQuery((prev) => ({
			...prev,
			joins: [...prev.joins, newJoin],
		}));
	};

	const handleRemoveJoin = (joinId: string) => {
		setQuery((prev) => ({
			...prev,
			joins: prev.joins.filter((j) => j.id !== joinId),
		}));
	};

	const handleUpdateJoin = (updatedJoin: JoinBlockType) => {
		setQuery((prev) => ({
			...prev,
			joins: prev.joins.map((j) =>
				j.id === updatedJoin.id ? updatedJoin : j
			),
		}));
	};

	const handleAddCondition = () => {
		if (query.tables.length === 0) {
			toast.error('Add at least one table first');
			return;
		}

		const newCondition: WhereCondition = {
			id: `condition-${Date.now()}`,
			column: '',
			operator: '=',
			value: '',
			logicOperator: 'AND',
		};

		setQuery((prev) => ({
			...prev,
			conditions: [...prev.conditions, newCondition],
		}));
	};

	const handleRemoveCondition = (conditionId: string) => {
		setQuery((prev) => ({
			...prev,
			conditions: prev.conditions.filter((c) => c.id !== conditionId),
		}));
	};

	const handleUpdateCondition = (updatedCondition: WhereCondition) => {
		setQuery((prev) => ({
			...prev,
			conditions: prev.conditions.map((c) =>
				c.id === updatedCondition.id ? updatedCondition : c
			),
		}));
	};

	const handleAddOrderBy = () => {
		if (query.tables.length === 0) {
			toast.error('Add at least one table first');
			return;
		}

		const firstTable = query.tables[0];
		const firstColumn = tablesMap.get(firstTable.tableName)?.[0] || '';

		const newOrderBy: OrderByClause = {
			id: `orderby-${Date.now()}`,
			column: `${firstTable.tableName}.${firstColumn}`,
			direction: 'ASC',
		};

		setQuery((prev) => ({
			...prev,
			orderBy: [...prev.orderBy, newOrderBy],
		}));
	};

	const handleRemoveOrderBy = (orderById: string) => {
		setQuery((prev) => ({
			...prev,
			orderBy: prev.orderBy.filter((o) => o.id !== orderById),
		}));
	};

	const handleUpdateOrderBy = (
		orderId: string,
		column: string,
		direction: 'ASC' | 'DESC'
	) => {
		setQuery((prev) => ({
			...prev,
			orderBy: prev.orderBy.map((o) =>
				o.id === orderId ? { ...o, column, direction } : o
			),
		}));
	};

	const handleClearQuery = () => {
		setQuery({
			tables: [],
			joins: [],
			conditions: [],
			groupBy: [],
			orderBy: [],
			limit: undefined,
		});
		setGeneratedSql('');
	};

	const handleExecuteQuery = () => {
		// Validate query
		const validation = validateQueryStructure(query);
		if (!validation.valid) {
			toast.error(`Invalid query: ${validation.errors.join(', ')}`);
			return;
		}

		if (!generatedSql) {
			toast.error('No SQL generated');
			return;
		}

		// Execute the query
		onExecuteQuery(generatedSql);
		onClose();
	};

	// Get all available columns for dropdowns
	const allAvailableColumns = query.tables.flatMap((table) =>
		(tablesMap.get(table.tableName) || []).map((col) => ({
			table: table.tableName,
			column: col,
		}))
	);

	const hasAggregates = query.groupBy.length > 0;

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-xl">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<h2 className="text-2xl font-bold text-primary">
						Visual Query Builder
					</h2>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<X size={24} />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					<div className="space-y-6">
						{/* Tables Section */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-lg font-semibold text-primary">
									Tables
								</h3>
								<div className="flex items-center gap-2">
									<select
										onChange={(e) => {
											handleAddTable(e.target.value);
											e.target.value = '';
										}}
										className="border border-gray-300 rounded-md px-3 py-2 text-sm"
										value=""
									>
										<option value="">
											Select table to add...
										</option>
										{availableTables.map((table) => (
											<option key={table} value={table}>
												{table}
											</option>
										))}
									</select>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{query.tables.map((table) => (
									<TableBlock
										key={table.id}
										table={table}
										onUpdate={handleUpdateTable}
										onRemove={() =>
											handleRemoveTable(table.id)
										}
										hasAggregates={hasAggregates}
									/>
								))}
								{query.tables.length === 0 && (
									<div className="col-span-full text-center py-8 text-gray-500">
										Add a table to get started
									</div>
								)}
							</div>
						</div>

						{/* Joins Section */}
						{query.tables.length >= 2 && (
							<div>
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-lg font-semibold text-primary">
										Joins
									</h3>
									<Button onClick={handleAddJoin} size="sm">
										<Plus size={16} className="mr-1" />
										Add Join
									</Button>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{query.joins.map((join) => (
										<JoinBlock
											key={join.id}
											join={join}
											onUpdate={handleUpdateJoin}
											onRemove={() =>
												handleRemoveJoin(join.id)
											}
											availableTables={query.tables.map(
												(t) => t.tableName
											)}
											availableColumns={tablesMap}
											relationships={relationships}
										/>
									))}
								</div>
							</div>
						)}

						{/* Conditions Section */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-lg font-semibold text-primary">
									Where Conditions
								</h3>
								<Button onClick={handleAddCondition} size="sm">
									<Plus size={16} className="mr-1" />
									Add Condition
								</Button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{query.conditions.map((condition, index) => (
									<ConditionBuilder
										key={condition.id}
										condition={condition}
										onUpdate={handleUpdateCondition}
										onRemove={() =>
											handleRemoveCondition(condition.id)
										}
										availableColumns={allAvailableColumns}
										isLast={
											index ===
											query.conditions.length - 1
										}
									/>
								))}
							</div>
						</div>

						{/* Order By Section */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-lg font-semibold text-primary">
									Order By
								</h3>
								<Button onClick={handleAddOrderBy} size="sm">
									<Plus size={16} className="mr-1" />
									Add Order By
								</Button>
							</div>
							<div className="space-y-2">
								{query.orderBy.map((orderBy) => (
									<div
										key={orderBy.id}
										className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-3"
									>
										<select
											value={orderBy.column}
											onChange={(e) =>
												handleUpdateOrderBy(
													orderBy.id,
													e.target.value,
													orderBy.direction
												)
											}
											className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
										>
											{allAvailableColumns.map(
												({ table, column }) => (
													<option
														key={`${table}.${column}`}
														value={`${table}.${column}`}
													>
														{table}.{column}
													</option>
												)
											)}
										</select>
										<select
											value={orderBy.direction}
											onChange={(e) =>
												handleUpdateOrderBy(
													orderBy.id,
													orderBy.column,
													e.target.value as
														| 'ASC'
														| 'DESC'
												)
											}
											className="border border-gray-300 rounded-md px-3 py-2 text-sm"
										>
											<option value="ASC">ASC</option>
											<option value="DESC">DESC</option>
										</select>
										<Button
											onClick={() =>
												handleRemoveOrderBy(orderBy.id)
											}
											variant="ghost"
											className="p-2 h-auto text-red-600 hover:text-red-700"
										>
											<X size={18} />
										</Button>
									</div>
								))}
							</div>
						</div>

						{/* Limit Section */}
						<div>
							<h3 className="text-lg font-semibold text-primary mb-3">
								Limit
							</h3>
							<Input
								type="number"
								placeholder="No limit"
								value={query.limit || ''}
								onChange={(e) =>
									setQuery((prev) => ({
										...prev,
										limit: e.target.value
											? parseInt(e.target.value)
											: undefined,
									}))
								}
								min={1}
								className="w-48"
							/>
						</div>

						{/* SQL Preview */}
						{generatedSql && (
							<div>
								<button
									onClick={() =>
										setShowSqlPreview(!showSqlPreview)
									}
									className="flex items-center gap-2 text-lg font-semibold text-primary mb-3 hover:text-gray-700 transition-colors"
								>
									<Eye size={20} />
									SQL Preview
									{showSqlPreview ? ' ▼' : ' ►'}
								</button>
								{showSqlPreview && (
									<div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
										<pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
											{generatedSql}
										</pre>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between p-6 border-t bg-gray-50">
					<Button
						onClick={handleClearQuery}
						variant="outline"
						className="text-red-600 border-red-600 hover:bg-red-50"
					>
						<Trash2 size={16} className="mr-2" />
						Clear All
					</Button>
					<div className="flex items-center gap-3">
						<Button onClick={onClose} variant="outline">
							Cancel
						</Button>
						<Button
							onClick={handleExecuteQuery}
							disabled={
								!generatedSql || query.tables.length === 0
							}
							className="bg-primary text-white hover:bg-gray-800"
						>
							<Play size={16} className="mr-2" />
							Execute Query
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
