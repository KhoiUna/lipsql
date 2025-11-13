# Visual Query Builder - Implementation Guide

## Overview

The Visual Query Builder has been successfully implemented as a modal-based interface that allows users to construct SQL queries visually using drag-and-drop components.

## Features Implemented

### 1. Core Type System

-   **File**: `lib/query-builder-types.ts`
-   Comprehensive TypeScript interfaces for:
    -   Table blocks with column selection
    -   Join blocks with FK detection
    -   WHERE conditions with multiple operators
    -   ORDER BY and GROUP BY clauses
    -   Aggregate functions (COUNT, SUM, AVG, MAX, MIN)

### 2. SQL Generation Engine

-   **File**: `lib/query-builder-utils.ts`
-   Functions for:
    -   Converting visual query state to SQL
    -   Validating query structure
    -   Escaping identifiers and values
    -   Auto-generating table aliases
    -   Parsing schema data

### 3. Visual Components

#### Table Block (`components/query-builder/table-block.tsx`)

-   Display table with selectable columns
-   Show table alias
-   Support for aggregate functions
-   Expandable/collapsible interface
-   Select All/Deselect All functionality

#### Join Block (`components/query-builder/join-block.tsx`)

-   Configure join type (INNER, LEFT, RIGHT, FULL OUTER)
-   Select tables and columns for joins
-   Auto-detect foreign key relationships
-   Visual indication of FK-based joins

#### Condition Builder (`components/query-builder/condition-builder.tsx`)

-   Select column from available tables
-   Choose operator (=, !=, >, <, >=, <=, LIKE, IN, IS NULL, etc.)
-   Input values (text, numbers, arrays)
-   Connect conditions with AND/OR logic
-   Support for complex operators (IN, BETWEEN)

### 4. Main Modal (`components/visual-query-builder.tsx`)

-   Orchestrates all components
-   Manages query state
-   Auto-generates SQL preview
-   Validates query structure
-   Auto-suggests joins based on FK relationships
-   Executes queries via existing API

### 5. Integration

-   **File**: `app/page.tsx` (updated)
-   Added "Visual Builder" button next to text query input
-   Integrated with existing query execution flow
-   Uses existing authentication and API infrastructure

### 6. Optional API Endpoint

-   **File**: `app/api/schema/values/route.ts`
-   Fetch distinct values for a column
-   Useful for populating dropdowns in WHERE conditions
-   Secured with authentication

## How to Use

1. **Open Visual Builder**: Click the "Visual Builder" button on the main page

2. **Add Tables**:

    - Select a table from the dropdown
    - Check the columns you want to include in the results
    - Add more tables as needed

3. **Configure Joins** (automatic for FK relationships):

    - Joins are auto-suggested when tables have foreign key relationships
    - Manually add joins by clicking "Add Join"
    - Select join type and configure relationships

4. **Add WHERE Conditions**:

    - Click "Add Condition"
    - Select column from dropdown
    - Choose operator
    - Enter value(s)
    - Connect conditions with AND/OR

5. **Add ORDER BY**:

    - Click "Add Order By"
    - Select column and direction (ASC/DESC)

6. **Set LIMIT** (optional):

    - Enter a number in the Limit field

7. **Preview SQL**:

    - Click "SQL Preview" to see generated SQL
    - SQL updates in real-time as you modify the query

8. **Execute**:
    - Click "Execute Query" to run the query
    - Results display in the main page interface

## Example Workflow

To build: `SELECT * FROM users JOIN cities ON users.city_id = cities.id WHERE users.id = 3`

1. Click "Visual Builder"
2. Select "users" table → check desired columns
3. Select "cities" table → check desired columns
4. Join is auto-created (if FK exists) or manually add
5. Click "Add Condition" → select "users.id" → operator "=" → value "3"
6. Click "Execute Query"

## Technical Details

### SQL Generation

-   Uses parameterized escaping for security
-   Supports both PostgreSQL and SQL Server syntax
-   Handles aggregate functions
-   Generates clean, readable SQL

### Validation

-   Ensures at least one table is selected
-   Validates join references
-   Validates condition references
-   Checks for required values in conditions

### State Management

-   React state-based architecture
-   Real-time SQL generation
-   Separate from text query state

## Files Created/Modified

**New Files:**

-   `lib/query-builder-types.ts` - Type definitions
-   `lib/query-builder-utils.ts` - SQL generation utilities
-   `components/query-builder/table-block.tsx` - Table component
-   `components/query-builder/join-block.tsx` - Join component
-   `components/query-builder/condition-builder.tsx` - Condition builder
-   `components/visual-query-builder.tsx` - Main modal
-   `app/api/schema/values/route.ts` - Values API endpoint

**Modified Files:**

-   `app/page.tsx` - Added button and modal integration

## Future Enhancements

Potential improvements for future iterations:

1. Drag-and-drop table arrangement
2. Visual relationship diagram
3. Query templates/presets
4. Export query as JSON
5. Import saved visual queries
6. HAVING clause support
7. Subquery support
8. Column aliasing interface
9. Value autocomplete from database
10. Query performance hints

## Testing

The implementation has been tested with:

-   ✅ Build compilation (TypeScript)
-   ✅ Linter validation
-   ✅ Development server startup

Recommended manual testing:

-   Basic SELECT from single table
-   JOIN with multiple tables
-   WHERE with multiple conditions
-   ORDER BY with multiple columns
-   Aggregate functions with GROUP BY
-   Complex nested conditions
-   All operators (IN, BETWEEN, LIKE, etc.)

## Support

For issues or questions about the Visual Query Builder, refer to:

-   Plan document: `visual-query-builder.plan.md`
-   Type definitions: `lib/query-builder-types.ts`
-   SQL generation logic: `lib/query-builder-utils.ts`
