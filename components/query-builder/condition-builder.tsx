'use client';
import {
	WhereCondition,
	OperatorType,
	LogicOperator,
	SchemaData,
} from '@/lib/query-builder-types';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { X, Filter } from 'lucide-react';

interface ConditionBuilderProps {
	condition: WhereCondition;
	onUpdate: (condition: WhereCondition) => void;
	onRemove: () => void;
	availableColumns: Array<{ table: string; column: string }>;
	isLast: boolean;
	schemaData: SchemaData | null;
}

export default function ConditionBuilder({
	condition,
	onUpdate,
	onRemove,
	availableColumns,
	isLast,
	schemaData,
}: ConditionBuilderProps) {
	const handleColumnChange = (column: string) => {
		onUpdate({ ...condition, column });
	};

	const handleOperatorChange = (operator: OperatorType) => {
		// Reset value when changing to/from IS NULL/IS NOT NULL
		const needsValue = !['IS NULL', 'IS NOT NULL'].includes(operator);
		onUpdate({
			...condition,
			operator,
			value: needsValue ? condition.value : undefined,
		});
	};

	const handleValueChange = (
		value: string | number | (string | number)[]
	) => {
		onUpdate({ ...condition, value });
	};

	const handleLogicOperatorChange = (logicOperator: LogicOperator) => {
		onUpdate({ ...condition, logicOperator });
	};

	// Detect if column is boolean type
	const isBoolean = () => {
		if (!schemaData || !condition.column) return false;

		const [tableName, columnName] = condition.column.split('.');
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

	const needsValue = !['IS NULL', 'IS NOT NULL'].includes(condition.operator);
	const isArrayValue = ['IN', 'NOT IN', 'BETWEEN'].includes(
		condition.operator
	);
	const isBooleanColumn = isBoolean();

	return (
		<div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Filter size={18} className="text-purple-600" />
					<span className="font-semibold text-primary">
						Condition
					</span>
				</div>
				<Button
					onClick={onRemove}
					className="p-1 h-auto text-red-600 hover:text-red-700 hover:bg-red-50"
					variant="ghost"
				>
					<X size={18} />
				</Button>
			</div>

			<div className="space-y-3">
				{/* Parenthesis Grouping */}
				<div className="flex items-center gap-2">
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={condition.groupStart || false}
							onChange={(e) =>
								onUpdate({
									...condition,
									groupStart: e.target.checked,
								})
							}
							className="w-4 h-4"
						/>
						<span className="text-sm text-gray-700">
							Start group (
						</span>
					</label>
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={condition.groupEnd || false}
							onChange={(e) =>
								onUpdate({
									...condition,
									groupEnd: e.target.checked,
								})
							}
							className="w-4 h-4"
						/>
						<span className="text-sm text-gray-700">
							End group )
						</span>
					</label>
				</div>

				{/* Column Selection */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Column
					</label>
					<Combobox
						options={availableColumns.map(({ table, column }) => ({
							value: `${table}.${column}`,
							label: `${table}.${column}`,
						}))}
						value={condition.column}
						onValueChange={handleColumnChange}
						placeholder="Select column..."
						emptyText="No column found."
					/>
				</div>

				{/* Operator Selection */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Operator
					</label>
					<select
						value={condition.operator}
						onChange={(e) =>
							handleOperatorChange(e.target.value as OperatorType)
						}
						className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
					>
						<option value="=">=</option>
						<option value="!=">!=</option>
						<option value=">">&gt;</option>
						<option value="<">&lt;</option>
						<option value=">=">&gt;=</option>
						<option value="<=">&lt;=</option>
						<option value="LIKE">LIKE</option>
						<option value="NOT LIKE">NOT LIKE</option>
						<option value="IN">IN</option>
						<option value="NOT IN">NOT IN</option>
						<option value="IS NULL">IS NULL</option>
						<option value="IS NOT NULL">IS NOT NULL</option>
						<option value="BETWEEN">BETWEEN</option>
					</select>
				</div>

				{/* Value Input */}
				{needsValue && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Value
						</label>
						{isBooleanColumn ? (
							<select
								value={String(condition.value || '')}
								onChange={(e) =>
									handleValueChange(e.target.value)
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
							>
								<option value="">Select value...</option>
								{getBooleanValues().map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						) : isArrayValue ? (
							<input
								type="text"
								value={
									Array.isArray(condition.value)
										? condition.value.join(', ')
										: String(condition.value || '')
								}
								onChange={(e) => {
									const values = e.target.value
										.split(',')
										.map((v) => v.trim())
										.filter((v) => v);
									handleValueChange(values);
								}}
								placeholder={
									condition.operator === 'BETWEEN'
										? 'value1, value2'
										: 'value1, value2, value3...'
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
							/>
						) : (
							<input
								type="text"
								value={
									Array.isArray(condition.value)
										? condition.value.join(', ')
										: String(condition.value || '')
								}
								onChange={(e) =>
									handleValueChange(e.target.value)
								}
								placeholder="Enter value..."
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
							/>
						)}
						{isArrayValue && !isBooleanColumn && (
							<p className="text-xs text-gray-500 mt-1">
								Separate values with commas
							</p>
						)}
					</div>
				)}

				{/* Logic Operator (for connecting to next condition) */}
				{!isLast && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Connect with next condition
						</label>
						<div className="flex gap-2">
							<button
								onClick={() => handleLogicOperatorChange('AND')}
								className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
									condition.logicOperator === 'AND'
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								AND
							</button>
							<button
								onClick={() => handleLogicOperatorChange('OR')}
								className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
									condition.logicOperator === 'OR'
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								OR
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
