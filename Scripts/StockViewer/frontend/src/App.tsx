import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from './components/layout/TopBar';
import { IndexBar } from './components/layout/IndexBar';
import { BackendBanner } from './components/layout/BackendBanner';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { MarketPage } from './pages/MarketPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { PortfolioDetailPage } from './pages/PortfolioDetailPage';
import { useWatchlistStore } from './store/useWatchlistStore';

export default function App() {
  const loadAll = useWatchlistStore((s) => s.loadAll);

  useEffect(() => {
    loadAll().catch(console.error);
  }, [loadAll]);

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-[#0d0d0d] text-[#e2e8f0]">
        <TopBar />
        <IndexBar />
        <BackendBanner />
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<MarketPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/portfolio/:id" element={<PortfolioDetailPage />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </div>
    </BrowserRouter>
  );
}
