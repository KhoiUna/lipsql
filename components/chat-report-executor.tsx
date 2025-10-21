'use client';
import { useState, useEffect } from 'react';
import { ReportParameter } from '@/lib/query-builder-types';
import { replacePlaceholders } from '@/lib/ai-report-utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Combobox } from './ui/combobox';
import { Play, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ChatReportExecutorProps {
	reportName: string;
	reportDescription?: string;
	baseSql: string;
	parameters: ReportParameter[];
	onExecuteQuery: (sql: string) => void;
}

export default function ChatReportExecutor({
	reportName,
	reportDescription,
	baseSql,
	parameters,
	onExecuteQuery,
}: ChatReportExecutorProps) {
	const [parameterValues, setParameterValues] = useState<Record<string, any>>(
		{}
	);
	const [generatedSql, setGeneratedSql] = useState<string>('');
	const [showSqlPreview, setShowSqlPreview] = useState<boolean>(false);
	const [parameterOptions, setParameterOptions] = useState<
		Record<string, { value: string; label: string }[]>
	>({});
	const [dropdownsCache, setDropdownsCache] = useState<
		Record<number, { value: string; label: string }[]>
	>({});

	// Initialize parameter values with defaults
	useEffect(() => {
		const initialValues: Record<string, any> = {};
		for (const param of parameters) {
			if (param.type === 'daterange') {
				initialValues[param.field] = {
					from: param.default_value[0],
					to: param.default_value[1],
				};
			} else {
				initialValues[param.field] = param.default_value;
			}
		}
		setParameterValues(initialValues);
	}, [parameters]);

	// Initialize parameter options from dropdown_id or default_value
	useEffect(() => {
		const options: Record<string, { value: string; label: string }[]> = {};

		for (const param of parameters) {
			// Only process dropdown and multiselect types
			if (param.type === 'dropdown' || param.type === 'multiselect') {
				// If dropdown_id exists, use dropdown options
				if (param.dropdown_id) {
					if (dropdownsCache[param.dropdown_id]) {
						options[param.field] =
							dropdownsCache[param.dropdown_id];
					} else {
						// Fetch dropdown options
						fetch(`/api/dropdowns/${param.dropdown_id}`)
							.then((res) => res.json())
							.then((data) => {
								if (data.dropdown) {
									const dropdownOptions =
										data.dropdown.options;
									setDropdownsCache((prev) => ({
										...prev,
										[param.dropdown_id!]: dropdownOptions,
									}));
									setParameterOptions((prev) => ({
										...prev,
										[param.field]: dropdownOptions,
									}));
								}
							})
							.catch((err) =>
								console.error('Failed to fetch dropdown:', err)
							);
					}
				}
				// Otherwise, fall back to default_value
				else if (
					param.default_value !== undefined &&
					param.default_value !== null
				) {
					// Handle array values (from multiselect or IN operator)
					if (Array.isArray(param.default_value)) {
						options[param.field] = param.default_value.map(
							(val) => ({
								value: String(val),
								label: String(val),
							})
						);
					}
					// Handle single value (from dropdown or = operator)
					else if (param.default_value) {
						options[param.field] = [
							{
								value: String(param.default_value),
								label: String(param.default_value),
							},
						];
					}
				}
			}
		}

		// Set options that don't need async fetching
		setParameterOptions((prev) => ({ ...prev, ...options }));
	}, [parameters, dropdownsCache]);

	// Generate SQL with current parameter values
	useEffect(() => {
		try {
			const sql = replacePlaceholders(baseSql, parameterValues);
			setGeneratedSql(sql);
		} catch (error) {
			console.error('Error generating SQL:', error);
			setGeneratedSql('');
		}
	}, [parameterValues, baseSql]);

	const handleParameterChange = (field: string, value: any) => {
		setParameterValues((prev) => ({ ...prev, [field]: value }));
	};

	const handleExecute = () => {
		if (!generatedSql) {
			toast.error('No SQL generated');
			return;
		}

		onExecuteQuery(generatedSql);
	};

	return (
		<div className="space-y-6">
			{/* Report Header */}
			<div className="bg-white rounded-lg border border-gray-200 p-6">
				<h2 className="text-xl font-bold text-primary mb-2">
					{reportName}
				</h2>
				{reportDescription && (
					<p className="text-gray-600">{reportDescription}</p>
				)}
			</div>

			{/* Parameters Panel */}
			{parameters.length > 0 && (
				<div className="bg-white rounded-lg border border-gray-200 p-6">
					<h3 className="font-semibold text-primary mb-4">
						Parameters
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{parameters.map((param) => (
							<div key={param.id}>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{param.label}
									{param.required && (
										<span className="text-red-500 ml-1">
											*
										</span>
									)}
								</label>

								{param.type === 'dropdown' ? (
									<Combobox
										options={
											parameterOptions[param.field] || []
										}
										value={String(
											parameterValues[param.field] || ''
										)}
										onValueChange={(value) =>
											handleParameterChange(
												param.field,
												value
											)
										}
										placeholder="Select..."
										emptyText="No option found."
									/>
								) : null}

								{param.type === 'multiselect' && (
									<select
										multiple
										value={
											Array.isArray(
												parameterValues[param.field]
											)
												? parameterValues[param.field]
												: []
										}
										onChange={(e) => {
											const selected = Array.from(
												e.target.selectedOptions,
												(opt) => opt.value
											);
											handleParameterChange(
												param.field,
												selected
											);
										}}
										className="w-full border border-gray-300 rounded-md px-3 py-2"
										size={5}
									>
										{(
											parameterOptions[param.field] || []
										).map((opt) => (
											<option
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</option>
										))}
									</select>
								)}

								{param.type === 'text' && (
									<Input
										type="text"
										value={String(
											parameterValues[param.field] || ''
										)}
										onChange={(e) =>
											handleParameterChange(
												param.field,
												e.target.value
											)
										}
										placeholder={`Enter ${param.label.toLowerCase()}`}
									/>
								)}

								{param.type === 'number' && (
									<Input
										type="number"
										value={
											parameterValues[param.field] || ''
										}
										onChange={(e) =>
											handleParameterChange(
												param.field,
												e.target.value
													? Number(e.target.value)
													: ''
											)
										}
										placeholder={`Enter ${param.label.toLowerCase()}`}
									/>
								)}

								{param.type === 'date' && (
									<Input
										type="date"
										value={
											parameterValues[param.field] || ''
										}
										onChange={(e) =>
											handleParameterChange(
												param.field,
												e.target.value
											)
										}
									/>
								)}

								{param.type === 'daterange' && (
									<div className="flex gap-2">
										<Input
											type="date"
											value={
												parameterValues[param.field]
													?.from || ''
											}
											onChange={(e) =>
												handleParameterChange(
													param.field,
													{
														...parameterValues[
															param.field
														],
														from: e.target.value,
													}
												)
											}
											placeholder="From"
										/>
										<Input
											type="date"
											value={
												parameterValues[param.field]
													?.to || ''
											}
											onChange={(e) =>
												handleParameterChange(
													param.field,
													{
														...parameterValues[
															param.field
														],
														to: e.target.value,
													}
												)
											}
											placeholder="To"
										/>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* SQL Preview */}
			{generatedSql && (
				<div className="bg-gray-50 rounded-lg border border-gray-200">
					<button
						onClick={() => setShowSqlPreview(!showSqlPreview)}
						className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg"
					>
						<h3 className="font-semibold text-primary flex items-center justify-between">
							<span className="flex items-center gap-2">
								<Eye size={20} />
								SQL Preview
							</span>
							{showSqlPreview ? (
								<ChevronDown size={16} />
							) : (
								<ChevronRight size={16} />
							)}
						</h3>
					</button>
					{showSqlPreview && (
						<div className="px-4 pb-4">
							<div className="bg-white border border-gray-300 rounded-lg p-4">
								<pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
									{generatedSql}
								</pre>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Execute Button */}
			<div className="flex justify-end">
				<Button
					onClick={handleExecute}
					disabled={!generatedSql}
					className="bg-primary text-white hover:bg-gray-800 cursor-pointer"
				>
					<Play size={16} className="mr-2" />
					Run Report
				</Button>
			</div>
		</div>
	);
}
