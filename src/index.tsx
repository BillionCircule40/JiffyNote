import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// @ts-ignore
import './App.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing <div id="root"> in public/index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
