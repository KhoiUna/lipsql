'use client';
import { CustomExpression } from '@/lib/query-builder-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Sparkles } from 'lucide-react';

interface ExpressionBuilderProps {
	expression: CustomExpression;
	onUpdate: (expression: CustomExpression) => void;
	onRemove: () => void;
	availableColumns: Array<{ table: string; column: string }>;
	databaseType: string;
}

export default function ExpressionBuilder({
	expression,
	onUpdate,
	onRemove,
	databaseType,
}: ExpressionBuilderProps) {
	return (
		<div className="border border-purple-300 rounded-lg p-4 bg-purple-50 shadow-sm">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Sparkles size={18} className="text-purple-600" />
					<span className="font-semibold text-purple-900">
						Custom Expression
					</span>
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
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						SQL Expression
					</label>
					<textarea
						value={expression.expression}
						onChange={(e) =>
							onUpdate({
								...expression,
								expression: e.target.value,
								function: 'NONE',
							})
						}
						placeholder="Enter custom SQL expression..."
						className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
						rows={3}
					/>
					<p className="text-xs text-gray-600 mt-1">
						Enter any valid SQL expression for your database
					</p>
				</div>

				{/* Alias */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Alias (optional)
					</label>
					<Input
						type="text"
						value={expression.alias || ''}
						onChange={(e) =>
							onUpdate({ ...expression, alias: e.target.value })
						}
						placeholder="Column alias..."
						className="text-sm"
					/>
				</div>
			</div>
		</div>
	);
}
