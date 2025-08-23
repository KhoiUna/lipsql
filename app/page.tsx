'use client';
import { useState } from 'react';
import { toast } from 'sonner';

export default function page() {
	const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
	const [generatedSql, setGeneratedSql] = useState('');
	const [queryResult, setQueryResult] = useState<any>(null); // FIX
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

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

			if (!response.ok) {
				throw new Error('Failed to generate or execute query.');
			}

			const data = await response.json();

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
			toast.success('Event has been created');
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
	};

	return (
		<div className='min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4'>
			<div className='w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-200 p-8'>
				{/* Header */}
				<div className='text-center mb-8'>
					<h1 className='text-4xl font-bold text-black mb-3'>
						PlainSQL
					</h1>
					<p className='text-gray-600 text-lg'>
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
					className='space-y-4 mb-8'
				>
					<div className='relative'>
						<input
							type='text'
							className='w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-500 text-base'
							placeholder="e.g., 'Show me all users from New York City'"
							value={naturalLanguageQuery}
							onChange={(e) =>
								setNaturalLanguageQuery(e.target.value)
							}
							disabled={isLoading}
						/>
					</div>

					<button
						type='submit'
						className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
							isLoading || !naturalLanguageQuery.trim()
								? 'bg-gray-300 cursor-not-allowed'
								: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm'
						}`}
						disabled={isLoading || !naturalLanguageQuery.trim()}
					>
						{isLoading ? (
							<div className='flex items-center justify-center space-x-2'>
								<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
								<span>Processing...</span>
							</div>
						) : (
							'Generate & Execute Query'
						)}
					</button>
				</form>

				{/* Error Display */}
				{error && (
					<div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6'>
						<div className='flex items-start space-x-2'>
							<div className='text-red-500 mt-0.5'>⚠️</div>
							<div>
								<p className='font-semibold text-red-900'>
									Error
								</p>
								<p className='text-red-700'>{error}</p>
							</div>
						</div>
					</div>
				)}

				{/* Results Section */}
				{(generatedSql || queryResult) && (
					<div className='space-y-6'>
						{/* Generated SQL */}
						{generatedSql && (
							<div className='bg-gray-50 rounded-lg p-6 border border-gray-200'>
								<h2 className='text-lg font-semibold text-black mb-3 flex items-center'>
									<span className='text-blue-600 mr-2'>
										📝
									</span>
									Generated SQL Query
								</h2>
								<div
									className='bg-white rounded-md border border-gray-200 p-4 cursor-pointer'
									onClick={copyToClipboard}
								>
									<code className='text-sm text-black font-mono whitespace-pre-wrap break-all pr-12'>
										{generatedSql}
									</code>
								</div>
							</div>
						)}

						{/* Query Results */}
						{queryResult && (
							<div className='bg-gray-50 rounded-lg p-6 border border-gray-200'>
								<h2 className='text-lg font-semibold text-black mb-3 flex items-center'>
									<span className='text-green-600 mr-2'>
										📊
									</span>
									Query Results
									{queryResult.rowCount !== undefined && (
										<span className='ml-2 text-sm font-normal text-gray-600'>
											({queryResult.rowCount} rows)
										</span>
									)}
								</h2>

								{/* Results Table */}
								{queryResult.rows &&
								queryResult.rows.length > 0 ? (
									<div className='bg-white rounded-md border border-gray-200 overflow-hidden'>
										<div className='overflow-x-auto'>
											<table className='w-full text-sm'>
												<thead className='bg-gray-100 border-b border-gray-200'>
													<tr>
														{Object.keys(
															queryResult.rows[0]
														).map((column) => (
															<th
																key={column}
																className='px-4 py-3 text-left font-semibold text-black'
															>
																{column}
															</th>
														))}
													</tr>
												</thead>
												<tbody>
													{queryResult.rows.map(
														(
															row: any,
															index: number
														) => (
															<tr
																key={index}
																className='border-b border-gray-100 last:border-b-0 hover:bg-gray-50'
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
																			className='px-4 py-3 text-black max-w-xs truncate'
																			title={String(
																				value
																			)}
																		>
																			{value ===
																			null ? (
																				<span className='text-gray-400 italic'>
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
									<div className='bg-white rounded-md border border-gray-200 p-4 text-center text-gray-600'>
										No results found
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
