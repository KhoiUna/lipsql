'use client';
import { useState } from 'react';
import HeaderBar from '@/components/header-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Sparkles, Save, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { isAdmin } from '@/lib/auth-utils';
import { useFolders } from '@/lib/hooks/use-api';

interface DetectedParameter {
	field: string;
	label: string;
	type: 'dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
	default_value: any;
	operator: string;
	position: {
		start: number;
		end: number;
	};
}

export default function ChatPage() {
	const [sql, setSql] = useState('');
	const [detectedParameters, setDetectedParameters] = useState<
		DetectedParameter[]
	>([]);
	const [selectedParameters, setSelectedParameters] = useState<Set<string>>(
		new Set()
	);
	const [parameterLabels, setParameterLabels] = useState<
		Record<string, string>
	>({});
	const [parameterTypes, setParameterTypes] = useState<
		Record<string, string>
	>({});
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [reportName, setReportName] = useState('');
	const [reportDescription, setReportDescription] = useState('');
	const [selectedFolderId, setSelectedFolderId] = useState<number | null>(
		null
	);
	const [isSaving, setIsSaving] = useState(false);

	const foldersQuery = useFolders();
	const folders = foldersQuery.data?.folders || [];

	const handleAnalyzeSQL = async () => {
		if (!sql.trim()) {
			toast.error('Please enter SQL to analyze');
			return;
		}

		setIsAnalyzing(true);
		try {
			const response = await fetch('/api/chat/identify-params', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sql }),
			});

			const data = await response.json();

			if (data.success) {
				setDetectedParameters(data.parameters);
				// Initialize selected parameters (all selected by default)
				setSelectedParameters(
					new Set(
						data.parameters.map((p: DetectedParameter) => p.field)
					)
				);
				// Initialize labels and types
				const labels: Record<string, string> = {};
				const types: Record<string, string> = {};
				data.parameters.forEach((p: DetectedParameter) => {
					labels[p.field] = p.label;
					types[p.field] = p.type;
				});
				setParameterLabels(labels);
				setParameterTypes(types);
				toast.success(`Found ${data.parameters.length} parameter(s)`);
			} else {
				toast.error(data.error || 'Failed to analyze SQL');
			}
		} catch (error) {
			console.error('Analyze SQL error:', error);
			toast.error('Failed to analyze SQL');
		} finally {
			setIsAnalyzing(false);
		}
	};

	const toggleParameter = (field: string) => {
		setSelectedParameters((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(field)) {
				newSet.delete(field);
			} else {
				newSet.add(field);
			}
			return newSet;
		});
	};

	const handleSaveReport = async () => {
		if (!reportName.trim()) {
			toast.error('Please enter a report name');
			return;
		}

		if (!selectedFolderId) {
			toast.error('Please select a folder');
			return;
		}

		if (selectedParameters.size === 0) {
			toast.error('Please select at least one parameter');
			return;
		}

		setIsSaving(true);
		try {
			// Prepare parameters for the selected ones
			const parameters = detectedParameters
				.filter((p) => selectedParameters.has(p.field))
				.map((p) => ({
					field: p.field,
					label: parameterLabels[p.field] || p.label,
					type: parameterTypes[p.field] || p.type,
					default_value: p.default_value,
					required: false,
				}));

			// Create a minimal query_config for chat reports
			const queryConfig = {
				distinct: false,
				tables: [],
				joins: [],
				conditions: [],
				groupBy: [],
				orderBy: [],
			};

			const response = await fetch('/api/reports', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					folder_id: selectedFolderId,
					name: reportName.trim(),
					description: reportDescription.trim() || undefined,
					type: 'chat',
					query_config: queryConfig,
					base_sql: sql,
					parameters,
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast.success('Chat Report created successfully');
				setShowSaveDialog(false);
				setReportName('');
				setReportDescription('');
				setSql('');
				setDetectedParameters([]);
				setSelectedParameters(new Set());
			} else {
				toast.error(data.error || 'Failed to create report');
			}
		} catch (error) {
			console.error('Save report error:', error);
			toast.error('Failed to create report');
		} finally {
			setIsSaving(false);
		}
	};

	// Non-admin view
	if (!isAdmin()) {
		return (
			<div className="min-h-screen flex flex-col">
				<HeaderBar />
				<div className="flex-1 flex items-center justify-center p-8">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-primary mb-4">
							Chat Builder
						</h1>
						<p className="text-gray-600 mb-6">
							Chat Builder is admin-only. Go to Home to execute
							reports.
						</p>
						<Button onClick={() => (window.location.href = '/')}>
							Go to Home
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderBar />

			<div className="flex-1 p-8">
				<div className="max-w-6xl mx-auto">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-2xl font-bold text-primary mb-2">
							Chat Report Builder
						</h1>
						<p className="text-gray-600">
							Paste your SQL query and let AI identify parameters
							for users to customize
						</p>
					</div>

					{/* SQL Input */}
					<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							SQL Query
						</label>
						<Textarea
							value={sql}
							onChange={(e) => setSql(e.target.value)}
							placeholder="Paste your SQL query here..."
							rows={10}
							className="font-mono text-sm"
						/>
						<div className="mt-4 flex justify-end">
							<Button
								onClick={handleAnalyzeSQL}
								disabled={isAnalyzing || !sql.trim()}
								className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
							>
								{isAnalyzing ? (
									<>
										<Loader2
											size={16}
											className="mr-2 animate-spin"
										/>
										Analyzing...
									</>
								) : (
									<>
										<Sparkles size={16} className="mr-2" />
										Analyze SQL
									</>
								)}
							</Button>
						</div>
					</div>

					{/* Detected Parameters */}
					{detectedParameters.length > 0 && (
						<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
							<h2 className="text-lg font-semibold text-primary mb-4">
								Detected Parameters ({detectedParameters.length}
								)
							</h2>
							<p className="text-sm text-gray-600 mb-4">
								Select which parameters should be editable by
								users
							</p>
							<div className="space-y-4">
								{detectedParameters.map((param, index) => (
									<div
										key={index}
										className="border border-gray-200 rounded-lg p-4"
									>
										<div className="flex items-start gap-3">
											<input
												type="checkbox"
												checked={selectedParameters.has(
													param.field
												)}
												onChange={() =>
													toggleParameter(param.field)
												}
												className="mt-1 w-4 h-4"
											/>
											<div className="flex-1 space-y-3">
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														Field
													</label>
													<input
														type="text"
														value={param.field}
														disabled
														className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 font-mono text-sm"
													/>
												</div>
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														Label
													</label>
													<Input
														type="text"
														value={
															parameterLabels[
																param.field
															] || param.label
														}
														onChange={(e) =>
															setParameterLabels(
																(prev) => ({
																	...prev,
																	[param.field]:
																		e.target
																			.value,
																})
															)
														}
														placeholder="User-friendly label"
													/>
												</div>
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														Type
													</label>
													<select
														value={
															parameterTypes[
																param.field
															] || param.type
														}
														onChange={(e) =>
															setParameterTypes(
																(prev) => ({
																	...prev,
																	[param.field]:
																		e.target
																			.value,
																})
															)
														}
														className="w-full border border-gray-300 rounded-md px-3 py-2"
													>
														<option value="text">
															Text
														</option>
														<option value="number">
															Number
														</option>
														<option value="date">
															Date
														</option>
														<option value="daterange">
															Date Range
														</option>
														<option value="dropdown">
															Dropdown
														</option>
														<option value="multiselect">
															Multi-select
														</option>
													</select>
												</div>
												<div className="text-xs text-gray-500">
													<span className="font-medium">
														Operator:
													</span>{' '}
													{param.operator} |{' '}
													<span className="font-medium">
														Default:
													</span>{' '}
													{JSON.stringify(
														param.default_value
													)}
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Save Button */}
					{detectedParameters.length > 0 && (
						<div className="flex justify-end">
							<Button
								onClick={() => setShowSaveDialog(true)}
								disabled={selectedParameters.size === 0}
								className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
							>
								<Save size={16} className="mr-2" />
								Save as Report
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Save Dialog */}
			{showSaveDialog && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">
								Save Chat Report
							</h3>
							<button
								onClick={() => setShowSaveDialog(false)}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Report Name *
								</label>
								<Input
									value={reportName}
									onChange={(e) =>
										setReportName(e.target.value)
									}
									placeholder="Enter report name"
									autoFocus
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Description
								</label>
								<Textarea
									value={reportDescription}
									onChange={(e) =>
										setReportDescription(e.target.value)
									}
									placeholder="Optional description"
									rows={3}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Folder *
								</label>
								<Combobox
									options={folders.map((f) => ({
										value: String(f.id),
										label: f.name,
									}))}
									value={
										selectedFolderId
											? String(selectedFolderId)
											: ''
									}
									onValueChange={(value) =>
										setSelectedFolderId(Number(value))
									}
									placeholder="Select folder..."
									emptyText="No folders found."
								/>
							</div>

							<div className="flex gap-3">
								<Button
									onClick={handleSaveReport}
									disabled={
										isSaving ||
										!reportName.trim() ||
										!selectedFolderId
									}
									className="flex-1 cursor-pointer"
								>
									{isSaving ? 'Saving...' : 'Save'}
								</Button>
								<Button
									onClick={() => setShowSaveDialog(false)}
									variant="outline"
									className="flex-1 cursor-pointer"
								>
									Cancel
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
