'use client';
import {
	TableBlock as TableBlockType,
	AggregateFunction,
	CustomExpression,
} from '@/lib/query-builder-types';
import { Button } from '@/components/ui/button';
import { X, Table, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import ExpressionBuilder from './expression-builder';

interface TableBlockProps {
	table: TableBlockType;
	onUpdate: (table: TableBlockType) => void;
	onRemove: () => void;
	hasAggregates: boolean;
	availableColumns: Array<{ table: string; column: string }>;
	databaseType: string;
}

export default function TableBlock({
	table,
	onUpdate,
	onRemove,
	hasAggregates,
	availableColumns,
	databaseType,
}: TableBlockProps) {
	const [isExpanded, setIsExpanded] = useState(true);

	const handleColumnToggle = (columnName: string) => {
		const isSelected = table.selectedColumns.some(
			(col) => col.columnName === columnName
		);

		if (isSelected) {
			// Remove column
			onUpdate({
				...table,
				selectedColumns: table.selectedColumns.filter(
					(col) => col.columnName !== columnName
				),
			});
		} else {
			// Add column
			onUpdate({
				...table,
				selectedColumns: [
					...table.selectedColumns,
					{
						tableName: table.tableName,
						columnName,
						aggregateFunction: 'NONE',
					},
				],
			});
		}
	};

	const handleSelectAll = () => {
		if (table.selectedColumns.length === table.allColumns.length) {
			// Deselect all
			onUpdate({
				...table,
				selectedColumns: [],
			});
		} else {
			// Select all
			onUpdate({
				...table,
				selectedColumns: table.allColumns.map((col) => ({
					tableName: table.tableName,
					columnName: col,
					aggregateFunction: 'NONE',
				})),
			});
		}
	};

	const handleAggregateChange = (
		columnName: string,
		aggregateFunction: AggregateFunction
	) => {
		onUpdate({
			...table,
			selectedColumns: table.selectedColumns.map((col) =>
				col.columnName === columnName
					? { ...col, aggregateFunction }
					: col
			),
		});
	};

	const isColumnSelected = (columnName: string) => {
		return table.selectedColumns.some(
			(col) => col.columnName === columnName
		);
	};

	const getColumnAggregate = (columnName: string): AggregateFunction => {
		const col = table.selectedColumns.find(
			(c) => c.columnName === columnName
		);
		return col?.aggregateFunction || 'NONE';
	};

	const handleAddExpression = () => {
		const newExpression: CustomExpression = {
			id: `expr-${Date.now()}`,
			expression: '',
			function: 'NONE',
			functionArgs: [],
		};

		onUpdate({
			...table,
			customExpressions: [
				...(table.customExpressions || []),
				newExpression,
			],
		});
	};

	const handleUpdateExpression = (updatedExpression: CustomExpression) => {
		onUpdate({
			...table,
			customExpressions: (table.customExpressions || []).map((expr) =>
				expr.id === updatedExpression.id ? updatedExpression : expr
			),
		});
	};

	const handleRemoveExpression = (expressionId: string) => {
		onUpdate({
			...table,
			customExpressions: (table.customExpressions || []).filter(
				(expr) => expr.id !== expressionId
			),
		});
	};

	return (
		<div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
			<div className="flex items-center justify-between mb-3">
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex items-center gap-2 flex-1 text-left hover:text-primary transition-colors"
				>
					{isExpanded ? (
						<ChevronDown size={16} />
					) : (
						<ChevronRight size={16} />
					)}
					<Table size={18} className="text-blue-600" />
					<div>
						<span className="font-semibold text-primary">
							{table.tableName}
						</span>
						<span className="text-gray-500 text-sm ml-2">
							({table.alias})
						</span>
					</div>
				</button>
				<Button
					onClick={onRemove}
					className="p-1 h-auto text-red-700 hover:text-red-700 hover:bg-red-50"
					variant="ghost"
				>
					<X size={18} />
				</Button>
			</div>

			{isExpanded && (
				<>
					<div className="flex items-center justify-between mb-2 pb-2 border-b">
						<span className="text-sm text-gray-600">
							{table.selectedColumns.length} of{' '}
							{table.allColumns.length} selected
						</span>
						<Button
							onClick={handleSelectAll}
							className="text-xs px-2 py-1 h-auto"
							variant="outline"
							size="sm"
						>
							{table.selectedColumns.length ===
							table.allColumns.length
								? 'Deselect All'
								: 'Select All'}
						</Button>
					</div>

					<div className="space-y-2 max-h-64 overflow-y-auto">
						{table.allColumns.map((columnName) => (
							<div
								key={columnName}
								className="flex items-center gap-2"
							>
								<label className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-gray-50 p-1 rounded">
									<input
										type="checkbox"
										checked={isColumnSelected(columnName)}
										onChange={() =>
											handleColumnToggle(columnName)
										}
										className="w-4 h-4 cursor-pointer"
									/>
									<span className="text-sm font-mono text-gray-700">
										{columnName}
									</span>
								</label>

								{hasAggregates &&
									isColumnSelected(columnName) && (
										<select
											value={getColumnAggregate(
												columnName
											)}
											onChange={(e) =>
												handleAggregateChange(
													columnName,
													e.target
														.value as AggregateFunction
												)
											}
											className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
										>
											<option value="NONE">None</option>
											<option value="COUNT">COUNT</option>
											<option value="SUM">SUM</option>
											<option value="AVG">AVG</option>
											<option value="MAX">MAX</option>
											<option value="MIN">MIN</option>
										</select>
									)}
							</div>
						))}
					</div>

					{/* Custom Expressions */}
					<div className="mt-4 pt-4 border-t">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium text-gray-700">
								Custom Expressions
							</span>
							<Button
								onClick={handleAddExpression}
								size="sm"
								variant="outline"
								className="text-xs px-2 py-1 h-auto"
							>
								<Plus size={14} className="mr-1" />
								Add Expression
							</Button>
						</div>
						<div className="space-y-2">
							{(table.customExpressions || []).map((expr) => (
								<ExpressionBuilder
									key={expr.id}
									expression={expr}
									onUpdate={handleUpdateExpression}
									onRemove={() =>
										handleRemoveExpression(expr.id)
									}
									availableColumns={availableColumns}
									databaseType={databaseType}
								/>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
