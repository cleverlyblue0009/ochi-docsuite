# KMRL Development Setup Guide

This guide will help you set up and run both the frontend and backend of the KMRL Document Management System in VS Code.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **PostgreSQL** (v12 or higher)
- **Redis** (v6 or higher)
- **VS Code** with recommended extensions

### Recommended VS Code Extensions

Install these extensions for the best development experience:

- **TypeScript and JavaScript Language Features** (built-in)
- **ESLint** - For code linting
- **Prettier** - For code formatting
- **Auto Rename Tag** - For HTML/JSX tags
- **Bracket Pair Colorizer** - For better bracket visualization
- **GitLens** - Enhanced Git capabilities
- **Thunder Client** - For API testing (alternative to Postman)

## Project Structure

```
/workspace
├── src/                    # Frontend React app
├── kmrl-backend/          # Backend Node.js/Express app
├── .vscode/               # VS Code configuration
├── .env.example           # Environment variables template
└── DEVELOPMENT_SETUP.md   # This file
```

## Quick Start

### 1. Environment Setup

First, create your environment files:

```bash
# Copy environment templates
cp .env.example .env
cp kmrl-backend/.env.example kmrl-backend/.env
```

Edit both `.env` files with your actual configuration values (see [Environment Configuration](#environment-configuration) below).

### 2. Install Dependencies

Use VS Code's Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

1. Open Command Palette
2. Type "Tasks: Run Task"
3. Select "Install All Dependencies"

Or manually install:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd kmrl-backend
npm install
cd ..
```

### 3. Database Setup

Set up your PostgreSQL database:

```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE kmrl_db;
CREATE USER kmrl_user WITH PASSWORD 'kmrl_password';
GRANT ALL PRIVILEGES ON DATABASE kmrl_db TO kmrl_user;
\q

# Run migrations
cd kmrl-backend
npm run migrate
```

### 4. Start Development Servers

#### Option A: Using VS Code Tasks (Recommended)

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Tasks: Run Task"
3. Select "Start Both Servers"

This will start both frontend and backend servers in separate terminal panels.

#### Option B: Using VS Code Debugger

1. Go to the Run and Debug panel (`Ctrl+Shift+D` / `Cmd+Shift+D`)
2. Select "Launch Full Stack" from the dropdown
3. Click the green play button

#### Option C: Manual Terminal Commands

Open two terminal windows in VS Code:

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd kmrl-backend
npm run dev
```

## Access Your Application

Once both servers are running:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Environment Configuration

### Frontend (.env)

The frontend typically doesn't need many environment variables, but you can add:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=KMRL Document Management
```

### Backend (kmrl-backend/.env)

**Required for basic functionality:**

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://kmrl_user:kmrl_password@localhost:5432/kmrl_db
ALLOWED_ORIGINS=http://localhost:5173
```

**Optional services (can be set up later):**

```env
# Redis (for caching and queues)
REDIS_URL=redis://localhost:6379

# Elasticsearch (for advanced search)
ELASTICSEARCH_URL=http://localhost:9200

# Firebase (for authentication)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

## Available VS Code Tasks

Access these through Command Palette → "Tasks: Run Task":

### Development Tasks
- **Start Both Servers** - Runs frontend and backend simultaneously
- **Start Frontend Dev Server** - Runs only the React dev server
- **Start Backend Dev Server** - Runs only the Node.js server with hot reload

### Build Tasks
- **Install All Dependencies** - Installs npm packages for both projects
- **Build Frontend** - Creates production build of React app
- **Build Backend** - Compiles TypeScript to JavaScript

### Quality Tasks
- **Lint Frontend** - Runs ESLint on React code
- **Lint Backend** - Runs ESLint on Node.js code

## Debugging

### Backend Debugging

1. Set breakpoints in your TypeScript files
2. Go to Run and Debug panel (`Ctrl+Shift+D`)
3. Select "Debug Backend" or "Debug Backend (with nodemon)"
4. Press F5 or click the green play button

The debugger will attach to your Node.js process and stop at breakpoints.

### Frontend Debugging

Use your browser's developer tools:

1. Open Chrome DevTools (`F12`)
2. Go to Sources tab
3. Set breakpoints in your React components
4. The source maps will show your original TypeScript code

## Common Development Workflows

### Adding New API Endpoints

1. Create route handler in `kmrl-backend/src/routes/`
2. Add controller logic in `kmrl-backend/src/controllers/`
3. Update models if needed in `kmrl-backend/src/models/`
4. Test using Thunder Client or browser

### Adding New Frontend Components

1. Create component in `src/components/`
2. Add to routing if needed in `src/App.tsx`
3. Import and use in parent components

### Database Changes

1. Modify `kmrl-backend/src/config/schema.sql`
2. Run migrations: `cd kmrl-backend && npm run migrate`
3. Update models in `kmrl-backend/src/models/`

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or for port 5173
lsof -ti:5173 | xargs kill -9
```

### Database Connection Issues

1. Ensure PostgreSQL is running: `sudo service postgresql start`
2. Check your DATABASE_URL in `.env`
3. Verify database and user exist
4. Test connection: `psql postgresql://kmrl_user:kmrl_password@localhost:5432/kmrl_db`

### Module Not Found Errors

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   
   cd kmrl-backend
   rm -rf node_modules package-lock.json
   npm install
   ```

### TypeScript Compilation Errors

1. Check VS Code's TypeScript version (bottom right corner)
2. Restart TypeScript server: Command Palette → "TypeScript: Restart TS Server"
3. Check `tsconfig.json` files for configuration issues

## Additional Services Setup

### Redis (Optional but recommended)

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis
```

### Elasticsearch (Optional for advanced search)

```bash
# Using Docker
docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" elasticsearch:7.17.0
```

## Production Build

To create production builds:

```bash
# Frontend
npm run build

# Backend
cd kmrl-backend
npm run build
npm run start:prod
```

## Getting Help

- Check the console output for error messages
- Use VS Code's integrated terminal for better error visibility
- Check the `kmrl-backend/logs/` directory for detailed backend logs
- Use Thunder Client extension to test API endpoints directly in VS Code

## Next Steps

1. Set up Firebase authentication
2. Configure AWS S3 for file storage
3. Set up Redis for better performance
4. Add Elasticsearch for advanced search capabilities
5. Configure CI/CD pipeline

Happy coding! 🚀