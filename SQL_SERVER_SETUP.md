# SQL Server ODBC Setup Guide

## Prerequisites

1. **Microsoft ODBC Driver for SQL Server**: Install the appropriate ODBC driver for your platform:

    - **Windows**: Download from Microsoft's official site
    - **Linux**: Install using package manager (e.g., `sudo apt-get install msodbcsql18`)
    - **macOS**: Install using Homebrew (e.g., `brew install microsoft/mssql-release/mssql-tools18`)

2. **Node.js Dependencies**: The application will automatically install the required npm packages.

## Configuration

### Environment Variables

Set the following environment variables in your `.env` file:

```env
# Database Configuration
DATABASE_TYPE="sqlserver"

# SQL Server Configuration (ODBC)
SQLSERVER_CONNECTION_STRING="Server=your-server,1433;Database=your-database;UID=your-username;PWD=your-password;TrustServerCertificate=true;"
```

### Connection String Format

The SQL Server connection string follows this format:
