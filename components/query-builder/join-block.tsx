'use client';

import {
	JoinBlock as JoinBlockType,
	JoinType,
	Relationship,
} from '@/lib/query-builder-types';
import { Button } from '@/components/ui/button';
import { X, Link2 } from 'lucide-react';

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
		const columns = availableColumns.get(leftTable) || [];
		onUpdate({
			...join,
			leftTable,
			leftColumn: columns.length > 0 ? columns[0] : '',
		});
	};

	const handleRightTableChange = (rightTable: string) => {
		const columns = availableColumns.get(rightTable) || [];
		onUpdate({
			...join,
			rightTable,
			rightColumn: columns.length > 0 ? columns[0] : '',
		});
	};

	const leftColumns = availableColumns.get(join.leftTable) || [];
	const rightColumns = availableColumns.get(join.rightTable) || [];

	// Check if this join is based on a FK relationship
	const isAutoDetected = relationships.some(
		(rel) =>
			(rel.table === join.leftTable &&
				rel.column === join.leftColumn &&
				rel.foreignTable === join.rightTable &&
				rel.foreignColumn === join.rightColumn) ||
			(rel.table === join.rightTable &&
				rel.column === join.rightColumn &&
				rel.foreignTable === join.leftTable &&
				rel.foreignColumn === join.leftColumn)
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
					className="p-1 h-auto text-red-600 hover:text-red-700 hover:bg-red-50"
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

				{/* Left Table */}
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Left Table
						</label>
						<select
							value={join.leftTable}
							onChange={(e) =>
								handleLeftTableChange(e.target.value)
							}
							className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
						>
							{availableTables.map((table) => (
								<option key={table} value={table}>
									{table}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Left Column
						</label>
						<select
							value={join.leftColumn}
							onChange={(e) =>
								onUpdate({
									...join,
									leftColumn: e.target.value,
								})
							}
							className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm font-mono"
						>
							{leftColumns.map((col) => (
								<option key={col} value={col}>
									{col}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Visual connector */}
				<div className="flex items-center justify-center text-gray-500 text-sm">
					<div className="flex items-center gap-2">
						<div className="h-px w-12 bg-gray-300"></div>
						<span>=</span>
						<div className="h-px w-12 bg-gray-300"></div>
					</div>
				</div>

				{/* Right Table */}
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Right Table
						</label>
						<select
							value={join.rightTable}
							onChange={(e) =>
								handleRightTableChange(e.target.value)
							}
							className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
						>
							{availableTables.map((table) => (
								<option key={table} value={table}>
									{table}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Right Column
						</label>
						<select
							value={join.rightColumn}
							onChange={(e) =>
								onUpdate({
									...join,
									rightColumn: e.target.value,
								})
							}
							className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm font-mono"
						>
							{rightColumns.map((col) => (
								<option key={col} value={col}>
									{col}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>
		</div>
	);
}
