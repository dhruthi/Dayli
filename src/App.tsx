import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeView } from './pages/HomeView';
import { SimulatorView } from './pages/SimulatorView';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/simulator" element={<SimulatorView />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}

export default App;
