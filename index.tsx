// Nội dung mới cho file: index.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ApiKeyProvider } from './ApiKeyManager'; // Import từ file vừa tạo

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApiKeyProvider> {/* Bọc App bằng Provider này */}
      <App />
    </ApiKeyProvider>
  </React.StrictMode>,
);
