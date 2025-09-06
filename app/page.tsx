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
import SavedQueries from '@/components/saved-queries';
import { cn } from '@/lib/utils';
import {
	useQueryExecution,
	useDirectSqlExecution,
	useSaveQuery,
} from '@/lib/hooks/use-api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface QueryRow {
	[key: string]: string | number | boolean | null;
}

// Function to detect if input is a valid SQL statement
const isSqlStatement = (input: string): boolean => {
	const trimmed = input.trim().toLowerCase();

	// Check if it starts with common SQL keywords
	const sqlKeywords = [
		'select',
		'with',
		'insert',
		'update',
		'delete',
		'create',
		'drop',
		'alter',
		'truncate',
		'explain',
		'describe',
		'show',
		'declare',
	];

	const startsWithSqlKeyword = sqlKeywords.some((keyword) =>
		trimmed.startsWith(keyword)
	);

	// Additional checks for more complex SQL patterns
	const hasSqlPatterns =
		trimmed.includes(' from ') ||
		trimmed.includes(' where ') ||
		trimmed.includes(' join ') ||
		trimmed.includes(' group by ') ||
		trimmed.includes(' order by ') ||
		trimmed.includes(' having ') ||
		trimmed.includes(' union ') ||
		trimmed.includes(';') ||
		(trimmed.includes('(') && trimmed.includes(')')) ||
		trimmed.includes(' as ') ||
		trimmed.includes(' count(') ||
		trimmed.includes(' sum(') ||
		trimmed.includes(' avg(') ||
		trimmed.includes(' max(') ||
		trimmed.includes(' min(');

	return startsWithSqlKeyword && hasSqlPatterns;
};

