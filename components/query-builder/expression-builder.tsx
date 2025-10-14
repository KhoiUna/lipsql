'use client';
import { useState } from 'react';
import {
	CustomExpression,
	SqlFunction,
	FunctionArgument,
} from '@/lib/query-builder-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { X, Sparkles } from 'lucide-react';

interface ExpressionBuilderProps {
	expression: CustomExpression;
	onUpdate: (expression: CustomExpression) => void;
	onRemove: () => void;
	availableColumns: Array<{ table: string; column: string }>;
	databaseType: string;
}

export default function ExpressionBuilder({
	expression,
	onUpdate,
	onRemove,
	availableColumns,
	databaseType,
}: ExpressionBuilderProps) {
	const [useBuilder, setUseBuilder] = useState(
		expression.function !== undefined && expression.function !== 'NONE'
	);

	const handleFunctionChange = (func: SqlFunction) => {
		const defaultArgs = getDefaultArgsForFunction(func);
		onUpdate({
			...expression,
			function: func,
			functionArgs: defaultArgs,
			expression: '', // Will be generated
		});
	};

	const handleArgChange = (
		index: number,
		field: keyof FunctionArgument,
		value: string
	) => {
		const args = [...(expression.functionArgs || [])];
		args[index] = { ...args[index], [field]: value };
		onUpdate({ ...expression, functionArgs: args });
	};

	const handleAddArg = () => {
		const args = [...(expression.functionArgs || [])];
		args.push({ type: 'literal', value: '' });
		onUpdate({ ...expression, functionArgs: args });
	};

	const handleRemoveArg = (index: number) => {
		const args = [...(expression.functionArgs || [])];
		args.splice(index, 1);
		onUpdate({ ...expression, functionArgs: args });
	};

	const getDefaultArgsForFunction = (
		func: SqlFunction
	): FunctionArgument[] => {
		switch (func) {
			case 'CONCAT':
				return [
					{ type: 'literal', value: '' },
					{ type: 'literal', value: '' },
				];
			case 'CAST':
				return [
					{ type: 'column', value: '' },
					{ type: 'literal', value: 'VARCHAR' },
				];
			case 'FORMAT':
				return [
					{ type: 'column', value: '' },
					{ type: 'literal', value: 'YYYY-MM-DD' },
				];
			case 'UPPER':
			case 'LOWER':
			case 'TRIM':
			case 'LENGTH':
				return [{ type: 'column', value: '' }];
			case 'SUBSTRING':
				return [
					{ type: 'column', value: '' },
					{ type: 'literal', value: '1' },
					{ type: 'literal', value: '10' },
				];
			case 'COALESCE':
				return [
					{ type: 'column', value: '' },
					{ type: 'literal', value: '' },
				];
			case 'CASE':
				return [
					{
						type: 'expression',
						value: 'CASE WHEN condition THEN result ELSE default END',
					},
				];
			default:
				return [];
		}
	};

	const getFunctionHelp = (func: SqlFunction): string => {
		const dbType = (databaseType || 'postgres').toLowerCase();

		switch (func) {
			case 'CONCAT':
				if (dbType.includes('sqlite')) {
					return 'Concatenates strings using || operator';
				}
				return 'Concatenates multiple strings/columns';
			case 'CAST':
				return 'Converts a value to a specified data type';
			case 'FORMAT':
				if (dbType.includes('sqlserver') || dbType.includes('mssql')) {
					return "Formats values (e.g., FORMAT(date, 'yyyy-MM-dd'))";
				}
				if (dbType.includes('mysql')) {
					return "Formats dates (e.g., DATE_FORMAT(date, '%Y-%m-%d'))";
				}
				if (dbType.includes('sqlite')) {
					return "Formats dates (e.g., strftime('%Y-%m-%d', date))";
				}
				return "Formats values (e.g., TO_CHAR(date, 'YYYY-MM-DD'))";
			case 'UPPER':
				return 'Converts text to uppercase';
			case 'LOWER':
				return 'Converts text to lowercase';
			case 'SUBSTRING':
				return 'Extracts part of a string (column, start, length)';
			case 'COALESCE':
				return 'Returns first non-null value';
			case 'TRIM':
				return 'Removes leading and trailing spaces';
			case 'LENGTH':
				if (dbType.includes('sqlserver') || dbType.includes('mssql')) {
					return 'Returns length of string (uses LEN)';
				}
				return 'Returns length of string';
			case 'CASE':
				return 'Conditional logic (CASE WHEN ... THEN ... ELSE ... END)';
			default:
				return '';
		}
	};

	return (
		<div className="border border-purple-300 rounded-lg p-4 bg-purple-50 shadow-sm">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Sparkles size={18} className="text-purple-600" />
					<span className="font-semibold text-purple-900">
						Custom Expression
					</span>
				</div>
				<Button
					onClick={onRemove}
					className="p-1 h-auto text-red-600 hover:text-red-700 hover:bg-red-50"
					variant="ghost"
				>
					<X size={18} />
				</Button>
			</div>

			<div className="space-y-3">
				{/* Mode Toggle */}
				<div className="flex gap-2">
					<button
						onClick={() => setUseBuilder(true)}
						className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
							useBuilder
								? 'bg-purple-600 text-white'
								: 'bg-white text-gray-700 hover:bg-gray-100'
						}`}
					>
						Function Builder
					</button>
					<button
						onClick={() => setUseBuilder(false)}
						className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
							!useBuilder
								? 'bg-purple-600 text-white'
								: 'bg-white text-gray-700 hover:bg-gray-100'
						}`}
					>
						Raw SQL
					</button>
				</div>

				{useBuilder ? (
					<>
						{/* Function Selection */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Function
							</label>
							<select
								value={expression.function || 'NONE'}
								onChange={(e) =>
									handleFunctionChange(
										e.target.value as SqlFunction
									)
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
							>
								<option value="NONE">Select function...</option>
								<option value="CONCAT">CONCAT</option>
								<option value="CAST">CAST</option>
								<option value="FORMAT">FORMAT</option>
								<option value="CASE">CASE</option>
								<option value="UPPER">UPPER</option>
								<option value="LOWER">LOWER</option>
								<option value="SUBSTRING">SUBSTRING</option>
								<option value="COALESCE">COALESCE</option>
								<option value="TRIM">TRIM</option>
								<option value="LENGTH">LENGTH</option>
							</select>
							{expression.function &&
								expression.function !== 'NONE' && (
									<p className="text-xs text-gray-600 mt-1">
										{getFunctionHelp(expression.function)}
									</p>
								)}
						</div>

						{/* Arguments */}
						{expression.function &&
							expression.function !== 'NONE' &&
							expression.function !== 'CASE' && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Arguments
									</label>
									<div className="space-y-2">
										{(expression.functionArgs || []).map(
											(arg, index) => (
												<div
													key={index}
													className="flex items-center gap-2"
												>
													<select
														value={arg.type}
														onChange={(e) =>
															handleArgChange(
																index,
																'type',
																e.target.value
															)
														}
														className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
													>
														<option value="column">
															Column
														</option>
														<option value="literal">
															Value
														</option>
														<option value="expression">
															Expression
														</option>
													</select>

													{arg.type === 'column' ? (
														<div className="flex-1">
															<Combobox
																options={availableColumns.map(
																	({
																		table,
																		column,
																	}) => ({
																		value: `${table}.${column}`,
																		label: `${table}.${column}`,
																	})
																)}
																value={
																	arg.value
																}
																onValueChange={(
																	value
																) =>
																	handleArgChange(
																		index,
																		'value',
																		value
																	)
																}
																placeholder="Select column..."
																emptyText="No column found."
															/>
														</div>
													) : (
														<Input
															type="text"
															value={arg.value}
															onChange={(e) =>
																handleArgChange(
																	index,
																	'value',
																	e.target
																		.value
																)
															}
															placeholder={
																arg.type ===
																'literal'
																	? 'Enter value...'
																	: 'Enter expression...'
															}
															className="flex-1 text-sm"
														/>
													)}

													{expression.functionArgs &&
														expression.functionArgs
															.length > 1 && (
															<Button
																onClick={() =>
																	handleRemoveArg(
																		index
																	)
																}
																variant="ghost"
																className="p-1 h-auto text-red-600"
															>
																<X size={16} />
															</Button>
														)}
												</div>
											)
										)}

										{expression.function === 'CONCAT' ||
										expression.function === 'COALESCE' ? (
											<Button
												onClick={handleAddArg}
												variant="outline"
												size="sm"
												className="w-full text-xs"
											>
												Add Argument
											</Button>
										) : null}
									</div>
								</div>
							)}

						{/* Case Expression */}
						{expression.function === 'CASE' && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									CASE Expression
								</label>
								<textarea
									value={
										expression.functionArgs?.[0]?.value ||
										'CASE WHEN condition THEN result ELSE default END'
									}
									onChange={(e) =>
										handleArgChange(
											0,
											'value',
											e.target.value
										)
									}
									placeholder="CASE WHEN condition THEN result ELSE default END"
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
									rows={4}
								/>
								<p className="text-xs text-gray-600 mt-1">
									Example: CASE WHEN column {'>'} 10 THEN
									'High' ELSE 'Low' END
								</p>
							</div>
						)}
					</>
				) : (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							SQL Expression
						</label>
						<textarea
							value={expression.expression}
							onChange={(e) =>
								onUpdate({
									...expression,
									expression: e.target.value,
									function: 'NONE',
								})
							}
							placeholder="Enter custom SQL expression..."
							className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
							rows={3}
						/>
						<p className="text-xs text-gray-600 mt-1">
							Enter any valid SQL expression for your database
						</p>
					</div>
				)}

				{/* Alias */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Alias (optional)
					</label>
					<Input
						type="text"
						value={expression.alias || ''}
						onChange={(e) =>
							onUpdate({ ...expression, alias: e.target.value })
						}
						placeholder="Column alias..."
						className="text-sm"
					/>
				</div>
			</div>
		</div>
	);
}
