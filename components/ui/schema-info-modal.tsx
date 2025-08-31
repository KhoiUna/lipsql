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
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div className="flex items-center space-x-3">
						<Database className="w-6 h-6 text-blue-600" />
						<div>
							<h2 className="text-xl font-semibold text-gray-900">
								Database Schema Information
							</h2>
							<p className="text-sm text-gray-600">
								Database Type:{' '}
								<span className="font-medium">
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
				<div className="flex border-b border-gray-200">
					<button
						onClick={() => setActiveTab('schema')}
						className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
							activeTab === 'schema'
								? 'text-blue-600 border-b-2 border-blue-600'
								: 'text-gray-500 hover:text-gray-700'
						}`}
					>
						<Table className="w-4 h-4" />
						<span>Tables & Columns</span>
					</button>
					<button
						onClick={() => setActiveTab('relationships')}
						className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
							activeTab === 'relationships'
								? 'text-blue-600 border-b-2 border-blue-600'
								: 'text-gray-500 hover:text-gray-700'
						}`}
					>
						<Link className="w-4 h-4" />
						<span>Relationships</span>
						{relationships.length > 0 && (
							<span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
								{relationships.length}
							</span>
						)}
					</button>
					<button
						onClick={() => setActiveTab('diagram')}
						className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
							activeTab === 'diagram'
								? 'text-blue-600 border-b-2 border-blue-600'
								: 'text-gray-500 hover:text-gray-700'
						}`}
					>
						<BarChart3 className="w-4 h-4" />
						<span>Diagram</span>
					</button>
				</div>

				{/* Content */}
				<div className="overflow-y-auto max-h-[calc(90vh-140px)]">
					{activeTab === 'schema' && (
						<div className="p-6">
							<div className="grid gap-6">
								{tables.map((table) => (
									<div
										key={table.name}
										className="bg-gray-50 rounded-lg p-4 border border-gray-200"
									>
										<h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
											<Table className="w-5 h-5 mr-2 text-blue-600" />
											{table.name}
										</h3>
										<div className="bg-white rounded-md border border-gray-200 overflow-hidden">
											<table className="w-full text-sm">
												<thead className="bg-gray-100 border-b border-gray-200">
													<tr>
														<th className="px-4 py-2 text-left font-semibold text-gray-700">
															Column
														</th>
														<th className="px-4 py-2 text-left font-semibold text-gray-700">
															Type
														</th>
														<th className="px-4 py-2 text-left font-semibold text-gray-700">
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
																<td className="px-4 py-2 font-medium text-gray-900">
																	{
																		column.name
																	}
																</td>
																<td className="px-4 py-2 text-gray-700">
																	{
																		column.type
																	}
																</td>
																<td className="px-4 py-2">
																	<span
																		className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
																			column.nullable
																				? 'bg-yellow-100 text-yellow-800'
																				: 'bg-green-100 text-green-800'
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
								))}
							</div>
						</div>
					)}

					{activeTab === 'relationships' && (
						<div className="p-6">
							{relationships.length > 0 ? (
								<div className="space-y-4">
									{relationships.map((rel, index) => (
										<div
											key={index}
											className="bg-gray-50 rounded-lg p-4 border border-gray-200"
										>
											<div className="flex items-center space-x-4">
												<div className="flex-1">
													<div className="flex items-center space-x-2">
														<span className="font-semibold text-gray-900">
															{rel.table}
														</span>
														<span className="text-gray-500">
															.
														</span>
														<span className="text-blue-600 font-medium">
															{rel.column}
														</span>
													</div>
												</div>
												<Link className="w-4 h-4 text-gray-400" />
												<div className="flex-1">
													<div className="flex items-center space-x-2">
														<span className="font-semibold text-gray-900">
															{rel.foreignTable}
														</span>
														<span className="text-gray-500">
															.
														</span>
														<span className="text-green-600 font-medium">
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
						<div className="p-6">
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
