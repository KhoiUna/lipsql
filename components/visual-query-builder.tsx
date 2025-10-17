'use client';
import { useState, useEffect } from 'react';
import {
	VisualQuery,
	TableBlock as TableBlockType,
	JoinBlock as JoinBlockType,
	JoinCondition,
	WhereCondition,
	OrderByClause,
	GroupByClause,
	SchemaData,
} from '@/lib/query-builder-types';
import {
	generateSqlFromVisual,
	validateQueryStructure,
	generateTableAlias,
	detectParameterType,
	generateParameterLabel,
	detectOptionsSource,
	findColumnDataType,
} from '@/lib/query-builder-utils';
import TableBlock from './query-builder/table-block';
import JoinBlock from './query-builder/join-block';
import ConditionBuilder from './query-builder/condition-builder';
import GroupByBuilder from './query-builder/group-by-builder';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Combobox } from './ui/combobox';
import {
	X,
	Play,
	Plus,
	Trash2,
	Eye,
	ChevronDown,
	ChevronRight,
	Save,
	Info,
} from 'lucide-react';
import { toast } from 'sonner';
import SaveReportDialog from './save-report-dialog';
import { useUpdateReport } from '@/lib/hooks/use-api';
import { useQueryClient } from '@tanstack/react-query';

interface VisualQueryBuilderProps {
	isOpen: boolean;
	onClose: () => void;
	onExecuteQuery: (sql: string) => void;
	schemaData: SchemaData | null;
	mode: 'create' | 'update';
	initialQuery?: VisualQuery;
	reportId?: number;
}

