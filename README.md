# JiffyNote
Calendar planner with notes management

## Features
- Calendar view with week/month modes
- Notes management with drag-and-drop organization
- Dark/Light mode theme toggle
- Docker containerization for easy deployment
- PostgreSQL database for data persistence

# Extensions
     Container
     Docker

# Requirements 

     Node.js V24.21.0
     NPM V11.19.0
     TypeScript V7.0.2
     Docker V24.0.0
     Docker Compose V2.24.0

---

## Installation and Setup

### Option 1: Docker Setup (Recommended)

#### Prerequisites
- Docker installed on your machine
- Docker Compose installed

#### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd JiffyNote
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your preferred configuration.

3. **Build and start containers**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Application: http://localhost:80
   - PostgreSQL: localhost:5432

5. **View logs**
   ```bash
   docker-compose logs -f
   ```

6. **Stop containers**
   ```bash
   docker-compose down
   ```

7. **Stop containers and remove volumes**
   ```bash
   docker-compose down -v
   ```

---

### Option 2: Local Development Setup

#### Prerequisites
- Node.js v18 or higher
- PostgreSQL v15 or higher
- TypeScript

#### Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database**

   a. **Start PostgreSQL server**
   ```bash
   # Windows (if using pgAdmin)
   # Start PostgreSQL service from Services or pgAdmin
   
   # Linux/Mac
   sudo service postgresql start
   ```

   b. **Create database and user**
   ```sql
   CREATE USER jiffynote_user WITH PASSWORD 'secure_password';
   CREATE DATABASE jiffynote_db;
   GRANT ALL PRIVILEGES ON DATABASE jiffynote_db TO jiffynote_user;
   ```

   c. **Run database migrations**
   ```bash
   psql -U jiffynote_user -d jiffynote_db -f database/migrations/001_initial_schema.sql
   ```

   d. **Run seed data (optional)**
   ```bash
   psql -U jiffynote_user -d jiffynote_db -f database/seed/001_sample_data.sql
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your database configuration.

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Application: http://localhost:3000

6. **Build for production**
   ```bash
   npm run build
   ```

7. **Run tests**
   ```bash
   npm test
   ```

---

## Database Schema

### Tables
1. **users** - User accounts
2. **calendar_events** - Calendar events
3. **notes** - Notes with reminder functionality
4. **event_note_attachments** - Event-note relationships

### Views
1. **v_calendar_events** - Events with user info
2. **v_notes** - Notes with user info

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| POSTGRES_HOST | Database host | localhost |
| POSTGRES_PORT | Database port | 5432 |
| POSTGRES_DB | Database name | jiffynote_db |
| POSTGRES_USER | Database user | jiffynote_user |
| POSTGRES_PASSWORD | Database password | secure_password |
| NODE_ENV | Environment | development |
| APP_PORT | Application port | 80 |
| JWT_SECRET | JWT secret key | (required) |
| JWT_EXPIRES_IN | JWT expiration | 7d |

---

## Docker Compose Commands

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs

# Follow logs
docker-compose logs -f

# Stop services
docker-compose stop

# Restart services
docker-compose restart

# Stop and remove everything
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild after changes
docker-compose up --build
```

---

## Database Commands

```bash
# Connect to PostgreSQL
docker exec -it jiffynote_postgres psql -U jiffynote_user -d jiffynote_db

# Run migration manually
docker exec -i jiffynote_postgres psql -U jiffynote_user -d jiffynote_db -f /docker-entrypoint-initdb.d/001_initial_schema.sql

# Backup database
docker exec -i jiffynote_postgres pg_dump -U jiffynote_user jiffynote_db > backup.sql

# Restore database
docker exec -i jiffynote_postgres psql -U jiffynote_user jiffynote_db < backup.sql
```

---

## Troubleshooting

### Docker Issues

**Container won't start**
```bash
# Check logs
docker-compose logs

# Rebuild container
docker-compose up --build
```

**Database connection failed**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres
```

### Local Development Issues

**Port already in use**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

**Database connection issues**
```bash
# Check PostgreSQL status
sudo service postgresql status

# Restart PostgreSQL
sudo service postgresql restart
```

---

## Future Enhancements
- Real-time collaboration on notes
- Advanced calendar sharing features
- Email notifications for reminders
- Mobile app version
- AI-powered event suggestions
- Calendar analytics and insights