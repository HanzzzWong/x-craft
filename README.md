# X-Craft Application

A Next.js application for recycling creative projects.

## Database Setup - Microsoft SQL Server

This application uses Microsoft SQL Server for data storage. Follow these steps to set up the database:

### Prerequisites

1. **Install SQL Server:**
   - Install [Microsoft SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (Express version is free and sufficient for development)
   - Install [SQL Server Management Studio (SSMS)](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms) for managing your database

### Database Configuration

1. **Create a new database:**
   - Open SQL Server Management Studio
   - Connect to your SQL Server instance
   - Right-click on "Databases" and select "New Database"
   - Name it `x_craft_db` (or choose your own name and update the .env file accordingly)

2. **Configure your environment:**
   - Copy the `.env.example` file to `.env.local`
   - Update the SQL Server connection parameters:
     ```
     MSSQL_USER=your_username
     MSSQL_PASSWORD=your_password
     MSSQL_SERVER=localhost (or your server address)
     MSSQL_DATABASE=x_craft_db
     JWT_SECRET=your_jwt_secret_key_here
     ```

3. **Application setup:**
   - The database schema will be automatically created when you start the application for the first time
   - Alternatively, you can manually execute the SQL scripts in `src/db/schema.sql` to set up the database schema

## Running the Application

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Features

- User authentication with JWT tokens
- DIY project management with SQL Server storage
- YouTube video integration for project steps
- Responsive UI for desktop and mobile devices
