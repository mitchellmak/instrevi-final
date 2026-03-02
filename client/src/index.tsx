import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './hooks/useAuth';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const browserRouterProps: any = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

root.render(
  <React.StrictMode>
    <BrowserRouter {...browserRouterProps}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
