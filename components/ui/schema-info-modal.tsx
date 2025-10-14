'use client';
import { useState, useMemo } from 'react';
import { X, Database, Table, Link, BarChart3, Search } from 'lucide-react';
import SchemaDiagram from './schema-diagram';
import { Input } from './input';

interface SchemaInfoModalProps {
	isOpen: boolean;
	onClose: () => void;
	databaseType: string;
	databaseName: string;
	schema: {
		tables: {
			name: string;
			columns: {
				column: string;
				type: string;
				nullable: boolean;
				default?: string;
			}[];
		}[];
	};
	relationships: any[];
}

export default function SchemaInfoModal({
	isOpen,
	onClose,
	databaseType,
	databaseName,
	schema,
	relationships,
}: SchemaInfoModalProps) {
	const [activeTab, setActiveTab] = useState<
		'schema' | 'relationships' | 'diagram'
	>('schema');
	const [searchQuery, setSearchQuery] = useState('');

	// Transform schema tables to match the component's expected format
	const tables = schema.tables.map((table) => ({
		name: table.name,
		columns: table.columns.map((col) => ({
			name: col.column,
			type: col.type,
			nullable: col.nullable,
		})),
	}));

	// Filter tables based on search query
	const filteredTables = useMemo(() => {
		if (!searchQuery.trim()) return tables;

		const query = searchQuery.toLowerCase();
		return tables
			.map((table) => {
				// Check if table name matches
				const tableMatches = table.name.toLowerCase().includes(query);

				// Filter columns that match
				const matchingColumns = table.columns.filter((column) =>
					column.name.toLowerCase().includes(query)
				);

				// Include table if table name matches OR has matching columns
				if (tableMatches || matchingColumns.length > 0) {
					return {
						...table,
						columns: tableMatches ? table.columns : matchingColumns,
					};
				}

				return null;
			})
			.filter(Boolean) as typeof tables;
	}, [searchQuery, tables]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-primary/60 bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
			<div className="bg-secondary rounded-lg shadow-xl max-w-4xl w-full h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
					<div className="flex items-center space-x-2 sm:space-x-3">
						<Database className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
						<div>
							<h2 className="text-lg sm:text-xl font-semibold text-primary">
								Database Schema Information
							</h2>

							<p className="text-xs sm:text-sm text-gray-600">
								Database Type:
								<span className="ml-1 font-medium text-primary">
									{databaseType}
								</span>
							</p>
							<p className="text-xs sm:text-sm text-gray-600">
								Database Name:
								<span className="ml-1 font-medium text-primary">
									{databaseName}
								</span>
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
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
								? 'text-primary border-b-2 border-primary'
								: 'text-gray-500 hover:text-primary'
						}`}
					>
						<Table className="w-3 h-3 sm:w-4 sm:h-4" />
						<span>Tables & Columns</span>
					</button>
					<button
						onClick={() => setActiveTab('relationships')}
						className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === 'relationships'
								? 'text-primary border-b-2 border-primary'
								: 'text-gray-500 hover:text-primary'
						}`}
					>
						<Link className="w-3 h-3 sm:w-4 sm:h-4" />
						<span>Relationships</span>
						{relationships.length > 0 && (
							<span className="bg-primary text-secondary text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full">
								{relationships.length}
							</span>
						)}
					</button>
					<button
						onClick={() => setActiveTab('diagram')}
						className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === 'diagram'
								? 'text-primary border-b-2 border-primary'
								: 'text-gray-500 hover:text-primary'
						}`}
					>
						<BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
						<span>Diagram</span>
					</button>
				</div>

				{/* Content */}
				<div className="overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-140px)] pb-4">
					{activeTab === 'schema' && (
						<div className="p-4 sm:p-6">
							{/* Search Bar */}
							<div className="mb-6 relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
								<Input
									type="text"
									placeholder="Search tables or fields..."
									value={searchQuery}
									onChange={(e) =>
										setSearchQuery(e.target.value)
									}
									className="pl-10 pr-10"
								/>
								{searchQuery && (
									<button
										onClick={() => setSearchQuery('')}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
									>
										<X className="w-4 h-4" />
									</button>
								)}
							</div>

							{/* Tables Grid */}
							<div className="grid gap-4 sm:gap-6">
								{filteredTables.length === 0 ? (
									<div className="text-center py-12">
										<Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
										<p className="text-gray-500">
											No tables or fields found matching "
											{searchQuery}"
										</p>
									</div>
								) : (
									filteredTables.map((table) => (
										<div
											key={table.name}
											className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200"
										>
											<h3 className="text-base sm:text-lg font-semibold text-primary mb-3 flex items-center">
												<Table className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
												{table.name}
											</h3>
											<div className="bg-secondary rounded-md border border-gray-200 overflow-hidden">
												<div className="overflow-x-auto">
													<table className="w-full text-xs sm:text-sm">
														<thead className="bg-gray-100 border-b border-gray-200">
															<tr>
																<th className="px-2 sm:px-4 py-2 text-left font-semibold text-primary">
																	Column
																</th>
																<th className="px-2 sm:px-4 py-2 text-left font-semibold text-primary">
																	Type
																</th>
																<th className="px-2 sm:px-4 py-2 text-left font-semibold text-primary">
																	Nullable
																</th>
															</tr>
														</thead>
														<tbody>
															{table.columns.map(
																(
																	column,
																	index
																) => (
																	<tr
																		key={
																			index
																		}
																		className="border-b border-gray-100 last:border-b-0"
																	>
																		<td className="px-2 sm:px-4 py-2 font-medium text-primary">
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
																						: 'bg-primary text-secondary'
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
									))
								)}
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
														<span className="font-semibold text-primary text-sm sm:text-base">
															{rel.table}
														</span>
														<span className="text-gray-500">
															.
														</span>
														<span className="text-primary font-medium text-sm sm:text-base">
															{rel.column}
														</span>
													</div>
												</div>
												<Link className="w-4 h-4 text-gray-400 hidden sm:block" />
												<div className="flex-1">
													<div className="flex items-center space-x-2">
														<span className="font-semibold text-primary text-sm sm:text-base">
															{rel.foreignTable}
														</span>
														<span className="text-gray-500">
															.
														</span>
														<span className="text-primary font-medium text-sm sm:text-base">
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
