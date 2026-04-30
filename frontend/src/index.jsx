import React from 'react';
import { createRoot } from 'react-dom/client';
import { DataCleaningTool } from './components/cleaning/index.js';
import './components/cleaning/styles.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DataCleaningTool />
  </React.StrictMode>
);
