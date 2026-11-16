# JiffyNote - Docker & Database Setup (Phase 5)

## Quick Start

To start the entire JiffyNote application with PostgreSQL database in one command:

```bash
docker-compose up -d --build
```

This single command will:
1. Build the React application
2. Start the PostgreSQL database
3. Run the application on port 80
4. Connect everything together

To access the application, open your browser and go to: http://localhost

To view logs:
```bash
docker-compose logs -f
```

To stop the application:
```bash
docker-compose down
```

## Development Setup (Without Docker)

For local development without Docker:

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration (set USE_DATABASE=false for localStorage)

# Start development server
npm start
```

## Environment Configuration

Create a `.env` file with the following variables:

```env
# Database Configuration (set to true to use PostgreSQL)
USE_DATABASE=false
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=jiffynote_db
POSTGRES_USER=jiffynote_user
POSTGRES_PASSWORD=secure_password

# Application Configuration
NODE_ENV=production
APP_PORT=80
REACT_APP_API_URL=http://localhost:8080/api

# Authentication Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=10
```

## Overview

Phase 5 implements a complete Docker-based infrastructure with PostgreSQL database integration. The application can now work with both localStorage (development) and PostgreSQL (production) through a flexible storage service.

## Architecture

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Calendar Events Table
```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    color VARCHAR(50) DEFAULT '#039be5',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Notes Table
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_reminder BOOLEAN DEFAULT FALSE,
    reminder_type VARCHAR(20) CHECK (reminder_type IN ('now', 'later', 'todo', null)),
    section VARCHAR(20) DEFAULT 'general' CHECK (section IN ('now', 'later', 'todo', 'general'))
);
```

#### Event-Note Attachments Table
```sql
CREATE TABLE event_note_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, note_id)
);
```

## Docker Configuration

### Docker Compose

The `docker-compose.yml` file defines two services:

1. **PostgreSQL Database** (`postgres`)
   - Image: postgres:15-alpine
   - Database: jiffynote_db
   - User: jiffynote_user
   - Port: 5432

2. **React Application** (`app`)
   - Built from Dockerfile
   - Served via Nginx
   - Port: 80
   - Depends on PostgreSQL

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=jiffynote_db
POSTGRES_USER=jiffynote_user
POSTGRES_PASSWORD=secure_password

# Application Configuration
NODE_ENV=production
APP_PORT=80
REACT_APP_API_URL=http://localhost:8080/api

# Authentication Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=10
```

## Database Migrations

The Docker entrypoint applies migration `004_planner_data.sql` automatically only
when it initializes a new PostgreSQL data volume. For an existing volume, apply
the migration once with `psql` against the `jiffynote_db` database before using
planner persistence.

### Initial Schema

The migration script `database/migrations/001_initial_schema.sql` creates:

- All database tables with proper constraints
- Indexes for performance optimization
- Triggers for automatic `updated_at` timestamp updates
- Views for simplified queries

### Seed Data

The seed script `database/seed/001_sample_data.sql` inserts:

- 3 sample users (with bcrypt-hashed passwords)
- Sample calendar events for each user
- Sample notes with different sections (Now/Later/Todo)
- Event-note attachments

## Application Integration

### Storage Service

The `storageService.ts` provides a unified interface that automatically switches between localStorage and PostgreSQL:

```typescript
import storageService from './services/storageService';

// Get events
const events = await storageService.getEvents(userId);

// Create note
const note = await storageService.createNote(noteData, userId);

// Update event
await storageService.updateEvent(eventId, updates, userId);
```

### Automatic Failover

The storage service automatically falls back to localStorage if the database is unavailable:

```typescript
// If database is not configured or unavailable, uses localStorage
const events = await storageService.getEvents(userId);
```

### Environment-Based Configuration

Set `USE_DATABASE=true` in your `.env` file to use PostgreSQL:

```env
USE_DATABASE=true
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=jiffynote_db
POSTGRES_USER=jiffynote_user
POSTGRES_PASSWORD=secure_password
```

## Setup Instructions

### Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start PostgreSQL (Optional)**
   ```bash
   docker-compose up -d postgres
   ```

4. **Run Application**
   ```bash
   npm start
   ```

### Production Setup

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Start All Services**
   ```bash
   docker-compose up -d
   ```

3. **View Logs**
   ```bash
   docker-compose logs -f
   ```

## Database Connection Service

### databaseService.ts

The `databaseService.ts` file contains the `DatabaseService` class with methods for:

- **Event Operations**
  - `getEventsByUserId(userId)`
  - `getEventById(eventId, userId)`
  - `createEvent(event, userId)`
  - `updateEvent(eventId, event)`
  - `deleteEvent(eventId)`

- **Note Operations**
  - `getNotesByUserId(userId)`
  - `getNoteById(noteId, userId)`
  - `createNote(note, userId)`
  - `updateNote(noteId, note)`
  - `deleteNote(noteId)`

- **Authentication**
  - `getUserByUsername(username)`
  - `getUserByEmail(email)`
  - `createUser(username, email, passwordHash)`

## Security Features

- **Password Hashing**: Uses bcrypt with 10 salt rounds
- **SQL Injection Protection**: Parameterized queries
- **CORS Protection**: Configured in nginx
- **Environment Variables**: Sensitive data stored in `.env`

## Troubleshooting

### Database Connection Issues

If the application can't connect to the database:

1. Check if PostgreSQL container is running:
   ```bash
   docker-compose ps
   ```

2. Verify database credentials in `.env`:
   ```env
   POSTGRES_USER=jiffynote_user
   POSTGRES_PASSWORD=secure_password
   ```

3. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

### Migration Issues

If migrations fail:

1. Drop and recreate database:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

2. Or manually reset:
   ```bash
   docker exec -it jiffynote_postgres psql -U jiffynote_user -d jiffynote_db
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Real-time synchronization
- [ ] Conflict resolution for offline scenarios
- [ ] Database backup automation
- [ ] Connection pooling
- [ ] Query caching

## Files Reference

### Core Files
- `docker-compose.yml` - Multi-container orchestration
- `Dockerfile` - Application container definition
- `nginx.conf` - Nginx configuration

### Database Files
- `database/migrations/001_initial_schema.sql` - Schema migration
- `database/seed/001_sample_data.sql` - Seed data

### Application Files
- `src/services/databaseService.ts` - Database connection and operations
- `src/services/authService.ts` - Authentication logic
- `src/services/storageService.ts` - Unified storage interface
- `src/DataBase/DataBaseQueries.ts` - Query utilities

## Version Information

- **Phase**: 5
- **Status**: ✅ COMPLETED
- **Date**: 2026-11-08
- **Docker Version**: 20.10+
- **PostgreSQL Version**: 15-alpine
- **Node.js Version**: 18-alpine
