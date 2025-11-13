'use client';
import { GroupByClause } from '@/lib/query-builder-types';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
			<div className="flex-1">
				<Combobox
					options={availableColumns.map(({ table, column }) => ({
						value: `${table}.${column}`,
						label: `${table}.${column}`,
					}))}
					value={groupBy.column}
					onValueChange={(value) =>
						onUpdate({ ...groupBy, column: value })
					}
					placeholder="Select column..."
					emptyText="No column found."
				/>
			</div>
			<Button
				onClick={onRemove}
				variant="ghost"
				className="p-2 h-auto text-red-700 hover:text-red-700"
			>
				<X size={18} />
			</Button>
		</div>
	);
}
