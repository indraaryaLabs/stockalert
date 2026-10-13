import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/dasar.css';
import './styles/komponen.css';
import { App } from './App';

const wadah = document.getElementById('root');
if (!wadah) {
  throw new Error('Elemen #root tidak ditemukan di index.html');
}

createRoot(wadah).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
