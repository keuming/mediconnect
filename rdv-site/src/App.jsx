import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import RDV from './pages/RDV';
import Confirmation from './pages/Confirmation';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{
        duration: 4000,
        style: { background: '#141E2B', color: '#F0F4F8', border: '1px solid #1E2F42', fontSize: 14, borderRadius: 12 },
        success: { iconTheme: { primary: '#0A8F58', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#E11D48', secondary: '#fff' } },
      }} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rdv" element={<RDV />} />
        <Route path="/confirmation" element={<Confirmation />} />
      </Routes>
    </BrowserRouter>
  );
}