export default function VisualQueryBuilder({
	isOpen,
	onClose,
	onExecuteQuery,
	schemaData,
	mode,
	initialQuery,
	reportId,
}: VisualQueryBuilderProps) {
	const [query, setQuery] = useState<VisualQuery>({
		distinct: false,
		tables: [],
		joins: [],
		conditions: [],
		groupBy: [],
		orderBy: [],
		limit: undefined,
	});

	const [generatedSql, setGeneratedSql] = useState<string>('');
	const [showSqlPreview, setShowSqlPreview] = useState<boolean>(false);
	const [isSaveReportDialogOpen, setIsSaveReportDialogOpen] =
		useState<boolean>(false);
	const [showParameterSelection, setShowParameterSelection] =
		useState<boolean>(false);
	const [enabledParameters, setEnabledParameters] = useState<Set<string>>(
		new Set()
	);

	const queryClient = useQueryClient();
	const updateReportMutation = useUpdateReport();

	// Parse schema to get available tables and columns
	const tablesMap = schemaData
		? new Map(
				schemaData.schema.tables.map((table) => [
					table.name,
					table.columns.map((col) => col.column),
				])
		  )
		: new Map<string, string[]>();
	const availableTables = Array.from(tablesMap.keys());
	const relationships = schemaData?.relationships || [];

	// Initialize query when modal opens
	useEffect(() => {
		if (isOpen) {
			if (initialQuery) {
				// Pre-populate with initial query
				setQuery(initialQuery);
			} else {
				// Start with empty query
				setQuery({
					distinct: false,
					tables: [],
					joins: [],
					conditions: [],
					groupBy: [],
					orderBy: [],
					limit: undefined,
				});
			}
			setGeneratedSql('');
			setShowSqlPreview(false);
			setShowParameterSelection(false);
		}
		return () => {
			setShowParameterSelection(false);
		};
	}, [isOpen, initialQuery]);

	// Initialize enabled parameters when conditions change
	useEffect(() => {
		if (mode === 'update' && query.conditions.length > 0) {
			// Enable all parameters by default for update mode
			setEnabledParameters(
				new Set(query.conditions.map((c) => c.column))
			);
		}
	}, [mode, query.conditions]);

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
			customExpressions: [],
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
				const condition: JoinCondition = {
					id: `jcond-${Date.now()}`,
					leftColumn: fkToExisting.foreignColumn,
					operator: '=',
					rightColumn: fkToExisting.column,
				};
				potentialJoins.push({
					id: `join-${Date.now()}-${potentialJoins.length}`,
					joinType: 'INNER',
					leftTable: existingTable.tableName,
					rightTable: newTableName,
					conditions: [condition],
				});
			}

			// Check if existing table has FK to new table
			const fkFromExisting = relationships.find(
				(rel) =>
					rel.table === existingTable.tableName &&
					rel.foreignTable === newTableName
			);

			if (fkFromExisting) {
				const condition: JoinCondition = {
					id: `jcond-${Date.now()}`,
					leftColumn: fkFromExisting.column,
					operator: '=',
					rightColumn: fkFromExisting.foreignColumn,
				};
				potentialJoins.push({
					id: `join-${Date.now()}-${potentialJoins.length}`,
					joinType: 'INNER',
					leftTable: existingTable.tableName,
					rightTable: newTableName,
					conditions: [condition],
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

		const condition: JoinCondition = {
			id: `jcond-${Date.now()}`,
			leftColumn: firstColumns[0] || '',
			operator: '=',
			rightColumn: secondColumns[0] || '',
		};

		const newJoin: JoinBlockType = {
			id: `join-${Date.now()}`,
			joinType: 'INNER',
			leftTable: firstTable.tableName,
			rightTable: secondTable.tableName,
			conditions: [condition],
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

	const handleAddGroupBy = () => {
		if (query.tables.length === 0) {
			toast.error('Add at least one table first');
			return;
		}

		const firstTable = query.tables[0];
		const firstColumn = tablesMap.get(firstTable.tableName)?.[0] || '';

		const newGroupBy: GroupByClause = {
			column: `${firstTable.tableName}.${firstColumn}`,
		};

		setQuery((prev) => ({
			...prev,
			groupBy: [...prev.groupBy, newGroupBy],
		}));
	};

	const handleRemoveGroupBy = (index: number) => {
		setQuery((prev) => ({
			...prev,
			groupBy: prev.groupBy.filter((_, i) => i !== index),
		}));
	};

	const handleUpdateGroupBy = (index: number, column: string) => {
		setQuery((prev) => ({
			...prev,
			groupBy: prev.groupBy.map((g, i) =>
				i === index ? { ...g, column } : g
			),
		}));
	};

	const handleClearQuery = () => {
		setQuery({
			distinct: false,
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

	const toggleParameter = (field: string) => {
		setEnabledParameters((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(field)) {
				newSet.delete(field);
			} else {
				newSet.add(field);
			}
			return newSet;
		});
	};

	const handleUpdateReport = async () => {
		// Show parameter selection if not already shown
		if (!showParameterSelection && query.conditions.length > 0) {
			setShowParameterSelection(true);
			return;
		}

		// Validate query
		const validation = validateQueryStructure(query);
		if (!validation.valid) {
			toast.error(`Invalid query: ${validation.errors.join(', ')}`);
			return;
		}

		if (!reportId) {
			toast.error('Report ID not provided');
			return;
		}

		// Auto-detect parameters from WHERE conditions, filter by enabled
		const allDetectedParams = query.conditions.map((condition) => ({
			field: condition.column,
			label: generateParameterLabel(condition.column),
			type: detectParameterType({
				operator: condition.operator,
				columnDataType: findColumnDataType({
					column: condition.column,
					schemaData,
				}),
			}),
			options_source: detectOptionsSource(condition.column),
			default_value: condition.value,
			required: false,
			dropdown_id: condition.dropdownId,
		}));

		const parameters = allDetectedParams.filter((p) =>
			enabledParameters.has(p.field)
		);

		try {
			await updateReportMutation.mutateAsync({
				id: reportId,
				data: {
					query_config: query,
					parameters,
				},
			});

			// Invalidate specific report query
			queryClient.invalidateQueries({ queryKey: ['report', reportId] });

			toast.success('Report updated successfully');
			setShowParameterSelection(false);
			onClose();
		} catch (error) {
			console.error('Update report error:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to update report'
			);
		}
	};

	// Get all available columns for dropdowns
	const allAvailableColumns = query.tables.flatMap((table) =>
		(tablesMap.get(table.tableName) || []).map((col) => ({
			table: table.tableName,
			column: col,
		}))
	);

	const hasAggregates = query.groupBy.length > 0;

	if (process.env.NEXT_PUBLIC_EXPERIMENTAL !== 'true') return null;
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-xl">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<div className="flex items-center gap-4">
						<h2 className="text-xl font-bold text-primary">
							{mode === 'update'
								? 'Edit Report'
								: 'Visual Query Builder'}
						</h2>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={query.distinct}
								onChange={(e) =>
									setQuery((prev) => ({
										...prev,
										distinct: e.target.checked,
									}))
								}
								className="w-4 h-4"
							/>
							<span className="font-medium text-gray-700">
								DISTINCT
							</span>
						</label>
					</div>
					<button
						onClick={onClose}
						className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				{/* Content */}

				<div className="flex-1 overflow-y-auto py-3 px-6">
					<div className="text-sm text-gray-600 flex items-center gap-2 mb-3">
						<Info size={16} />
						Driver: {schemaData?.databaseType}
					</div>
					<div className="space-y-6">
						{/* Tables Section */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-lg font-semibold text-primary">
									Tables
								</h3>
								<div className="flex items-center gap-2">
									<div className="w-64">
										<Combobox
											options={availableTables.map(
												(table) => ({
													value: table,
													label: table,
												})
											)}
											value=""
											onValueChange={(value) => {
												if (value) {
													handleAddTable(value);
												}
											}}
											placeholder="Select table to add..."
											emptyText="No table found."
										/>
									</div>
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
										availableColumns={allAvailableColumns}
										databaseType={
											schemaData?.databaseType ||
											'postgres'
										}
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
										schemaData={schemaData}
									/>
								))}
							</div>
						</div>

						{/* Group By Section */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-lg font-semibold text-primary">
									Group By
								</h3>
								<Button onClick={handleAddGroupBy} size="sm">
									<Plus size={16} className="mr-1" />
									Add Group By
								</Button>
							</div>
							<div className="space-y-2">
								{query.groupBy.map((groupBy, index) => (
									<GroupByBuilder
										key={index}
										groupBy={groupBy}
										onUpdate={(updated) =>
											handleUpdateGroupBy(
												index,
												updated.column
											)
										}
										onRemove={() =>
											handleRemoveGroupBy(index)
										}
										availableColumns={allAvailableColumns}
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
										<div className="flex-1">
											<Combobox
												options={allAvailableColumns.map(
													({ table, column }) => ({
														value: `${table}.${column}`,
														label: `${table}.${column}`,
													})
												)}
												value={orderBy.column}
												onValueChange={(value) =>
													handleUpdateOrderBy(
														orderBy.id,
														value,
														orderBy.direction
													)
												}
												placeholder="Select column..."
												emptyText="No column found."
											/>
										</div>
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
											className="p-2 h-auto text-red-700 hover:text-red-700"
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

						{/* Parameter Selection (Update Mode Only) */}
						{mode === 'update' &&
							showParameterSelection &&
							query.conditions.length > 0 && (
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
									<h3 className="text-lg font-semibold text-primary mb-3">
										Select Parameters
									</h3>
									<div className="space-y-2">
										{query.conditions.map(
											(condition, index) => {
												const param = {
													field: condition.column,
													label: generateParameterLabel(
														condition.column
													),
													type: detectParameterType({
														operator:
															condition.operator,
														columnDataType:
															findColumnDataType({
																column: condition.column,
																schemaData,
															}),
													}),
												};
												return (
													<label
														key={index}
														className="flex items-center justify-between text-sm cursor-pointer hover:bg-blue-100 p-2 rounded"
													>
														<div className="flex items-center gap-3">
															<input
																type="checkbox"
																checked={enabledParameters.has(
																	param.field
																)}
																onChange={() =>
																	toggleParameter(
																		param.field
																	)
																}
																className="w-4 h-4 cursor-pointer"
															/>
															<span className="font-mono text-gray-600">
																{param.field}
															</span>
															<span className="text-gray-400">
																→
															</span>
															<span className="font-medium">
																{param.label}
															</span>
														</div>
														<span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-medium">
															{param.type}
														</span>
													</label>
												);
											}
										)}
									</div>
									<p className="text-sm text-gray-600 mt-3">
										Checked conditions will be editable
										parameters. Unchecked will be fixed.
									</p>
								</div>
							)}

						{/* SQL Preview */}
						{generatedSql && (
							<div>
								<button
									onClick={() =>
										setShowSqlPreview(!showSqlPreview)
									}
									className="flex items-center gap-2 text-lg font-semibold text-primary mb-3 cursor-pointer"
								>
									<Eye size={20} />
									SQL Preview
									{showSqlPreview ? (
										<ChevronDown size={16} />
									) : (
										<ChevronRight size={16} />
									)}
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
						className="text-red-700 border-red-700 hover:text-red-700 hover:bg-red-50 cursor-pointer"
					>
						<Trash2 size={16} className="mr-2" />
						Clear All
					</Button>
					<div className="flex items-center gap-3">
						{mode === 'create' && (
							<Button
								onClick={() => setIsSaveReportDialogOpen(true)}
								disabled={
									!generatedSql || query.tables.length === 0
								}
								variant="outline"
								className="cursor-pointer"
							>
								<Save size={16} className="mr-2" />
								Save as Report
							</Button>
						)}
						{mode === 'update' && (
							<Button
								onClick={handleUpdateReport}
								disabled={
									!generatedSql ||
									query.tables.length === 0 ||
									updateReportMutation.isPending
								}
								variant="outline"
								className="cursor-pointer"
							>
								<Save size={16} className="mr-2" />
								{updateReportMutation.isPending
									? 'Updating...'
									: !showParameterSelection &&
									  query.conditions.length > 0
									? 'Select Parameters & Update'
									: 'Update Report'}
							</Button>
						)}
						<Button
							onClick={onClose}
							variant="outline"
							className="cursor-pointer"
						>
							Cancel
						</Button>
						{mode === 'create' && (
							<Button
								onClick={handleExecuteQuery}
								disabled={
									!generatedSql || query.tables.length === 0
								}
								className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
							>
								<Play size={16} className="mr-2" />
								Execute Query
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Save Report Dialog */}
			<SaveReportDialog
				isOpen={isSaveReportDialogOpen}
				onClose={() => setIsSaveReportDialogOpen(false)}
				query={query}
				databaseType={schemaData?.databaseType || 'postgres'}
				schemaData={schemaData}
			/>
		</div>
	);
}
