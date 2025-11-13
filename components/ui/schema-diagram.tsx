'use client';
import { useMemo } from 'react';

interface SchemaDiagramProps {
	relationships: any[];
	tables: { name: string; columns: any[] }[];
}

export default function SchemaDiagram({
	relationships,
	tables,
}: SchemaDiagramProps) {
	const diagramData = useMemo(() => {
		const tablePositions = new Map<string, { x: number; y: number }>();
		const tableWidth = 120;
		const tableHeight = 80;
		const spacing = 200;

		// Position tables in a grid
		tables.forEach((table, index) => {
			const row = Math.floor(index / 3);
			const col = index % 3;
			tablePositions.set(table.name, {
				x: col * spacing + 50,
				y: row * spacing + 50,
			});
		});

		// Generate relationship lines
		const lines = relationships
			.map((rel) => {
				const fromTable = tablePositions.get(rel.table);
				const toTable = tablePositions.get(rel.foreignTable);

				if (!fromTable || !toTable) return null;

				return {
					x1: fromTable.x + tableWidth / 2,
					y1: fromTable.y + tableHeight,
					x2: toTable.x + tableWidth / 2,
					y2: toTable.y,
					table: rel.table,
					foreignTable: rel.foreignTable,
				};
			})
			.filter((line): line is NonNullable<typeof line> => line !== null);

		return { tablePositions, lines, tableWidth, tableHeight };
	}, [relationships, tables]);

	if (tables.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				No tables found to display
			</div>
		);
	}

	const maxX = Math.max(
		...Array.from(diagramData.tablePositions.values()).map((pos) => pos.x)
	);
	const maxY = Math.max(
		...Array.from(diagramData.tablePositions.values()).map((pos) => pos.y)
	);

	return (
		<div className="overflow-auto border border-gray-200 rounded-lg">
			<svg
				width={maxX + diagramData.tableWidth + 100}
				height={maxY + diagramData.tableHeight + 100}
				className="bg-secondary"
			>
				{/* Relationship lines */}
				{diagramData.lines.map((line, index) => (
					<g key={index}>
						<line
							x1={line.x1}
							y1={line.y1}
							x2={line.x2}
							y2={line.y2}
							stroke="#3B82F6"
							strokeWidth="2"
							markerEnd="url(#arrowhead)"
						/>
						<text
							x={(line.x1 + line.x2) / 2}
							y={(line.y1 + line.y2) / 2 - 5}
							textAnchor="middle"
							fontSize="10"
							fill="#6B7280"
						>
							FK
						</text>
					</g>
				))}

				{/* Arrow marker */}
				<defs>
					<marker
						id="arrowhead"
						markerWidth="10"
						markerHeight="7"
						refX="9"
						refY="3.5"
						orient="auto"
					>
						<polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" />
					</marker>
				</defs>

				{/* Tables */}
				{Array.from(diagramData.tablePositions.entries()).map(
					([tableName, position]) => (
						<g key={tableName}>
							<rect
								x={position.x}
								y={position.y}
								width={diagramData.tableWidth}
								height={diagramData.tableHeight}
								fill="#F3F4F6"
								stroke="#D1D5DB"
								strokeWidth="2"
								rx="4"
							/>
							<text
								x={position.x + diagramData.tableWidth / 2}
								y={position.y + 20}
								textAnchor="middle"
								fontSize="12"
								fontWeight="bold"
								fill="#1F2937"
							>
								{tableName}
							</text>
							<text
								x={position.x + diagramData.tableWidth / 2}
								y={position.y + 35}
								textAnchor="middle"
								fontSize="10"
								fill="#6B7280"
							>
								Table
							</text>
						</g>
					)
				)}
			</svg>
		</div>
	);
}
