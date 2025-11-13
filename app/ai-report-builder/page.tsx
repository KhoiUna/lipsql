'use client';
import { useState, useEffect } from 'react';
import HeaderBar from '@/components/header-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { isAdmin } from '@/lib/auth-utils';
import { useFolders } from '@/lib/hooks/use-api';
import SaveAIReportDialog from '@/components/save-ai-report-dialog';
import Link from 'next/link';

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
	suggested_dropdown_ids?: number[];
	required: boolean;
	dropdown_id?: number;
}

export default function ChatPage() {
	const [sql, setSql] = useState('');
	const [normalizedSql, setNormalizedSql] = useState('');
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
	const [parameterDropdowns, setParameterDropdowns] = useState<
		Record<string, number | null>
	>({});
	const [allDropdowns, setAllDropdowns] = useState<any[]>([]);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [showSaveDialog, setShowSaveDialog] = useState(false);

	const foldersQuery = useFolders();
	const folders = foldersQuery.data?.folders || [];

	// Fetch all dropdowns on mount
	useEffect(() => {
		fetch('/api/dropdowns')
			.then((res) => res.json())
			.then((data) => {
				if (data.dropdowns) {
					setAllDropdowns(data.dropdowns);
				}
			})
			.catch((err) => console.error('Failed to fetch dropdowns:', err));
	}, []);

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
				// Store normalized SQL
				setNormalizedSql(data.normalizedSql || sql);

				// Initialize selected parameters (all selected by default)
				setSelectedParameters(
					new Set(
						data.parameters.map((p: DetectedParameter) => p.field)
					)
				);

				// Initialize labels and types
				const labels: Record<string, string> = {};
				const types: Record<string, string> = {};

				// Add required and dropdown_id defaults
				const enrichedParams = data.parameters.map((p: any) => ({
					...p,
					required: false,
					dropdown_id: undefined,
				}));
				enrichedParams.forEach((p: DetectedParameter) => {
					labels[p.field] = p.label;
					types[p.field] = p.type;
				});
				setDetectedParameters(enrichedParams);
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

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.ctrlKey && e.key === 'Enter') {
			e.preventDefault();
			if (!isAnalyzing && sql.trim()) {
				handleAnalyzeSQL();
			}
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

	const handleSaveSuccess = () => {
		setSql('');
		setNormalizedSql('');
		setDetectedParameters([]);
		setSelectedParameters(new Set());
		setParameterLabels({});
		setParameterTypes({});
		setParameterDropdowns({});
	};

	// Non-admin view
	if (!isAdmin()) {
		return (
			<div className="min-h-screen flex flex-col">
				<HeaderBar />
				<div className="flex-1 flex items-center justify-center p-8">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-primary mb-4">
							AI Builder
						</h1>
						<p className="text-gray-600 mb-6">
							AI Builder is admin-only. Go to Home to execute
							reports.
						</p>
						<Link href="/">
							<Button className="cursor-pointer">
								Go to Home
							</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderBar />

			<div className="flex-1 p-8">
				<div className="mb-8">
					<h1 className="text-xl font-bold text-primary mb-2">
						AI Report Builder
					</h1>
					<p className="text-gray-600">
						Paste your SQL query and let AI identify parameters for
						users to customize
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
						onKeyDown={handleKeyDown}
						placeholder="Paste your SQL query here"
						rows={10}
						className="font-mono text-sm"
						disabled={isAnalyzing}
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
				{!isAnalyzing && detectedParameters.length === 0 && (
					<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
						<h2 className="text-lg font-semibold text-primary">
							No parameters detected
						</h2>
					</div>
				)}
				{detectedParameters.length > 0 && (
					<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
						<h2 className="text-lg font-semibold text-primary mb-4">
							Detected Parameters ({detectedParameters.length})
						</h2>
						<p className="text-sm text-gray-600 mb-4">
							Select which parameters should be editable by users
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

											{param.suggested_dropdown_ids &&
												param.suggested_dropdown_ids
													.length > 0 && (
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-1">
															Suggested Dropdowns
															(optional)
														</label>
														<select
															value={
																parameterDropdowns[
																	param.field
																] || ''
															}
															onChange={(e) =>
																setParameterDropdowns(
																	(prev) => ({
																		...prev,
																		[param.field]:
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: null,
																	})
																)
															}
															className="w-full border border-gray-300 rounded-md px-3 py-2"
														>
															<option value="">
																None (use
																default values)
															</option>
															{param.suggested_dropdown_ids.map(
																(
																	dropdownId
																) => {
																	const dropdown =
																		allDropdowns.find(
																			(
																				d
																			) =>
																				d.id ===
																				dropdownId
																		);
																	return dropdown ? (
																		<option
																			key={
																				dropdownId
																			}
																			value={
																				dropdownId
																			}
																		>
																			{
																				dropdown.name
																			}
																		</option>
																	) : null;
																}
															)}
														</select>
													</div>
												)}
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

			{/* Save Dialog */}
			<SaveAIReportDialog
				isOpen={showSaveDialog}
				onClose={() => setShowSaveDialog(false)}
				sql={normalizedSql || sql}
				detectedParameters={detectedParameters}
				selectedParameters={selectedParameters}
				parameterLabels={parameterLabels}
				parameterTypes={parameterTypes}
				parameterDropdowns={parameterDropdowns}
				onSuccess={handleSaveSuccess}
			/>
		</div>
	);
}
