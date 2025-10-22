'use client';
import { useState, useEffect } from 'react';
import {
	VisualQuery,
	ReportParameter,
	OrderByClause,
	SchemaData,
} from '@/lib/query-builder-types';
import { generateSqlFromVisual } from '@/lib/query-builder-utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Combobox } from './ui/combobox';
import { Play, X, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface PresetReportBuilderProps {
	isPending: boolean;
	reportName: string;
	reportDescription?: string;
	queryConfig: VisualQuery;
	parameters: ReportParameter[];
	schemaData: SchemaData | null;
	onExecuteQuery: (sql: string) => void;
}

export default function PresetReportBuilder({
	isPending,
	reportName,
	reportDescription,
	queryConfig,
	parameters,
	schemaData,
	onExecuteQuery,
}: PresetReportBuilderProps) {
	const [parameterValues, setParameterValues] = useState<Record<string, any>>(
		{}
	);
	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
		new Set()
	);
	const [orderBy, setOrderBy] = useState<OrderByClause[]>(
		queryConfig.orderBy || []
	);
	const [limit, setLimit] = useState<number | undefined>(queryConfig.limit);
	const [generatedSql, setGeneratedSql] = useState<string>('');
	const [showSqlPreview, setShowSqlPreview] = useState<boolean>(false);
	const [parameterOptions, setParameterOptions] = useState<
		Record<string, { value: string; label: string }[]>
	>({});
	const [dropdownsCache, setDropdownsCache] = useState<
		Record<number, { value: string; label: string }[]>
	>({});

	const tablesMap = schemaData
		? new Map(
				schemaData.schema.tables.map((table) => [
					table.name,
					table.columns.map((col) => col.column),
				])
		  )
		: new Map<string, string[]>();

	// Helper function to get operator for a parameter
	const getOperatorForParameter = (paramField: string): string | null => {
		const condition = queryConfig.conditions.find(
			(cond) => cond.column === paramField
		);
		return condition?.operator || null;
	};

	// Initialize parameter values with defaults
	useEffect(() => {
		const initialValues: Record<string, any> = {};
		for (const param of parameters) {
			if (param.type === 'daterange') {
				initialValues[param.field] = {
					from: param.default_value[0],
					to: param.default_value[1],
				};
			} else {
				initialValues[param.field] = param.default_value;
			}
		}
		setParameterValues(initialValues);
	}, [parameters]);

	// Initialize parameter options from dropdown_id or default_value
	useEffect(() => {
		const options: Record<string, { value: string; label: string }[]> = {};

		for (const param of parameters) {
			// Only process dropdown and multiselect types
			if (param.type === 'dropdown' || param.type === 'multiselect') {
				// If dropdown_id exists, use dropdown options
				if (param.dropdown_id) {
					if (dropdownsCache[param.dropdown_id]) {
						options[param.field] =
							dropdownsCache[param.dropdown_id];
					} else {
						// Fetch dropdown options
						fetch(`/api/dropdowns/${param.dropdown_id}`)
							.then((res) => res.json())
							.then((data) => {
								if (data.dropdown) {
									const dropdownOptions =
										data.dropdown.options;
									setDropdownsCache((prev) => ({
										...prev,
										[param.dropdown_id!]: dropdownOptions,
									}));
									setParameterOptions((prev) => ({
										...prev,
										[param.field]: dropdownOptions,
									}));
								}
							})
							.catch((err) =>
								console.error('Failed to fetch dropdown:', err)
							);
					}
				}
				// Otherwise, fall back to default_value
				else if (
					param.default_value !== undefined &&
					param.default_value !== null
				) {
					// Handle array values (from multiselect or IN operator)
					if (Array.isArray(param.default_value)) {
						options[param.field] = param.default_value.map(
							(val) => ({
								value: String(val),
								label: String(val),
							})
						);
					}
					// Handle single value (from dropdown or = operator)
					else if (param.default_value) {
						options[param.field] = [
							{
								value: String(param.default_value),
								label: String(param.default_value),
							},
						];
					}
				}
			}
		}

		// Set options that don't need async fetching
		setParameterOptions((prev) => ({ ...prev, ...options }));
	}, [parameters, dropdownsCache]);

	// Initialize visible columns (all visible by default)
	useEffect(() => {
		const allColumns = new Set<string>();
		for (const table of queryConfig.tables) {
			for (const col of table.selectedColumns) {
				allColumns.add(`${col.tableName}.${col.columnName}`);
			}
			for (const expr of table.customExpressions) {
				if (expr.alias) {
					allColumns.add(expr.alias);
				}
			}
		}
		setVisibleColumns(allColumns);
	}, [queryConfig.tables]);

	// Generate SQL with current parameter values
	useEffect(() => {
		try {
			// Create a modified query with updated conditions
			const modifiedQuery: VisualQuery = {
				...queryConfig,
				conditions: queryConfig.conditions.map((cond) => {
					const paramValue = parameterValues[cond.column];
					if (paramValue !== undefined) {
						return { ...cond, value: paramValue };
					}
					return cond;
				}),
				orderBy,
				limit,
				tables: queryConfig.tables.map((table) => ({
					...table,
					selectedColumns: table.selectedColumns.filter((col) =>
						visibleColumns.has(`${col.tableName}.${col.columnName}`)
					),
					customExpressions: table.customExpressions.filter(
						(expr) => !expr.alias || visibleColumns.has(expr.alias)
					),
				})),
			};

			const sql = generateSqlFromVisual(
				modifiedQuery,
				schemaData?.databaseType || 'postgres'
			);
			setGeneratedSql(sql);
		} catch (error) {
			setGeneratedSql('');
		}
	}, [
		parameterValues,
		visibleColumns,
		orderBy,
		limit,
		queryConfig,
		schemaData?.databaseType,
	]);

	const handleParameterChange = (field: string, value: any) => {
		setParameterValues((prev) => ({ ...prev, [field]: value }));
	};

	const handleColumnToggle = (columnId: string) => {
		setVisibleColumns((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(columnId)) {
				newSet.delete(columnId);
			} else {
				newSet.add(columnId);
			}
			return newSet;
		});
	};

	const copyToClipboard = async () => {
		if (!generatedSql) return;

		try {
			await navigator.clipboard.writeText(generatedSql);
			toast.success('SQL copied to clipboard');
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
	};

	const handleAddOrderBy = () => {
		const firstTable = queryConfig.tables[0];
		if (!firstTable) return;

		const firstColumn = tablesMap.get(firstTable.tableName)?.[0] || '';

		const newOrderBy: OrderByClause = {
			id: `orderby-${Date.now()}`,
			column: `${firstTable.tableName}.${firstColumn}`,
			direction: 'ASC',
		};

		setOrderBy((prev) => [...prev, newOrderBy]);
	};

	const handleRemoveOrderBy = (orderById: string) => {
		setOrderBy((prev) => prev.filter((o) => o.id !== orderById));
	};

	const handleUpdateOrderBy = (
		orderId: string,
		column: string,
		direction: 'ASC' | 'DESC'
	) => {
		setOrderBy((prev) =>
			prev.map((o) =>
				o.id === orderId ? { ...o, column, direction } : o
			)
		);
	};

	const handleExecute = () => {
		if (!generatedSql) {
			toast.error('No SQL generated');
			return;
		}

		onExecuteQuery(generatedSql);
	};

	// Get boolean values based on database type
	const getBooleanValues = () => {
		const dbType = (schemaData?.databaseType || 'postgres').toLowerCase();

		if (dbType.includes('postgres')) {
			return [
				{ value: 'true', label: 'True' },
				{ value: 'false', label: 'False' },
			];
		}
		if (dbType.includes('sqlserver') || dbType.includes('mssql')) {
			return [
				{ value: '1', label: 'True' },
				{ value: '0', label: 'False' },
			];
		}
		if (dbType.includes('mysql')) {
			return [
				{ value: '1', label: 'True' },
				{ value: '0', label: 'False' },
			];
		}
		if (dbType.includes('sqlite')) {
			return [
				{ value: '1', label: 'True' },
				{ value: '0', label: 'False' },
			];
		}

		return [
			{ value: 'true', label: 'True' },
			{ value: 'false', label: 'False' },
		];
	};

	// Detect if a parameter field is boolean type
	const isBooleanParameter = (field: string) => {
		if (!schemaData) return false;

		const [tableName, columnName] = field.split('.');
		const table = schemaData.schema.tables.find(
			(t) => t.name === tableName
		);
		if (!table) return false;

		const column = table.columns.find((c) => c.column === columnName);
		if (!column) return false;

		const type = column.type.toLowerCase();
		return (
			type.includes('bool') ||
			type.includes('bit') ||
			type === 'tinyint(1)'
		);
	};

	// Get all available columns
	const allAvailableColumns = queryConfig.tables.flatMap((table) =>
		(tablesMap.get(table.tableName) || []).map((col) => ({
			table: table.tableName,
			column: col,
		}))
	);

	// Get all column identifiers
	const allColumnIds: string[] = [];
	for (const table of queryConfig.tables) {
		for (const col of table.selectedColumns) {
			allColumnIds.push(`${col.tableName}.${col.columnName}`);
		}
		for (const expr of table.customExpressions) {
			if (expr.alias) {
				allColumnIds.push(expr.alias);
			}
		}
	}

	return (
		<div className="space-y-6">
			{/* Report Header */}
			<div className="bg-white rounded-lg border border-gray-200 p-6">
				<h2 className="text-xl font-bold text-primary mb-2">
					{reportName}
				</h2>
				{reportDescription && (
					<p className="text-gray-600">{reportDescription}</p>
				)}
			</div>

			{/* Parameters Panel */}
			{parameters.length > 0 && (
				<div className="bg-white rounded-lg border border-gray-200 p-6">
					<h3 className="font-semibold text-primary mb-4">
						Parameters
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{parameters.map((param) => {
							const operator = getOperatorForParameter(
								param.field
							);
							return (
								<div key={param.id}>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										{param.label}
										{operator && (
											<span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-mono">
												{operator}
											</span>
										)}
										{param.required && (
											<span className="text-red-500 ml-1">
												*
											</span>
										)}
									</label>

									{param.type === 'dropdown' &&
									isBooleanParameter(param.field) ? (
										<select
											value={String(
												parameterValues[param.field] ||
													''
											)}
											onChange={(e) =>
												handleParameterChange(
													param.field,
													e.target.value
												)
											}
											className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
										>
											<option value="">Select...</option>
											{getBooleanValues().map((opt) => (
												<option
													key={opt.value}
													value={opt.value}
												>
													{opt.label}
												</option>
											))}
										</select>
									) : param.type === 'dropdown' ? (
										<Combobox
											options={
												parameterOptions[param.field] ||
												[]
											}
											value={
												parameterValues[param.field] ||
												''
											}
											onValueChange={(value) =>
												handleParameterChange(
													param.field,
													value
												)
											}
											placeholder="Select..."
											emptyText="No option found."
										/>
									) : null}

									{param.type === 'multiselect' && (
										<select
											multiple
											value={
												Array.isArray(
													parameterValues[param.field]
												)
													? parameterValues[
															param.field
													  ]
													: []
											}
											onChange={(e) => {
												const selected = Array.from(
													e.target.selectedOptions,
													(opt) => opt.value
												);
												handleParameterChange(
													param.field,
													selected
												);
											}}
											className="w-full border border-gray-300 rounded-md px-3 py-2"
											size={5}
										>
											{(
												parameterOptions[param.field] ||
												[]
											).map((opt) => (
												<option
													key={opt.value}
													value={opt.value}
												>
													{opt.label}
												</option>
											))}
										</select>
									)}

									{param.type === 'text' && (
										<Input
											type="text"
											value={
												parameterValues[param.field] ||
												''
											}
											onChange={(e) =>
												handleParameterChange(
													param.field,
													e.target.value
												)
											}
											placeholder={`Enter ${param.label.toLowerCase()}`}
										/>
									)}

									{param.type === 'number' && (
										<Input
											type="number"
											value={
												parameterValues[param.field] ||
												''
											}
											onChange={(e) =>
												handleParameterChange(
													param.field,
													e.target.value
														? Number(e.target.value)
														: ''
												)
											}
											placeholder={`Enter ${param.label.toLowerCase()}`}
										/>
									)}

									{param.type === 'date' && (
										<Input
											type="date"
											value={
												parameterValues[param.field] ||
												''
											}
											onChange={(e) =>
												handleParameterChange(
													param.field,
													e.target.value
												)
											}
										/>
									)}

									{param.type === 'daterange' && (
										<div className="flex gap-2">
											<Input
												type="date"
												value={
													parameterValues[param.field]
														?.from || ''
												}
												onChange={(e) =>
													handleParameterChange(
														param.field,
														{
															...parameterValues[
																param.field
															],
															from: e.target
																.value,
														}
													)
												}
												placeholder="From"
											/>
											<Input
												type="date"
												value={
													parameterValues[param.field]
														?.to || ''
												}
												onChange={(e) =>
													handleParameterChange(
														param.field,
														{
															...parameterValues[
																param.field
															],
															to: e.target.value,
														}
													)
												}
												placeholder="To"
											/>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Query Structure (Read-only) */}
			<div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
				<h3 className="font-semibold text-primary mb-4">
					Query Structure
				</h3>
				<div className="space-y-4">
					{/* Tables */}
					<div>
						<h4 className="font-medium text-gray-700 mb-2">
							Tables
						</h4>
						<div className="flex flex-wrap gap-2">
							{queryConfig.tables.map((table) => (
								<div
									key={table.id}
									className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm font-mono"
								>
									{table.tableName} ({table.alias})
								</div>
							))}
						</div>
					</div>

					{/* Joins */}
					{queryConfig.joins.length > 0 && (
						<div>
							<h4 className="font-medium text-gray-700 mb-2">
								Joins
							</h4>
							<div className="space-y-2">
								{queryConfig.joins.map((join) => (
									<div
										key={join.id}
										className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-mono"
									>
										{join.joinType} JOIN {join.leftTable} ON{' '}
										{join.conditions
											.map(
												(c) =>
													`${c.leftColumn} ${c.operator} ${c.rightColumn}`
											)
											.join(' AND ')}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Column Selection */}
			<div className="bg-white rounded-lg border border-gray-200 p-6">
				<h3 className="font-semibold text-primary mb-4">
					Visible Columns
				</h3>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
					{allColumnIds.map((columnId) => (
						<label
							key={columnId}
							className="flex items-center gap-2"
						>
							<input
								type="checkbox"
								checked={visibleColumns.has(columnId)}
								onChange={() => handleColumnToggle(columnId)}
								className="w-4 h-4"
							/>
							<span className="text-sm font-mono text-gray-700">
								{columnId}
							</span>
						</label>
					))}
				</div>
			</div>

			{/* Order By */}
			<div className="bg-white rounded-lg border border-gray-200 p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-semibold text-primary">Order By</h3>
					<Button onClick={handleAddOrderBy} size="sm">
						Add Order By
					</Button>
				</div>
				<div className="space-y-2">
					{orderBy.map((order) => (
						<div key={order.id} className="flex items-center gap-2">
							<div className="flex-1">
								<Combobox
									options={allAvailableColumns.map(
										({ table, column }) => ({
											value: `${table}.${column}`,
											label: `${table}.${column}`,
										})
									)}
									value={order.column}
									onValueChange={(value) =>
										handleUpdateOrderBy(
											order.id,
											value,
											order.direction
										)
									}
									placeholder="Select column..."
									emptyText="No column found."
								/>
							</div>
							<select
								value={order.direction}
								onChange={(e) =>
									handleUpdateOrderBy(
										order.id,
										order.column,
										e.target.value as 'ASC' | 'DESC'
									)
								}
								className="border border-gray-300 rounded-md px-3 py-2 text-sm"
							>
								<option value="ASC">ASC</option>
								<option value="DESC">DESC</option>
							</select>
							<Button
								onClick={() => handleRemoveOrderBy(order.id)}
								variant="ghost"
								className="p-2 h-auto text-red-700 hover:text-red-700"
							>
								<X size={18} />
							</Button>
						</div>
					))}
				</div>
			</div>

			{/* Limit */}
			<div className="bg-white rounded-lg border border-gray-200 p-6">
				<h3 className="font-semibold text-primary mb-3">Limit</h3>
				<Input
					type="number"
					placeholder="No limit"
					value={limit || ''}
					onChange={(e) =>
						setLimit(
							e.target.value
								? parseInt(e.target.value)
								: undefined
						)
					}
					min={1}
					className="w-48"
				/>
			</div>

			{/* SQL Preview */}
			{generatedSql && (
				<div className="bg-gray-50 rounded-lg border border-gray-200">
					<button
						onClick={() => setShowSqlPreview(!showSqlPreview)}
						className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg"
					>
						<h3 className="font-semibold text-primary flex items-center justify-between">
							<span className="flex items-center gap-2">
								<Eye size={20} />
								SQL Preview
							</span>
							{showSqlPreview ? (
								<ChevronDown size={16} />
							) : (
								<ChevronRight size={16} />
							)}
						</h3>
					</button>
					{showSqlPreview && (
						<div className="px-4 pb-4">
							<div
								className="bg-white border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
								onClick={copyToClipboard}
								title="Click to copy SQL"
							>
								<pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
									{generatedSql}
								</pre>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Execute Button */}
			<div className="flex justify-end">
				<Button
					onClick={handleExecute}
					disabled={!generatedSql || isPending}
					className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
				>
					<Play size={16} className="mr-2" />
					Run Report
				</Button>
			</div>
		</div>
	);
}
