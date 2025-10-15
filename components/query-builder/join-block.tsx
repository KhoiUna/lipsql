'use client';
import {
	JoinBlock as JoinBlockType,
	JoinCondition,
	JoinType,
	JoinOperatorType,
	Relationship,
} from '@/lib/query-builder-types';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { X, Link2, Plus } from 'lucide-react';

interface JoinBlockProps {
	join: JoinBlockType;
	onUpdate: (join: JoinBlockType) => void;
	onRemove: () => void;
	availableTables: string[];
	availableColumns: Map<string, string[]>;
	relationships: Relationship[];
}

export default function JoinBlock({
	join,
	onUpdate,
	onRemove,
	availableTables,
	availableColumns,
	relationships,
}: JoinBlockProps) {
	const handleJoinTypeChange = (joinType: JoinType) => {
		onUpdate({ ...join, joinType });
	};

	const handleLeftTableChange = (leftTable: string) => {
		// Reset conditions when changing left table
		const leftColumns = availableColumns.get(leftTable) || [];
		// const rightColumns = availableColumns.get(join.rightTable) || [];

		onUpdate({
			...join,
			leftTable,
			conditions: join.conditions.map((cond) => ({
				...cond,
				leftColumn: leftColumns.length > 0 ? leftColumns[0] : '',
			})),
		});
	};

	const handleRightTableChange = (rightTable: string) => {
		// Reset conditions when changing right table
		const leftColumns = availableColumns.get(join.leftTable) || [];
		const rightColumns = availableColumns.get(rightTable) || [];

		onUpdate({
			...join,
			rightTable,
			conditions: join.conditions.map((cond) => ({
				...cond,
				rightColumn: rightColumns.length > 0 ? rightColumns[0] : '',
			})),
		});
	};

	const handleAddCondition = () => {
		const leftColumns = availableColumns.get(join.leftTable) || [];
		const rightColumns = availableColumns.get(join.rightTable) || [];

		const newCondition: JoinCondition = {
			id: `jcond-${Date.now()}`,
			leftColumn: leftColumns.length > 0 ? leftColumns[0] : '',
			operator: '=',
			rightColumn: rightColumns.length > 0 ? rightColumns[0] : '',
			logicOperator: 'AND',
		};

		onUpdate({
			...join,
			conditions: [...join.conditions, newCondition],
		});
	};

	const handleRemoveCondition = (conditionId: string) => {
		onUpdate({
			...join,
			conditions: join.conditions.filter((c) => c.id !== conditionId),
		});
	};

	const handleUpdateCondition = (updatedCondition: JoinCondition) => {
		onUpdate({
			...join,
			conditions: join.conditions.map((c) =>
				c.id === updatedCondition.id ? updatedCondition : c
			),
		});
	};

	const leftColumns = availableColumns.get(join.leftTable) || [];
	const rightColumns = availableColumns.get(join.rightTable) || [];

	// Check if any condition is based on a FK relationship
	const isAutoDetected = join.conditions.some((cond) =>
		relationships.some(
			(rel) =>
				(rel.table === join.leftTable &&
					rel.column === cond.leftColumn &&
					rel.foreignTable === join.rightTable &&
					rel.foreignColumn === cond.rightColumn) ||
				(rel.table === join.rightTable &&
					rel.column === cond.rightColumn &&
					rel.foreignTable === join.leftTable &&
					rel.foreignColumn === cond.leftColumn)
		)
	);

	return (
		<div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Link2 size={18} className="text-green-600" />
					<span className="font-semibold text-primary">Join</span>
					{isAutoDetected && (
						<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
							FK Detected
						</span>
					)}
				</div>
				<Button
					onClick={onRemove}
					className="p-1 h-auto text-red-700 hover:text-red-700 hover:bg-red-50"
					variant="ghost"
				>
					<X size={18} />
				</Button>
			</div>

			<div className="space-y-3">
				{/* Join Type */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Join Type
					</label>
					<select
						value={join.joinType}
						onChange={(e) =>
							handleJoinTypeChange(e.target.value as JoinType)
						}
						className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
					>
						<option value="INNER">INNER JOIN</option>
						<option value="LEFT">LEFT JOIN</option>
						<option value="RIGHT">RIGHT JOIN</option>
						<option value="FULL">FULL OUTER JOIN</option>
					</select>
				</div>

				{/* Tables Selection */}
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Left Table
						</label>
						<Combobox
							options={availableTables.map((table) => ({
								value: table,
								label: table,
							}))}
							value={join.leftTable}
							onValueChange={handleLeftTableChange}
							placeholder="Select table..."
							emptyText="No table found."
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Right Table
						</label>
						<Combobox
							options={availableTables.map((table) => ({
								value: table,
								label: table,
							}))}
							value={join.rightTable}
							onValueChange={handleRightTableChange}
							placeholder="Select table..."
							emptyText="No table found."
						/>
					</div>
				</div>

				{/* Join Conditions */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<label className="block text-sm font-medium text-gray-700">
							ON Conditions
						</label>
						<Button
							onClick={handleAddCondition}
							size="sm"
							variant="outline"
							className="text-xs px-2 py-1 h-auto"
						>
							<Plus size={14} className="mr-1" />
							Add Condition
						</Button>
					</div>

					<div className="space-y-2">
						{join.conditions.map((condition, index) => (
							<div key={condition.id}>
								<div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
									{/* Left Column */}
									<div className="flex-1">
										<Combobox
											options={leftColumns.map((col) => ({
												value: col,
												label: `${join.leftTable}.${col}`,
											}))}
											value={condition.leftColumn}
											onValueChange={(value) =>
												handleUpdateCondition({
													...condition,
													leftColumn: value,
												})
											}
											placeholder="Select column..."
											emptyText="No column found."
										/>
									</div>

									{/* Operator */}
									<select
										value={condition.operator}
										onChange={(e) =>
											handleUpdateCondition({
												...condition,
												operator: e.target
													.value as JoinOperatorType,
											})
										}
										className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
									>
										<option value="=">=</option>
										<option value="!=">!=</option>
										<option value=">">&gt;</option>
										<option value="<">&lt;</option>
										<option value=">=">&gt;=</option>
										<option value="<=">&lt;=</option>
									</select>

									{/* Right Column */}
									<div className="flex-1">
										<Combobox
											options={rightColumns.map(
												(col) => ({
													value: col,
													label: `${join.rightTable}.${col}`,
												})
											)}
											value={condition.rightColumn}
											onValueChange={(value) =>
												handleUpdateCondition({
													...condition,
													rightColumn: value,
												})
											}
											placeholder="Select column..."
											emptyText="No column found."
										/>
									</div>

									{/* Remove Button */}
									{join.conditions.length > 1 && (
										<Button
											onClick={() =>
												handleRemoveCondition(
													condition.id
												)
											}
											variant="ghost"
											className="p-1 h-auto text-red-700"
										>
											<X size={16} />
										</Button>
									)}
								</div>

								{/* Logic Operator for next condition */}
								{index < join.conditions.length - 1 && (
									<div className="flex items-center justify-center my-1">
										<div className="flex gap-2">
											<button
												onClick={() =>
													handleUpdateCondition({
														...condition,
														logicOperator: 'AND',
													})
												}
												className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
													condition.logicOperator ===
													'AND'
														? 'bg-green-600 text-white'
														: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
												}`}
											>
												AND
											</button>
											<button
												onClick={() =>
													handleUpdateCondition({
														...condition,
														logicOperator: 'OR',
													})
												}
												className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
													condition.logicOperator ===
													'OR'
														? 'bg-green-600 text-white'
														: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
												}`}
											>
												OR
											</button>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
