'use client';

import { useState, useEffect } from 'react';
import {
	useChatSession,
	useIdentifyParameters,
	useExecuteChatQuery,
} from '@/lib/hooks/use-api';
import ChatInterface from '@/components/chat-interface';
import ChatParameterPanel from '@/components/chat-parameter-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface QueryResult {
	rows: any[];
	rowCount: number;
	fields: Array<{
		name: string;
		dataTypeID: number;
	}>;
}

export default function ChatPage() {
	const [detectedParameters, setDetectedParameters] = useState<any[]>([]);
	const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
	const [currentSql, setCurrentSql] = useState('');
	const [showParameterPanel, setShowParameterPanel] = useState(false);

	// API hooks
	const { data: sessionData, isLoading: sessionLoading } = useChatSession();
	const identifyParameters = useIdentifyParameters();
	const executeQuery = useExecuteChatQuery();

	// Load session data
	useEffect(() => {
		if (sessionData?.session) {
			setDetectedParameters(sessionData.parameters || []);
			setCurrentSql(sessionData.session.base_sql || '');
			setShowParameterPanel(
				sessionData.parameters && sessionData.parameters.length > 0
			);
		}
	}, [sessionData]);

	const handleParameterDetected = async (parameters: any[]) => {
		// This will be called when the chat interface detects SQL
		// For now, we'll trigger parameter identification manually
		if (currentSql) {
			try {
				const result = await identifyParameters.mutateAsync({
					sql: currentSql,
				});
				setDetectedParameters(result.parameters);
				setShowParameterPanel(true);
			} catch (error) {
				console.error('Failed to identify parameters:', error);
				toast.error('Failed to identify parameters');
			}
		}
	};

	const handleExecuteQuery = async (
		sql: string,
		parameters: Record<string, any>
	) => {
		try {
			const result = await executeQuery.mutateAsync({ sql, parameters });
			setQueryResult(result.result);
			toast.success('Query executed successfully');
		} catch (error) {
			console.error('Failed to execute query:', error);
			toast.error('Failed to execute query');
		}
	};

	const downloadCSV = () => {
		if (!queryResult?.rows) return;

		const headers = queryResult.fields.map((field) => field.name);
		const csvContent = [
			headers.join(','),
			...queryResult.rows.map((row) =>
				headers
					.map((header) => {
						const value = row[header];
						// Escape commas and quotes in CSV
						if (
							typeof value === 'string' &&
							(value.includes(',') || value.includes('"'))
						) {
							return `"${value.replace(/"/g, '""')}"`;
						}
						return value;
					})
					.join(',')
			),
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'query-results.csv';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	};

	const refreshSession = () => {
		window.location.reload();
	};

	if (sessionLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="flex items-center space-x-2">
					<RefreshCw className="w-4 h-4 animate-spin" />
					<span>Loading chat session...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 max-w-7xl">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-900">AI Chat</h1>
				<p className="text-gray-600 mt-2">
					Chat with AI to build and execute SQL queries with dynamic
					parameters
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Chat Interface */}
				<div className="lg:col-span-2">
					<Card className="h-[600px]">
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span>Chat with AI</span>
								<Button
									variant="outline"
									size="sm"
									onClick={refreshSession}
								>
									<RefreshCw className="w-4 h-4 mr-2" />
									Refresh
								</Button>
							</CardTitle>
						</CardHeader>
						<CardContent className="p-0 h-full">
							<ChatInterface
								className="h-full"
								onParameterDetected={handleParameterDetected}
							/>
						</CardContent>
					</Card>
				</div>

				{/* Parameter Panel */}
				<div className="lg:col-span-1">
					{showParameterPanel && detectedParameters.length > 0 && (
						<ChatParameterPanel
							parameters={detectedParameters}
							baseSql={currentSql}
							onExecute={handleExecuteQuery}
							className="mb-6"
						/>
					)}
				</div>
			</div>

			{/* Query Results */}
			{queryResult && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							<span>
								Query Results ({queryResult.rowCount} rows)
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={downloadCSV}
							>
								<Download className="w-4 h-4 mr-2" />
								Download CSV
							</Button>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full border-collapse">
								<thead>
									<tr className="border-b">
										{queryResult.fields.map((field) => (
											<th
												key={field.name}
												className="text-left p-2 font-medium text-gray-700"
											>
												{field.name}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{queryResult.rows.map((row, index) => (
										<tr
											key={index}
											className="border-b hover:bg-gray-50"
										>
											{queryResult.fields.map((field) => (
												<td
													key={field.name}
													className="p-2 text-sm"
												>
													{row[field.name]}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
