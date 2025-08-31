'use client';
import { useState } from 'react';
import { X, Database, Table, Link, BarChart3 } from 'lucide-react';
import SchemaDiagram from './schema-diagram';

interface SchemaInfoModalProps {
	isOpen: boolean;
	onClose: () => void;
	databaseType: string;
	schema: string;
	relationships: any[];
}

export default function SchemaInfoModal({
	isOpen,
	onClose,
	databaseType,
	schema,
	relationships,
}: SchemaInfoModalProps) {
	const [activeTab, setActiveTab] = useState<
		'schema' | 'relationships' | 'diagram'
	>('schema');

	if (!isOpen) return null;

	// Parse schema string to extract table information
	const parseSchema = (schemaString: string) => {
		const tables: { name: string; columns: any[] }[] = [];
		const lines = schemaString.split('\n');
		let currentTable: { name: string; columns: any[] } | null = null;

		lines.forEach((line) => {
			if (line.startsWith('Table: ')) {
				if (currentTable) {
					tables.push(currentTable);
				}
				currentTable = {
					name: line.replace('Table: ', '').trim(),
					columns: [],
				};
			} else if (line.startsWith('  - ') && currentTable) {
				const columnLine = line.replace('  - ', '').trim();
				const match = columnLine.match(/^(\w+)\s*\(([^)]+)\)/);
				if (match) {
					currentTable.columns.push({
						name: match[1],
						type: match[2],
						nullable: columnLine.includes('NULL'),
					});
				}
			}
		});

		if (currentTable) {
			tables.push(currentTable);
		}

		return tables;
	};

	const tables = parseSchema(schema);

	return (
		<div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
			<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
					<div className="flex items-center space-x-2 sm:space-x-3">
						<Database className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
						<div>
							<h2 className="text-lg sm:text-xl font-semibold text-black">
								Database Schema Information
							</h2>
							<p className="text-xs sm:text-sm text-gray-600">
								Database Type:{' '}
								<span className="font-medium text-black">
									{databaseType}
								</span>
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-gray-200 overflow-x-auto">
					<button
						onClick={() => setActiveTab('schema')}
						className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === 'schema'
								? 'text-black border-b-2 border-black'
								: 'text-gray-500 hover:text-black'
						}`}
					>
						<Table className="w-3 h-3 sm:w-4 sm:h-4" />
						<span>Tables & Columns</span>
					</button>
					<button
						onClick={() => setActiveTab('relationships')}
						className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === 'relationships'
								? 'text-black border-b-2 border-black'
								: 'text-gray-500 hover:text-black'
						}`}
					>
						<Link className="w-3 h-3 sm:w-4 sm:h-4" />
						<span>Relationships</span>
						{relationships.length > 0 && (
							<span className="bg-black text-white text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full">
								{relationships.length}
							</span>
						)}
					</button>
					<button
						onClick={() => setActiveTab('diagram')}
						className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === 'diagram'
								? 'text-black border-b-2 border-black'
								: 'text-gray-500 hover:text-black'
						}`}
					>
						<BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
						<span>Diagram</span>
					</button>
				</div>

				{/* Content */}
				<div className="overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-140px)]">
					{activeTab === 'schema' && (
						<div className="p-4 sm:p-6">
							<div className="grid gap-4 sm:gap-6">
								{tables.map((table) => (
									<div
										key={table.name}
										className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200"
									>
										<h3 className="text-base sm:text-lg font-semibold text-black mb-3 flex items-center">
											<Table className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-black" />
											{table.name}
										</h3>
										<div className="bg-white rounded-md border border-gray-200 overflow-hidden">
											<div className="overflow-x-auto">
												<table className="w-full text-xs sm:text-sm">
													<thead className="bg-gray-100 border-b border-gray-200">
														<tr>
															<th className="px-2 sm:px-4 py-2 text-left font-semibold text-black">
																Column
															</th>
															<th className="px-2 sm:px-4 py-2 text-left font-semibold text-black">
																Type
															</th>
															<th className="px-2 sm:px-4 py-2 text-left font-semibold text-black">
																Nullable
															</th>
														</tr>
													</thead>
													<tbody>
														{table.columns.map(
															(column, index) => (
																<tr
																	key={index}
																	className="border-b border-gray-100 last:border-b-0"
																>
																	<td className="px-2 sm:px-4 py-2 font-medium text-black">
																		{
																			column.name
																		}
																	</td>
																	<td className="px-2 sm:px-4 py-2 text-gray-700">
																		{
																			column.type
																		}
																	</td>
																	<td className="px-2 sm:px-4 py-2">
																		<span
																			className={`inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
																				column.nullable
																					? 'bg-gray-100 text-gray-800'
																					: 'bg-black text-white'
																			}`}
																		>
																			{column.nullable
																				? 'NULL'
																				: 'NOT NULL'}
																		</span>
																	</td>
																</tr>
															)
														)}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === 'relationships' && (
						<div className="p-4 sm:p-6">
							{relationships.length > 0 ? (
								<div className="space-y-3 sm:space-y-4">
									{relationships.map((rel, index) => (
										<div
											key={index}
											className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200"
										>
											<div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
												<div className="flex-1">
													<div className="flex items-center space-x-2">
														<span className="font-semibold text-black text-sm sm:text-base">
															{rel.table}
														</span>
														<span className="text-gray-500">
															.
														</span>
														<span className="text-black font-medium text-sm sm:text-base">
															{rel.column}
														</span>
													</div>
												</div>
												<Link className="w-4 h-4 text-gray-400 hidden sm:block" />
												<div className="flex-1">
													<div className="flex items-center space-x-2">
														<span className="font-semibold text-black text-sm sm:text-base">
															{rel.foreignTable}
														</span>
														<span className="text-gray-500">
															.
														</span>
														<span className="text-black font-medium text-sm sm:text-base">
															{rel.foreignColumn}
														</span>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="text-center py-8">
									<Link className="w-12 h-12 text-gray-300 mx-auto mb-4" />
									<p className="text-gray-500">
										No foreign key relationships found
									</p>
								</div>
							)}
						</div>
					)}

					{activeTab === 'diagram' && (
						<div className="p-4 sm:p-6">
							<SchemaDiagram
								relationships={relationships}
								tables={tables}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
