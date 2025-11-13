# LipSQL

LipSQL uses AI (Gemini) to let users use natural language to speak with a database so they do not have to write SQL queries at all!

The backend code connects to the database engine and get the database schemas (its tables, its columns and data types) so the AI knows its structure and gets more context. Then user will input and AI turns that input into a SQL statement and the code will execute that query and returns the data to the user as a UI on the frontend.

## Features

-   **Natural Language to SQL**: Convert plain English queries to SQL using AI
-   **Database Schema Viewer**: Click the "Schema Info" button in the header to view:
    -   Database type and connection information
    -   Complete table structure with columns and data types
    -   Foreign key relationships between tables
    -   Visual diagram showing table relationships
-   **Query History**: Save and reuse previous queries
-   **Direct SQL Execution**: Execute raw SQL queries directly
-   **Secure**: Only SELECT queries are allowed for security

## Documentation

Additional documentation is available in the `docs/` folder:

-   [SQL Server Setup Guide](docs/SQL_SERVER_SETUP.md) - Instructions for configuring SQL Server connections
-   [Visual Query Builder Guide](docs/VISUAL_QUERY_BUILDER_GUIDE.md) - How to use the visual query builder feature

## Tech stack

-   NextJS
-   shadcn/ui + TailwindCSS
-   Gemini
-   SQLite
