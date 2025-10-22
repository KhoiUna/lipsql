'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatParameter {
	id: number;
	session_id: number;
	field: string;
	label: string;
	type: 'dropdown' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
	default_value?: any;
	enabled: boolean;
	dropdown_id?: number;
}

interface ChatParameterPanelProps {
	parameters: ChatParameter[];
	baseSql: string;
	onExecute: (sql: string, parameters: Record<string, any>) => void;
	onCopySql?: (sql: string) => void;
	className?: string;
}

export default function ChatParameterPanel({
	parameters,
	baseSql,
	onExecute,
	onCopySql,
	className,
}: ChatParameterPanelProps) {
	const [parameterValues, setParameterValues] = useState<Record<string, any>>(
		{}
	);
	const [enabledParameters, setEnabledParameters] = useState<Set<string>>(
		new Set()
	);
	const [generatedSql, setGeneratedSql] = useState('');

	// Initialize parameter values and enabled state
	useEffect(() => {
		const initialValues: Record<string, any> = {};
		const initialEnabled = new Set<string>();

		parameters.forEach((param) => {
			initialValues[param.field] = param.default_value || '';
			if (param.enabled) {
				initialEnabled.add(param.field);
			}
		});

		setParameterValues(initialValues);
		setEnabledParameters(initialEnabled);
	}, [parameters]);

	// Generate SQL with current parameter values
	useEffect(() => {
		try {
			let sql = baseSql;

			// Substitute parameters in the SQL
			for (const [field, value] of Object.entries(parameterValues)) {
				if (
					!enabledParameters.has(field) ||
					value === null ||
					value === undefined ||
					value === ''
				) {
					continue; // Skip disabled or empty values
				}

				let sqlValue: string;
				if (Array.isArray(value)) {
					// For multiselect/IN operator
					sqlValue = value.map((v) => `'${v}'`).join(', ');
				} else if (
					typeof value === 'object' &&
					'from' in value &&
					'to' in value
				) {
					// For daterange
					sqlValue = `'${value.from}' AND '${value.to}'`;
				} else {
					// For single values
					sqlValue = `'${value}'`;
				}

				// Replace parameter placeholders in SQL
				sql = sql.replace(new RegExp(`:${field}`, 'g'), sqlValue);
			}

			setGeneratedSql(sql);
		} catch (error) {
			setGeneratedSql('');
		}
	}, [parameterValues, enabledParameters, baseSql]);

	const handleParameterChange = (field: string, value: any) => {
		setParameterValues((prev) => ({ ...prev, [field]: value }));
	};

	const handleParameterToggle = (field: string, enabled: boolean) => {
		setEnabledParameters((prev) => {
			const newSet = new Set(prev);
			if (enabled) {
				newSet.add(field);
			} else {
				newSet.delete(field);
			}
			return newSet;
		});
	};

	const handleExecute = () => {
		if (!generatedSql) {
			toast.error('No SQL generated');
			return;
		}

		// Filter parameters to only include enabled ones
		const enabledParams: Record<string, any> = {};
		Object.entries(parameterValues).forEach(([field, value]) => {
			if (
				enabledParameters.has(field) &&
				value !== null &&
				value !== undefined &&
				value !== ''
			) {
				enabledParams[field] = value;
			}
		});

		onExecute(generatedSql, enabledParams);
	};

	const copyToClipboard = async () => {
		if (!generatedSql) return;

		try {
			await navigator.clipboard.writeText(generatedSql);
			toast.success('SQL copied to clipboard');
			if (onCopySql) {
				onCopySql(generatedSql);
			}
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			toast.error('Failed to copy to clipboard');
		}
	};

	const renderParameterInput = (param: ChatParameter) => {
		const value = parameterValues[param.field] || '';
		const enabled = enabledParameters.has(param.field);

		switch (param.type) {
			case 'text':
				return (
					<Input
						value={value}
						onChange={(e) =>
							handleParameterChange(param.field, e.target.value)
						}
						placeholder={`Enter ${param.label.toLowerCase()}`}
						disabled={!enabled}
					/>
				);
			case 'number':
				return (
					<Input
						type="number"
						value={value}
						onChange={(e) =>
							handleParameterChange(param.field, e.target.value)
						}
						placeholder={`Enter ${param.label.toLowerCase()}`}
						disabled={!enabled}
					/>
				);
			case 'date':
				return (
					<Input
						type="date"
						value={value}
						onChange={(e) =>
							handleParameterChange(param.field, e.target.value)
						}
						disabled={!enabled}
					/>
				);
			case 'daterange':
				return (
					<div className="flex gap-2">
						<Input
							type="date"
							value={value.from || ''}
							onChange={(e) =>
								handleParameterChange(param.field, {
									...value,
									from: e.target.value,
								})
							}
							placeholder="From"
							disabled={!enabled}
						/>
						<Input
							type="date"
							value={value.to || ''}
							onChange={(e) =>
								handleParameterChange(param.field, {
									...value,
									to: e.target.value,
								})
							}
							placeholder="To"
							disabled={!enabled}
						/>
					</div>
				);
			default:
				return (
					<Input
						value={value}
						onChange={(e) =>
							handleParameterChange(param.field, e.target.value)
						}
						placeholder={`Enter ${param.label.toLowerCase()}`}
						disabled={!enabled}
					/>
				);
		}
	};

	if (parameters.length === 0) {
		return null;
	}

	return (
		<Card className={cn('w-full', className)}>
			<CardHeader>
				<CardTitle className="text-lg">Query Parameters</CardTitle>
				<p className="text-sm text-gray-600">
					Configure the parameters for your SQL query
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Parameters */}
				<div className="space-y-4">
					{parameters.map((param) => (
						<div key={param.id} className="space-y-2">
							<div className="flex items-center space-x-2">
								<Checkbox
									id={`param-${param.field}`}
									checked={enabledParameters.has(param.field)}
									onCheckedChange={(checked) =>
										handleParameterToggle(
											param.field,
											!!checked
										)
									}
								/>
								<Label
									htmlFor={`param-${param.field}`}
									className="font-medium"
								>
									{param.label}
								</Label>
								<span className="text-xs text-gray-500">
									({param.type})
								</span>
							</div>
							{renderParameterInput(param)}
						</div>
					))}
				</div>

				{/* Generated SQL */}
				{generatedSql && (
					<div className="space-y-2">
						<Label className="text-sm font-medium">
							Generated SQL:
						</Label>
						<pre className="bg-gray-100 p-3 rounded-md text-sm overflow-x-auto">
							<code>{generatedSql}</code>
						</pre>
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-2 pt-4">
					<Button onClick={handleExecute} disabled={!generatedSql}>
						<Play className="w-4 h-4 mr-2" />
						Run Query
					</Button>
					<Button
						variant="outline"
						onClick={copyToClipboard}
						disabled={!generatedSql}
					>
						<Copy className="w-4 h-4 mr-2" />
						Copy SQL
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
