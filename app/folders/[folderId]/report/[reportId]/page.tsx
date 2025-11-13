'use client';
import { use, useMemo, useState } from 'react';
import HeaderBar from '@/components/header-bar';
import PresetReportBuilder from '@/components/preset-report-builder';
import AIReportBuilder from '@/components/ai-report-builder';
import VisualQueryBuilder from '@/components/visual-query-builder';
import {
	useReport,
	useDirectSqlExecution,
	useSchema,
} from '@/lib/hooks/use-api';
import { ChevronRight, Clock, Download, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { isAdmin } from '@/lib/auth-utils';
import { formatExecutionTime } from '@/lib/utils';

interface QueryRow {
	[key: string]: string | number | boolean | null;
}

export default function ReportPage({
	params,
}: {
	params: Promise<{ folderId: string; reportId: string }>;
}) {
	const resolvedParams = use(params);
	const folderId = parseInt(resolvedParams.folderId);
	const reportId = parseInt(resolvedParams.reportId);

	const reportQuery = useReport(reportId);
	const schemaQuery = useSchema();
	const directSqlExecution = useDirectSqlExecution();

	const report = reportQuery.data?.report;
	const parameters = reportQuery.data?.parameters || [];
	const schemaData = schemaQuery.data || null;

	const [isEditingInBuilder, setIsEditingInBuilder] = useState(false);

	const handleExecuteQuery = (sql: string) => {
		directSqlExecution.mutate(
			{ sql },
			{
				onError: (error) => {
					console.error(error.message);
				},
			}
		);
	};

	const downloadCSV = () => {
		const queryResult = directSqlExecution.data?.result;
		if (!queryResult?.rows || queryResult.rows.length === 0) return;

		// Get column headers
		const headers = Object.keys(queryResult.rows[0]);

		// Convert rows to CSV format
		const csvRows = [];
		csvRows.push(headers.join(','));

		for (const row of queryResult.rows) {
			const values = headers.map((header) => {
				const value = row[header];
				// Handle null values
				if (value === null) return '';
				// Escape quotes and wrap in quotes if contains comma, quote, or newline
				const stringValue = String(value);
				if (
					stringValue.includes(',') ||
					stringValue.includes('"') ||
					stringValue.includes('\n')
				) {
					return `"${stringValue.replace(/"/g, '""')}"`;
				}
				return stringValue;
			});
			csvRows.push(values.join(','));
		}

		const csvContent = csvRows.join('\n');

		// Create blob and download
		const blob = new Blob([csvContent], {
			type: 'text/csv;charset=utf-8;',
		});
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);

		link.setAttribute('href', url);
		link.setAttribute(
			'download',
			`${report?.name || 'report'}_${new Date()
				.toISOString()
				.slice(0, 10)}.csv`
		);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		toast.success('CSV downloaded successfully');
	};

	const queryResult = directSqlExecution.data?.result;

	// Memoize the results table
	const memoizedResultsTable = useMemo(() => {
		if (!queryResult?.rows || queryResult.rows.length === 0) {
			return (
				<div className="bg-secondary rounded-md border border-gray-200 p-4 text-center text-gray-600">
					No results found
				</div>
			);
		}

		return (
			<div className="bg-secondary rounded-md border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto max-h-[500px] overflow-y-auto">
					<table className="w-full text-sm">
						<thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
							<tr>
								{Object.keys(queryResult.rows[0]).map(
									(column) => (
										<th
											key={column}
											className="px-4 py-3 text-left font-semibold text-primary"
										>
											{column}
										</th>
									)
								)}
							</tr>
						</thead>
						<tbody>
							{queryResult.rows.map(
								(row: QueryRow, index: number) => (
									<tr
										key={index}
										className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
									>
										{Object.values(row).map(
											(value: any, colIndex: number) => (
												<td
													key={colIndex}
													className="px-4 py-3 text-primary max-w-xs truncate"
													title={String(value)}
												>
													{value === null ? (
														<span className="text-gray-400 italic">
															null
														</span>
													) : (
														String(value)
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
		);
	}, [queryResult]);

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderBar />

			<div className="flex-1 p-8">
				<div>
					{/* Breadcrumb and Header Actions */}
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-2 text-sm text-gray-600">
							<Link
								href="/folders"
								className="hover:text-primary"
							>
								Folders
							</Link>
							<ChevronRight size={16} />
							<Link
								href={`/folders/${folderId}`}
								className="hover:text-primary"
							>
								Folder
							</Link>
							<ChevronRight size={16} />
							<span className="text-primary font-medium">
								{report?.name || 'Loading...'}
							</span>
						</div>
						{report?.type === 'visual' &&
							process.env.NEXT_PUBLIC_EXPERIMENTAL === 'true' &&
							isAdmin() && (
								<Button
									onClick={() => setIsEditingInBuilder(true)}
									variant="outline"
									className="cursor-pointer"
								>
									<Edit size={16} className="mr-2" />
									Edit Report
								</Button>
							)}
					</div>

					{/* Loading State */}
					{reportQuery.isLoading && (
						<div className="flex items-center justify-center py-12">
							<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
						</div>
					)}

					{/* Error State */}
					{reportQuery.error && (
						<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
							<p className="font-semibold">Error</p>
							<p>{reportQuery.error.message}</p>
						</div>
					)}

					{/* Report Builder */}
					{report && (
						<>
							{report.type === 'ai' && report.base_sql ? (
								<AIReportBuilder
									reportName={report.name}
									reportDescription={report.description}
									baseSql={report.base_sql}
									parameters={parameters}
									schemaData={schemaData}
									onExecuteQuery={handleExecuteQuery}
									isPending={directSqlExecution.isPending}
								/>
							) : (
								<PresetReportBuilder
									reportName={report.name}
									reportDescription={report.description}
									queryConfig={report.query_config}
									parameters={parameters}
									schemaData={schemaData}
									onExecuteQuery={handleExecuteQuery}
									isPending={directSqlExecution.isPending}
								/>
							)}

							{/* Results Section */}
							{queryResult && (
								<div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-semibold text-primary flex items-center">
											Results
											{queryResult.rowCount !==
												undefined && (
												<span className="ml-2 text-sm font-normal text-gray-600">
													({queryResult.rowCount}{' '}
													rows)
												</span>
											)}
											{directSqlExecution.data
												?.executionTime && (
												<div className="flex items-center ml-4 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
													<Clock
														size={16}
														className="inline-block mr-2"
													/>
													{formatExecutionTime(
														directSqlExecution.data
															?.executionTime || 0
													)}
												</div>
											)}
										</h3>
										{queryResult.rows &&
											queryResult.rows.length > 0 && (
												<Button
													onClick={downloadCSV}
													className="cursor-pointer"
												>
													<Download size={16} />
												</Button>
											)}
									</div>
									{memoizedResultsTable}
								</div>
							)}

							{/* Loading State for Query Execution */}
							{directSqlExecution.isPending && (
								<div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
									<div className="flex items-center justify-center py-12">
										<div className="flex items-center gap-3">
											<div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
											<span className="text-gray-600">
												Executing query...
											</span>
										</div>
									</div>
								</div>
							)}

							{/* Error State for Query Execution */}
							{directSqlExecution.error && (
								<div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
									<p className="font-semibold">Query Error</p>
									<p>{directSqlExecution.error.message}</p>
								</div>
							)}
						</>
					)}

					{/* Visual Query Builder for Editing */}
					{report?.type === 'visual' && (
						<VisualQueryBuilder
							isOpen={isEditingInBuilder}
							onClose={() => {
								setIsEditingInBuilder(false);
								// Refresh report data after closing
								reportQuery.refetch();
							}}
							onExecuteQuery={handleExecuteQuery}
							schemaData={schemaData}
							mode="update"
							initialQuery={report.query_config}
							reportId={reportId}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
