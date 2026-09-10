import { Client } from 'pg';

// Database connection configuration
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'jiffynote_db',
  user: 'jiffynote_user',
  password: 'secure_password'
};

// Database connection instance
let dbClient: Client | null = null;

// Initialize database connection
const connectToDatabase = async (): Promise<void> => {
  if (dbClient) return;

  try {
    dbClient = new Client(DB_CONFIG);
    await dbClient.connect();
    console.log('Connected to PostgreSQL database successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

// Read data from database
const readDataFromDB = async (query: string, params?: any[]): Promise<any[]> => {
  if (!dbClient) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }

  try {
    const result = await dbClient.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Read operation failed:', error);
    throw error;
  }
};

// Write data to database
const writeDataToDB = async (query: string, params?: any[]): Promise<boolean> => {
  if (!dbClient) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }

  try {
    await dbClient.query(query, params);
    return true;
  } catch (error) {
    console.error('Write operation failed:', error);
    return false;
  }
};

// Close database connection
const closeDatabaseConnection = async (): Promise<void> => {
  if (dbClient) {
    await dbClient.end();
    console.log('Database connection closed');
    dbClient = null;
  }
};

export { connectToDatabase, readDataFromDB, writeDataToDB, closeDatabaseConnection };