export default function page() {
	const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
	const [sqlQuery, setSqlQuery] = useState('');
	const [selectedRow, setSelectedRow] = useState<QueryRow | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSqlExpanded, setIsSqlExpanded] = useState(true);
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [saveQueryName, setSaveQueryName] = useState('');

	const queryExecution = useQueryExecution();
	const directSqlExecution = useDirectSqlExecution();
	const saveQuery = useSaveQuery();

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
		if (!generatedSql) return;

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isLoading) return;

		const currentInput = naturalLanguageQuery.trim();

		if (isSqlStatement(currentInput)) {
			// Input is detected as SQL, run as direct SQL
			handleDirectSql(currentInput);
		} else if (currentInput) {
			// Input is natural language, use AI to convert to SQL
			handleQuery();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.ctrlKey && e.key === 'Enter') {
			e.preventDefault();
			if (isLoading) return;

			const currentInput = naturalLanguageQuery.trim();

			if (isSqlStatement(currentInput)) {
				handleDirectSql(currentInput);
			} else if (currentInput) {
				handleQuery();
			}
		}
	};

	const handleHistorySelect = (query: string) => {
		setNaturalLanguageQuery(query);
		setSqlQuery('');
	};

	const handleHistoryExecute = (sql: string) => {
		setSqlQuery(sql);
		setNaturalLanguageQuery(''); // Clear natural language query
		handleDirectSql(sql);
	};

	const clearInput = () => {
		setNaturalLanguageQuery('');
		setSqlQuery('');
	};

	const handleDirectSql = (sqlToExecute: string) => {
		setSqlQuery(sqlToExecute);

		directSqlExecution.mutate(
			{ sql: sqlToExecute },
			{
				onError: (error) => {
					toast.error(error.message);
				},
			}
		);
	};

	const handleSaveQuery = (e: React.FormEvent) => {
		e.preventDefault();
		if (!generatedSql) {
			toast.error('No query to save');
			return;
		}

		if (!saveQueryName.trim()) {
			toast.error('Please enter a name for the query');
			return;
		}

		saveQuery.mutate(
			{
				savedName: saveQueryName.trim(),
				naturalQuery: sqlQuery
					? null
					: naturalLanguageQuery.trim() || null,
				generatedSql: generatedSql,
			},
			{
				onSuccess: () => {
					toast.success('Query saved successfully');
					setShowSaveDialog(false);
					setSaveQueryName('');
				},
				onError: (error) => {
					toast.error(error.message);
				},
			}
		);
	};

	const isLoading = queryExecution.isPending || directSqlExecution.isPending;
	const error =
		queryExecution.error?.message || directSqlExecution.error?.message;
	const generatedSql = sqlQuery
		? directSqlExecution.data?.sql
		: queryExecution.data?.sql;
	const queryResult =
		directSqlExecution.data?.result || queryExecution.data?.result;

	// Determine if current input is SQL for button text
	const currentInput = naturalLanguageQuery.trim();
	const isCurrentInputSql = isSqlStatement(currentInput);

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderBar />

			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-4xl">
					<h1 className="text-center mb-4 text-2xl">LipSQL</h1>

					{/* Input Section */}
					<form onSubmit={handleSubmit} className="space-y-4 mb-8">
						<div className="relative">
							<Textarea
								className="shadow-sm p-3"
								placeholder={
									'Speak to your database using natural language or type SQL directly'
								}
								value={naturalLanguageQuery}
								onChange={(e) => {
									const value = e.target.value;
									setNaturalLanguageQuery(value);
									// Clear sqlQuery when user types in main input
									if (sqlQuery) setSqlQuery('');
								}}
								onKeyDown={handleKeyDown}
								disabled={isLoading}
								rows={5}
							/>
						</div>

						<div className="flex gap-2">
							<Button
								type="submit"
								className={cn(
									'cursor-pointer flex-1 py-3 rounded-lg font-semibold text-secondary transition-all duration-200',
									isLoading || !naturalLanguageQuery.trim()
										? 'bg-gray-300 cursor-not-allowed'
										: 'bg-primary hover:bg-gray-800 active:bg-gray-900 shadow-sm'
								)}
								disabled={
									isLoading || !naturalLanguageQuery.trim()
								}
							>
								{isLoading ? (
									<div className="flex items-center justify-center space-x-2">
										<div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
										<span>Processing...</span>
									</div>
								) : isCurrentInputSql ? (
									'Run SQL'
								) : (
									'Submit'
								)}
							</Button>
							{naturalLanguageQuery.trim() && (
								<Button
									type="button"
									onClick={clearInput}
									className="px-4 py-3 rounded-lg font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
								>
									Clear
								</Button>
							)}
						</div>
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
										<h2 className="text-lg font-semibold text-primary flex items-center justify-between">
											<span className="flex items-center">
												<span className="text-primary mr-2">
													{sqlQuery ? '⚡' : '📝'}
												</span>
												{sqlQuery
													? 'Executed SQL Query'
													: 'Generated SQL Query'}
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
										<div className="space-y-4">
											<div
												className="bg-secondary rounded-md border border-gray-200 p-4 cursor-pointer"
												onClick={copyToClipboard}
											>
												<code className="text-sm text-primary font-mono whitespace-pre-wrap break-all pr-12">
													{generatedSql}
												</code>
											</div>
											<Button
												onClick={() =>
													setShowSaveDialog(true)
												}
												className="font-medium w-full bg-primary text-secondary rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
											>
												💾 Save Query
											</Button>
										</div>
									</CollapsibleContent>
								</Collapsible>
							)}

							{/* Query Results */}
							{queryResult && (
								<div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
									<h2 className="text-lg font-semibold text-primary mb-3 flex items-center">
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
										<div className="bg-secondary rounded-md border border-gray-200 overflow-hidden">
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
																	className="px-4 py-3 text-left font-semibold text-primary"
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
																				className="px-4 py-3 text-primary max-w-xs truncate"
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
										<div className="bg-secondary rounded-md border border-gray-200 p-4 text-center text-gray-600">
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

			{/* Saved Queries Sidebar */}
			<SavedQueries
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

			{/* Save Query Dialog */}
			{showSaveDialog && (
				<div className="fixed inset-0 bg-primary/60 z-50 flex items-center justify-center p-4">
					<div className="bg-secondary rounded-lg p-6 w-full max-w-md">
						<h3 className="text-lg font-semibold mb-4">
							Save Query
						</h3>
						<form className="space-y-4" onSubmit={handleSaveQuery}>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Query Name
								</label>

								<Input
									type="text"
									value={saveQueryName}
									onChange={(e) =>
										setSaveQueryName(e.target.value)
									}
									placeholder="Enter a name for this query"
									autoFocus
								/>
							</div>

							<div className="flex gap-3">
								<Button
									type="submit"
									disabled={
										saveQuery.isPending ||
										!saveQueryName.trim()
									}
									className="flex-1 cursor-pointer"
								>
									{saveQuery.isPending ? 'Saving...' : 'Save'}
								</Button>
								<Button
									type="button"
									onClick={() => {
										setShowSaveDialog(false);
										setSaveQueryName('');
									}}
									className="flex-1 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
								>
									Cancel
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
