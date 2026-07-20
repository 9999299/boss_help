import React from 'react';
import ReactDOM from 'react-dom/client';
import Sidebar from './sidebar/Sidebar';

const root = ReactDOM.createRoot(document.getElementById('sidebar-root'));
root.render(
  <React.StrictMode>
    <Sidebar />
  </React.StrictMode>
);
