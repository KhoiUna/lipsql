'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import {
	ChevronLeft,
	Clock,
	Copy,
	Edit3,
	Play,
	Star,
	Trash2,
	X,
} from 'lucide-react';
import {
	useSavedQueries,
	useUpdateSavedQueryName,
	useDeleteSavedQuery,
} from '@/lib/hooks/use-api';
import { formatTimestamp } from '@/lib/utils';

interface SavedQueriesProps {
	onSelectQuery: (query: string) => void;
	onExecuteQuery: (sql: string) => void;
}

export default function SavedQueries({
	onSelectQuery,
	onExecuteQuery,
}: SavedQueriesProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editName, setEditName] = useState('');

	const savedQueriesQuery = useSavedQueries();
	const updateQueryName = useUpdateSavedQueryName();
	const deleteQuery = useDeleteSavedQuery();

	const copySql = async (sql: string) => {
		try {
			await navigator.clipboard.writeText(sql);
			toast.success('SQL copied to clipboard');
		} catch (error) {
			toast.error('Failed to copy SQL');
		}
	};

	const handleRename = (id: number, currentName: string) => {
		setEditingId(id);
		setEditName(currentName);
	};

	const handleSaveRename = () => {
		if (!editingId || !editName.trim()) {
			toast.error('Please enter a valid name');
			return;
		}

		updateQueryName.mutate(
			{ id: editingId, data: { savedName: editName.trim() } },
			{
				onSuccess: () => {
					toast.success('Query renamed successfully');
					setEditingId(null);
					setEditName('');
				},
				onError: (error) => {
					toast.error(error.message);
				},
			}
		);
	};

	const handleDelete = (id: number, name: string) => {
		if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
			deleteQuery.mutate(id, {
				onSuccess: () => {
					toast.success('Query deleted successfully');
				},
				onError: (error) => {
					toast.error(error.message);
				},
			});
		}
	};

	const savedQueries = savedQueriesQuery.data?.savedQueries || [];
	const isLoading = savedQueriesQuery.isLoading;
	const error = savedQueriesQuery.error;

	return (
		<>
			{/* Toggle Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="cursor-pointer fixed bottom-22 left-5 bg-primary text-secondary p-4 rounded-full shadow-lg hover:bg-gray-800 transition-colors z-40"
				title="Saved Queries"
			>
				<Star size={20} />
			</button>

			{/* Backdrop */}
			{isOpen && (
				<div
					className="fixed inset-0 bg-primary/60 z-50"
					onClick={() => setIsOpen(false)}
				/>
			)}

			{/* Side Panel */}
			<div
				className={`fixed left-0 top-0 h-full bg-secondary border-l border-gray-200 shadow-xl transition-transform duration-300 z-50 w-80 ${
					isOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<Star size={20} />
						Saved Queries
					</h2>
					<button
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
					>
						<ChevronLeft size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
						</div>
					) : error ? (
						<div className="text-center text-red-500 py-8">
							Failed to load saved queries
						</div>
					) : savedQueries.length === 0 ? (
						<div className="text-center text-gray-500 py-8">
							<Star
								size={48}
								className="mx-auto mb-4 opacity-50"
							/>
							<p>No saved queries yet</p>
							<p className="text-sm">
								Save queries to access them here
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{savedQueries.map((item) => (
								<div
									key={item.id}
									className="bg-gray-50 rounded-lg p-3 border border-gray-200"
								>
									<div className="flex items-start justify-between gap-2 mb-2">
										{editingId === item.id ? (
											<div className="flex-1 flex items-center gap-2">
												<input
													type="text"
													value={editName}
													onChange={(e) =>
														setEditName(
															e.target.value
														)
													}
													className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
													autoFocus
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															handleSaveRename();
														} else if (
															e.key === 'Escape'
														) {
															setEditingId(null);
															setEditName('');
														}
													}}
												/>
												<button
													onClick={handleSaveRename}
													disabled={
														updateQueryName.isPending
													}
													className="p-1 hover:bg-green-100 rounded text-green-600 cursor-pointer disabled:opacity-50"
													title="Save"
												>
													<Edit3 size={12} />
												</button>
												<button
													onClick={() => {
														setEditingId(null);
														setEditName('');
													}}
													className="p-1 hover:bg-gray-200 rounded text-gray-600 cursor-pointer"
													title="Cancel"
												>
													<X size={12} />
												</button>
											</div>
										) : (
											<button
												onClick={() => {
													onSelectQuery(
														item.natural_query ||
															item.generated_sql
													);
													setIsOpen(false);
												}}
												className="text-left flex-1 hover:text-primary transition-colors cursor-pointer text-sm font-medium text-gray-900 line-clamp-2"
												title="Click to reuse this query"
											>
												{item.saved_name}
											</button>
										)}

										{!editingId && (
											<div className="flex items-center gap-1">
												<button
													onClick={() => {
														onExecuteQuery(
															item.generated_sql
														);
														setIsOpen(false);
													}}
													className="cursor-pointer p-1 hover:bg-green-100 rounded-lg transition-colors text-green-600"
													title="Execute this SQL"
												>
													<Play size={14} />
												</button>
												<button
													onClick={() =>
														copySql(
															item.generated_sql
														)
													}
													className="cursor-pointer p-1 hover:bg-gray-200 rounded-lg transition-colors"
													title="Copy SQL"
												>
													<Copy size={14} />
												</button>
												<button
													onClick={() =>
														handleRename(
															item.id,
															item.saved_name
														)
													}
													className="cursor-pointer p-1 hover:bg-gray-100 rounded-lg transition-colors text-primary"
													title="Rename"
												>
													<Edit3 size={14} />
												</button>
												<button
													onClick={() =>
														handleDelete(
															item.id,
															item.saved_name
														)
													}
													className="cursor-pointer p-1 hover:bg-red-100 rounded-lg transition-colors text-red-700"
													title="Delete"
												>
													<Trash2 size={14} />
												</button>
											</div>
										)}
									</div>

									<div className="text-xs text-primary mb-2">
										{item.natural_query && (
											<div className="mb-1">
												<span className="font-medium">
													Natural:
												</span>{' '}
												{item.natural_query}
											</div>
										)}
									</div>

									<div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
										<Clock size={12} />
										{formatTimestamp(item.timestamp)}
									</div>

									<code className="text-xs text-gray-700 bg-secondary p-2 rounded border block overflow-hidden">
										{item.generated_sql}
									</code>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
