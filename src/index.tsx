//import React, { useState } from 'react';
//import { connectToDatabase, readDataFromDB, writeDataToDB, closeDatabaseConnection } from './DataBase/DataBaseQueries';

const App: React.FC = () => {
  //const [inputValue, setInputValue] = useState<string>('');

  const handleButtonClick = () => {
    console.log('testing input');
    // This will send 'testing input' to the console
  };

  // Future interactivity with Docker SQL container - now implemented in separate file
  // Database connection and operations are handled by DataBaseQueries.ts
  
 /* 
    const handleDatabaseInteraction = async () => {
    try {
      // Connect to database first
      await connectToDatabase();
      
      // Example: Read data from database
      const result = await readDataFromDB('SELECT * FROM notes');
      console.log('Data from database:', result);
      
      // Example: Write data to database
      const success = await writeDataToDB(
        'INSERT INTO notes (title, content) VALUES ($1, $2)',
        ['My First Note', 'This is the content of my first note']
      );
      
      if (success) {
        console.log('Data written to database successfully');
      }
    } catch (error) {
      console.error('Database operation failed:', error);
    }
  };
*/
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Hello, World!</h1>
      <p>This is a React TypeScript application.</p>
      <button onClick={handleButtonClick}>
        Send Testing Input to Console
      </button>
      
    </div>
  );
};

export default App;