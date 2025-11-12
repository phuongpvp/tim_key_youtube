// Nội dung cho file: ApiKeyManager.tsx

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// ---- PHẦN 1: TẠO BỘ QUẢN LÝ KEY ----
interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  isLoading: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedKey = localStorage.getItem('user_api_key');
    if (storedKey) {
      setApiKeyState(storedKey);
    }
    setIsLoading(false);
  }, []);

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem('user_api_key', key);
    } else {
      localStorage.removeItem('user_api_key');
    }
  };

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey, isLoading }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};


// ---- PHẦN 2: TẠO GIAO DIỆN NHẬP KEY ----
export const ApiKeyInput = () => {
  const [inputValue, setInputValue] = useState('');
  const { setApiKey } = useApiKey();

  const handleSave = () => {
    if (inputValue.trim()) {
      setApiKey(inputValue.trim());
    } else {
      alert('Vui lòng nhập API key.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1rem',
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: '#1a1a1a',
      color: 'white'
    }}>
      <h2>Yêu cầu API Key</h2>
      <p>Để sử dụng công cụ, bạn cần cung cấp API Key của riêng mình.</p>
      <input
        type="password"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Nhập API key của bạn vào đây"
        style={{ padding: '0.8rem', width: 'clamp(250px, 80%, 400px)', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#333', color: 'white' }}
      />
      <button onClick={handleSave} style={{ padding: '0.8rem 1.5rem', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#5865F2', color: 'white', fontWeight: 'bold' }}>
        Lưu và Tiếp tục
      </button>
    </div>
  );
};
