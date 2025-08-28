'use client';
import RowDetailsModal from '@/components/ui/row-details-modal';
import HeaderBar from '@/components/header-bar';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import QueryHistory from '@/components/query-history';
import { cn } from '@/lib/utils';
import { useQueryExecution } from '@/lib/hooks/use-api';

interface QueryRow {
	[key: string]: string | number | boolean | null;
}

export default function page() {
	const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
	const [selectedRow, setSelectedRow] = useState<QueryRow | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSqlExpanded, setIsSqlExpanded] = useState(true);

	const queryExecution = useQueryExecution();

	const handleQuery = (queryToExecute?: string) => {
		const query = queryToExecute || naturalLanguageQuery;
		if (!query.trim()) return;

		queryExecution.mutate(
			{ query },
			{
				onError: (error) => {
					toast.error(error.message);
				},
			}
		);
	};

	const copyToClipboard = async () => {
		if (!queryExecution.data?.sql) return;

		try {
			await navigator.clipboard.writeText(queryExecution.data.sql);
			toast.success('SQL copied to clipboard');
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
	};

	const handleRowClick = (row: QueryRow) => {
		setSelectedRow(row);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setSelectedRow(null);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!queryExecution.isPending && naturalLanguageQuery.trim()) {
			handleQuery();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.ctrlKey && e.key === 'Enter') {
			e.preventDefault();
			if (!queryExecution.isPending && naturalLanguageQuery.trim()) {
				handleQuery();
			}
		}
	};

	const handleHistorySelect = (query: string) => {
		setNaturalLanguageQuery(query);
	};

	const handleHistoryExecute = (query: string) => {
		setNaturalLanguageQuery(query);
		handleQuery(query);
	};

	const isLoading = queryExecution.isPending;
	const error = queryExecution.error?.message;
	const generatedSql = queryExecution.data?.sql;
	const queryResult = queryExecution.data?.result;

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderBar />

			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-4xl">
					{/* Input Section */}
					<form onSubmit={handleSubmit} className="space-y-4 mb-8">
						<div className="relative">
							<Textarea
								className="shadow-sm p-3"
								placeholder="Speak to your database using natural language"
								value={naturalLanguageQuery}
								onChange={(e) =>
									setNaturalLanguageQuery(e.target.value)
								}
								onKeyDown={handleKeyDown}
								disabled={isLoading}
								rows={5}
							/>
						</div>

						<button
							type="submit"
							className={cn(
								'cursor-pointer w-full py-3 rounded-lg font-semibold text-white transition-all duration-200',
								isLoading || !naturalLanguageQuery.trim()
									? 'bg-gray-300 cursor-not-allowed'
									: 'bg-black hover:bg-gray-800 active:bg-gray-900 shadow-sm'
							)}
							disabled={isLoading || !naturalLanguageQuery.trim()}
						>
							{isLoading ? (
								<div className="flex items-center justify-center space-x-2">
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									<span>Processing...</span>
								</div>
							) : (
								'Submit'
							)}
						</button>
					</form>

					{/* Error Display */}
					{error && (
						<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
							<div className="flex items-start space-x-2">
								<div className="text-red-500 mt-0.5">⚠️</div>
								<div>
									<p className="font-semibold text-red-900">
										Error
									</p>
									<p className="text-red-700">{error}</p>
								</div>
							</div>
						</div>
					)}

					{/* Results Section */}
					{(generatedSql || queryResult) && (
						<div className="space-y-6">
							{/* Generated SQL */}
							{generatedSql && (
								<Collapsible
									open={isSqlExpanded}
									onOpenChange={setIsSqlExpanded}
									className="bg-gray-50 rounded-lg border border-gray-200"
								>
									<CollapsibleTrigger className="w-full p-6 text-left hover:bg-gray-100 transition-colors rounded-lg">
										<h2 className="text-lg font-semibold text-black flex items-center justify-between">
											<span className="flex items-center">
												<span className="text-black mr-2">
													📝
												</span>
												Generated SQL Query
											</span>
											<span className="text-gray-500 text-sm">
												{isSqlExpanded ? (
													<ChevronDown size={16} />
												) : (
													<ChevronRight size={16} />
												)}
											</span>
										</h2>
									</CollapsibleTrigger>
									<CollapsibleContent className="px-6 pb-6">
										<div
											className="bg-white rounded-md border border-gray-200 p-4 cursor-pointer"
											onClick={copyToClipboard}
										>
											<code className="text-sm text-black font-mono whitespace-pre-wrap break-all pr-12">
												{generatedSql}
											</code>
										</div>
									</CollapsibleContent>
								</Collapsible>
							)}

							{/* Query Results */}
							{queryResult && (
								<div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
									<h2 className="text-lg font-semibold text-black mb-3 flex items-center">
										<span className="text-green-600 mr-2">
											📊
										</span>
										Query Results
										{queryResult.rowCount !== undefined && (
											<span className="ml-2 text-sm font-normal text-gray-600">
												({queryResult.rowCount} rows)
											</span>
										)}
									</h2>

									{/* Results Table */}
									{queryResult.rows &&
									queryResult.rows.length > 0 ? (
										<div className="bg-white rounded-md border border-gray-200 overflow-hidden">
											<div className="overflow-x-auto">
												<table className="w-full text-sm">
													<thead className="bg-gray-100 border-b border-gray-200">
														<tr>
															{Object.keys(
																queryResult
																	.rows[0]
															).map((column) => (
																<th
																	key={column}
																	className="px-4 py-3 text-left font-semibold text-black"
																>
																	{column}
																</th>
															))}
														</tr>
													</thead>
													<tbody>
														{queryResult.rows.map(
															(
																row: QueryRow,
																index: number
															) => (
																<tr
																	key={index}
																	className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
																	onClick={() =>
																		handleRowClick(
																			row
																		)
																	}
																>
																	{Object.values(
																		row
																	).map(
																		(
																			value: any,
																			colIndex: number
																		) => (
																			<td
																				key={
																					colIndex
																				}
																				className="px-4 py-3 text-black max-w-xs truncate"
																				title={String(
																					value
																				)}
																			>
																				{value ===
																				null ? (
																					<span className="text-gray-400 italic">
																						null
																					</span>
																				) : (
																					String(
																						value
																					)
																				)}
																			</td>
																		)
																	)}
																</tr>
															)
														)}
													</tbody>
												</table>
											</div>
										</div>
									) : (
										<div className="bg-white rounded-md border border-gray-200 p-4 text-center text-gray-600">
											No results found
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Query History Sidebar */}
			<QueryHistory
				onSelectQuery={handleHistorySelect}
				onExecuteQuery={handleHistoryExecute}
			/>

			{/* Row Details Modal */}
			{selectedRow && (
				<RowDetailsModal
					row={selectedRow}
					columns={Object.keys(selectedRow)}
					isOpen={isModalOpen}
					onClose={closeModal}
				/>
			)}
		</div>
	);
}
