'use client';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, History, Clock, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface QueryHistoryItem {
	id: number;
	natural_query: string;
	generated_sql: string;
	timestamp: string;
	user_id: string;
}

interface QueryHistoryProps {
	onSelectQuery: (query: string) => void;
}

export default function QueryHistory({ onSelectQuery }: QueryHistoryProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [history, setHistory] = useState<QueryHistoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const fetchHistory = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('/api/history');
			if (response.ok) {
				const data = await response.json();
				setHistory(data.history || []);
			}
		} catch (error) {
			console.error('Failed to fetch history:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (isOpen) {
			fetchHistory();
		}
	}, [isOpen]);

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

	return (
		<>
			{/* Toggle Button */}
			{!isOpen && (
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="fixed left-5 top-20 z-10 bg-black text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition-all duration-200"
				>
					<History size={20} />
				</button>
			)}

			{/* Sidebar */}
			<div
				className={`
        fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-xl transition-transform duration-300 z-30
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        w-full sm:w-96 md:w-80 lg:w-96
      `}
			>
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<History size={20} />
						Query History
					</h2>
					<button
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<ChevronLeft size={20} />
					</button>
				</div>

				<div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
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
											onClick={() =>
												onSelectQuery(
													item.natural_query
												)
											}
											className="text-left flex-1 hover:text-blue-600 transition-colors"
											title="Click to reuse this query"
										>
											<p className="text-sm font-medium text-gray-900 line-clamp-2">
												{item.natural_query}
											</p>
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
