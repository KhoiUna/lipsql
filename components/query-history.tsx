'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, Clock, Copy, History } from 'lucide-react';
import { useHistory } from '@/lib/hooks/use-api';

interface QueryHistoryProps {
	onSelectQuery: (query: string) => void;
}

export default function QueryHistory({ onSelectQuery }: QueryHistoryProps) {
	const [isOpen, setIsOpen] = useState(false);
	const historyQuery = useHistory();

	const copySql = async (sql: string) => {
		try {
			await navigator.clipboard.writeText(sql);
			toast.success('SQL copied to clipboard');
		} catch (error) {
			toast.error('Failed to copy SQL');
		}
	};

	const formatTimestamp = (timestamp: string) => {
		return new Date(timestamp).toLocaleString();
	};

	const history = historyQuery.data?.history || [];
	const isLoading = historyQuery.isLoading;
	const error = historyQuery.error;

	return (
		<>
			{/* Toggle Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="fixed top-20 left-4 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors z-40"
				title="Query History"
			>
				<History size={20} />
			</button>

			{/* Backdrop */}
			{isOpen && (
				<div
					className="fixed inset-0 bg-black/20 z-50"
					onClick={() => setIsOpen(false)}
				/>
			)}

			{/* Side Panel */}
			<div
				className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 z-50 w-80 ${
					isOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<Clock size={20} />
						Query History
					</h2>
					<button
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<ChevronLeft size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
						</div>
					) : error ? (
						<div className="text-center text-red-500 py-8">
							Failed to load history
						</div>
					) : history.length === 0 ? (
						<div className="text-center text-gray-500 py-8">
							<History
								size={48}
								className="mx-auto mb-4 opacity-50"
							/>
							<p>No queries yet</p>
							<p className="text-sm">
								Your query history will appear here
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{history.map((item) => (
								<div
									key={item.id}
									className="bg-gray-50 rounded-lg p-3 border border-gray-200"
								>
									<div className="flex items-start justify-between gap-2 mb-2">
										<button
											onClick={() => {
												onSelectQuery(
													item.natural_query
												);
												setIsOpen(false);
											}}
											className="text-left flex-1 hover:text-black/50 transition-colors cursor-pointer text-sm font-medium text-gray-900 line-clamp-2"
											title="Click to reuse this query"
										>
											{item.natural_query}
										</button>
										<button
											onClick={() =>
												copySql(item.generated_sql)
											}
											className="p-1 hover:bg-gray-200 rounded transition-colors"
											title="Copy SQL"
										>
											<Copy size={14} />
										</button>
									</div>

									<div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
										<Clock size={12} />
										{formatTimestamp(item.timestamp)}
									</div>

									<code className="text-xs text-gray-700 bg-white p-2 rounded border block overflow-hidden">
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
