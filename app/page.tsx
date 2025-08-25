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

interface QueryRow {
	[key: string]: string | number | boolean | null;
}

interface QueryResult {
	rows: QueryRow[];
	rowCount: number;
	fields: Array<{
		name: string;
		dataTypeID: number;
	}>;
}

export default function page() {
	const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
	const [generatedSql, setGeneratedSql] = useState('');
	const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedRow, setSelectedRow] = useState<QueryRow | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSqlExpanded, setIsSqlExpanded] = useState(true);

	const handleQuery = async () => {
		setIsLoading(true);
		setError(null);
		setGeneratedSql('');
		setQueryResult(null);

		try {
			const response = await fetch('/api/query', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ query: naturalLanguageQuery }),
			});

			const data = await response.json();

			if (!response.ok) {
				// Handle specific error types
				if (response.status === 400) {
					if (data.error?.includes('Only SELECT queries')) {
						throw new Error(
							'This action is not allowed. Only SELECT queries are permitted for security reasons.'
						);
					} else if (
						data.error?.includes('Query parameter is required')
					) {
						throw new Error('Please enter a valid query.');
					} else {
						throw new Error(data.error || 'Invalid request.');
					}
				} else if (response.status === 500) {
					throw new Error(
						'Failed to generate or execute query. Please try again.'
					);
				} else {
					throw new Error(
						data.error || 'An unexpected error occurred.'
					);
				}
			}

			setGeneratedSql(data.sql);
			setQueryResult(data.result);
		} catch (err: any) {
			setError(err.message);
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(generatedSql);
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

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			<HeaderBar />

			<div className="flex-1 flex items-center justify-center p-4">
				<div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-200 p-8">
					{/* Header */}
					<div className="text-center mb-8">
						<p className="text-gray-600 text-lg italic">
							Speak to your database using natural language
						</p>
					</div>

					{/* Input Section */}
					<form
						onSubmit={(e) => {
							e.preventDefault();
							if (!isLoading && naturalLanguageQuery.trim()) {
								handleQuery();
							}
						}}
						className="space-y-4 mb-8"
					>
						<div className="relative">
							<input
								type="text"
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all text-base"
								placeholder="Show me all users from New York City"
								value={naturalLanguageQuery}
								onChange={(e) =>
									setNaturalLanguageQuery(e.target.value)
								}
								disabled={isLoading}
							/>
						</div>

						<button
							type="submit"
							className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
								isLoading || !naturalLanguageQuery.trim()
									? 'bg-gray-300 cursor-not-allowed'
									: 'bg-black hover:bg-gray-800 active:bg-gray-900 shadow-sm'
							}`}
							disabled={isLoading || !naturalLanguageQuery.trim()}
						>
							{isLoading ? (
								<div className="flex items-center justify-center space-x-2">
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									<span>Processing...</span>
								</div>
							) : (
								'Generate & Execute Query'
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
