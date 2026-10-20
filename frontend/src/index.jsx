import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// must come last: overrides RSuite's `:root` design tokens for theming
import './theme-bridge.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App />
);


