'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import {
	useFolders,
	useCreateFolder,
	useCreateReport,
} from '@/lib/hooks/use-api';
import {
	VisualQuery,
	ReportParameter,
	SchemaData,
} from '@/lib/query-builder-types';
import {
	detectParameterType,
	generateParameterLabel,
	detectOptionsSource,
	findColumnDataType,
} from '@/lib/query-builder-utils';

interface SaveReportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	query: VisualQuery;
	databaseType: string;
	schemaData: SchemaData | null;
}

export default function SaveReportDialog({
	isOpen,
	onClose,
	query,
	schemaData,
}: SaveReportDialogProps) {
	const [folderSelection, setFolderSelection] = useState<'existing' | 'new'>(
		'existing'
	);
	const [selectedFolderId, setSelectedFolderId] = useState<number | null>(
		null
	);
	const [newFolderName, setNewFolderName] = useState('');
	const [newFolderDescription, setNewFolderDescription] = useState('');
	const [reportName, setReportName] = useState('');
	const [reportDescription, setReportDescription] = useState('');
	const [detectedParameters, setDetectedParameters] = useState<
		Omit<ReportParameter, 'id' | 'report_id'>[]
	>([]);
	const [enabledParameters, setEnabledParameters] = useState<Set<string>>(
		new Set()
	);

	const foldersQuery = useFolders();
	const createFolderMutation = useCreateFolder();
	const createReportMutation = useCreateReport();

	const folders = foldersQuery.data?.folders || [];

	// Auto-detect parameters from WHERE conditions
	useEffect(() => {
		if (isOpen && query.conditions.length > 0) {
			const params = query.conditions.map((condition) => ({
				field: condition.column,
				label: generateParameterLabel(condition.column),
				type: detectParameterType({
					operator: condition.operator,
					columnDataType: findColumnDataType({
						column: condition.column,
						schemaData,
					}),
				}),
				options_source: detectOptionsSource(condition.column),
				default_value: condition.value,
				required: false,
				dropdown_id: condition.dropdownId,
			}));
			setDetectedParameters(params);
			// Enable all parameters by default
			setEnabledParameters(new Set(params.map((p) => p.field)));
		} else {
			setDetectedParameters([]);
			setEnabledParameters(new Set());
		}
	}, [isOpen, query.conditions]);

	// Set default folder selection
	useEffect(() => {
		if (folders.length > 0 && !selectedFolderId) {
			setSelectedFolderId(folders[0].id);
		}
	}, [folders, selectedFolderId]);

	const toggleParameter = (field: string) => {
		setEnabledParameters((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(field)) {
				newSet.delete(field);
			} else {
				newSet.add(field);
			}
			return newSet;
		});
	};

	const handleSave = async () => {
		// Validate inputs
		if (!reportName.trim()) {
			toast.error('Please enter a report name');
			return;
		}

		if (folderSelection === 'existing' && !selectedFolderId) {
			toast.error('Please select a folder');
			return;
		}

		if (folderSelection === 'new' && !newFolderName.trim()) {
			toast.error('Please enter a folder name');
			return;
		}

		try {
			let folderId = selectedFolderId;

			// Create new folder if needed
			if (folderSelection === 'new') {
				const folderResult = await createFolderMutation.mutateAsync({
					name: newFolderName.trim(),
					description: newFolderDescription.trim() || undefined,
				});
				folderId = folderResult.folderId;
			}

			if (!folderId) {
				toast.error('Failed to determine folder');
				return;
			}

			// Get all selected columns across all tables
			const allSelectedColumns: string[] = [];
			for (const table of query.tables) {
				for (const col of table.selectedColumns) {
					allSelectedColumns.push(
						`${col.tableName}.${col.columnName}`
					);
				}
				// Include custom expressions
				for (const expr of table.customExpressions) {
					if (expr.alias) {
						allSelectedColumns.push(expr.alias);
					}
				}
			}

			// Filter only enabled parameters
			const parametersToSave = detectedParameters.filter((p) =>
				enabledParameters.has(p.field)
			);

			// Create the report
			await createReportMutation.mutateAsync({
				folder_id: folderId,
				type: 'visual',
				name: reportName.trim(),
				description: reportDescription.trim() || undefined,
				query_config: query,
				default_visible_columns: allSelectedColumns,
				parameters: parametersToSave,
			});

			toast.success('Report saved successfully');
			handleClose();
		} catch (error) {
			console.error('Save report error:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to save report'
			);
		}
	};

	const handleClose = () => {
		setFolderSelection('existing');
		setSelectedFolderId(null);
		setNewFolderName('');
		setNewFolderDescription('');
		setReportName('');
		setReportDescription('');
		setDetectedParameters([]);
		setEnabledParameters(new Set());
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<h2 className="text-2xl font-bold text-primary">
						Save as Report
					</h2>
					<button
						onClick={handleClose}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<X size={24} />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Folder Selection */}
					<div>
						<h3 className="text-lg font-semibold text-primary mb-3">
							Folder
						</h3>
						<div className="space-y-3">
							{folders.length > 0 && (
								<label className="flex items-center gap-2">
									<input
										type="radio"
										value="existing"
										checked={folderSelection === 'existing'}
										onChange={() =>
											setFolderSelection('existing')
										}
										className="w-4 h-4"
									/>
									<span className="font-medium">
										Select existing folder
									</span>
								</label>
							)}

							{folderSelection === 'existing' &&
								folders.length > 0 && (
									<select
										value={selectedFolderId || ''}
										onChange={(e) =>
											setSelectedFolderId(
												Number(e.target.value)
											)
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2"
									>
										{folders.map((folder) => (
											<option
												key={folder.id}
												value={folder.id}
											>
												{folder.name}
											</option>
										))}
									</select>
								)}

							<label className="flex items-center gap-2">
								<input
									type="radio"
									value="new"
									checked={folderSelection === 'new'}
									onChange={() => setFolderSelection('new')}
									className="w-4 h-4"
								/>
								<span className="font-medium">
									Create new folder
								</span>
							</label>

							{folderSelection === 'new' && (
								<div className="ml-6 space-y-3">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Folder Name *
										</label>
										<Input
											value={newFolderName}
											onChange={(e) =>
												setNewFolderName(e.target.value)
											}
											placeholder="Enter folder name"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Folder Description
										</label>
										<Textarea
											value={newFolderDescription}
											onChange={(e) =>
												setNewFolderDescription(
													e.target.value
												)
											}
											placeholder="Optional description"
											rows={2}
										/>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Report Details */}
					<div>
						<h3 className="text-lg font-semibold text-primary mb-3">
							Report Details
						</h3>
						<div className="space-y-3">
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
						</div>
					</div>

					{/* Parameters Preview */}
					{detectedParameters.length > 0 && (
						<div>
							<h3 className="text-lg font-semibold text-primary mb-3">
								Select Parameters
							</h3>
							<div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-2">
								{detectedParameters.map((param, index) => (
									<label
										key={index}
										className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-100 p-2 rounded"
									>
										<div className="flex items-center gap-3">
											<input
												type="checkbox"
												checked={enabledParameters.has(
													param.field
												)}
												onChange={() =>
													toggleParameter(param.field)
												}
												className="w-4 h-4 cursor-pointer"
											/>
											<span className="font-mono text-gray-600">
												{param.field}
											</span>
											<span className="text-gray-400">
												→
											</span>
											<span className="font-medium">
												{param.label}
											</span>
										</div>
										<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
											{param.type}
										</span>
									</label>
								))}
							</div>
							<p className="text-sm text-gray-600 mt-2">
								Checked conditions will be editable parameters.
								Unchecked conditions will be fixed in the
								report.
							</p>
						</div>
					)}

					{detectedParameters.length === 0 && (
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<p className="text-sm text-yellow-800">
								No WHERE conditions detected. This report will
								have no editable parameters.
							</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
					<Button
						onClick={handleClose}
						variant="outline"
						className="cursor-pointer"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={
							createFolderMutation.isPending ||
							createReportMutation.isPending
						}
						className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
					>
						{createFolderMutation.isPending ||
						createReportMutation.isPending
							? 'Saving...'
							: 'Save Report'}
					</Button>
				</div>
			</div>
		</div>
	);
}
