'use client';
import { X } from 'lucide-react';

interface QueryRow {
	[key: string]: string | number | boolean | null;
}

export default function RowDetailsModal({
	row,
	columns,
	isOpen,
	onClose,
}: {
	row: QueryRow;
	columns: string[];
	isOpen: boolean;
	onClose: () => void;
}) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-primary/60 flex items-center justify-center p-4 z-50"
			onClick={onClose}
		>
			<div
				className="bg-secondary rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h3 className="text-lg font-semibold text-primary">
						Row Details
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
					>
						<X />
					</button>
				</div>
				<div className="p-6 overflow-y-auto max-h-[60vh]">
					<div className="space-y-4">
						{columns.map((column) => (
							<div
								key={column}
								className="border-b border-gray-100 pb-3 last:border-b-0"
							>
								<div className="font-semibold text-gray-700 mb-1">
									{column}
								</div>
								<div className="text-primary break-words">
									{row[column] === null ? (
										<span className="text-gray-400 italic">
											null
										</span>
									) : (
										String(row[column])
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
