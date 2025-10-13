'use client';
import { GroupByClause } from '@/lib/query-builder-types';
import { Button } from '@/components/ui/button';
import { X, Layers } from 'lucide-react';

interface GroupByBuilderProps {
	groupBy: GroupByClause;
	onUpdate: (groupBy: GroupByClause) => void;
	onRemove: () => void;
	availableColumns: Array<{ table: string; column: string }>;
}

export default function GroupByBuilder({
	groupBy,
	onUpdate,
	onRemove,
	availableColumns,
}: GroupByBuilderProps) {
	return (
		<div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-3">
			<Layers size={16} className="text-blue-600" />
			<select
				value={groupBy.column}
				onChange={(e) =>
					onUpdate({ ...groupBy, column: e.target.value })
				}
				className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono bg-white"
			>
				<option value="">Select column...</option>
				{availableColumns.map(({ table, column }) => (
					<option
						key={`${table}.${column}`}
						value={`${table}.${column}`}
					>
						{table}.{column}
					</option>
				))}
			</select>
			<Button
				onClick={onRemove}
				variant="ghost"
				className="p-2 h-auto text-red-600 hover:text-red-700"
			>
				<X size={18} />
			</Button>
		</div>
	);
}
