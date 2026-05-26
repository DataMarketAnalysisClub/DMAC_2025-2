import { TopBar } from './components/layout/TopBar';
import { IndexBar } from './components/layout/IndexBar';
import { MarketPage } from './pages/MarketPage';

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] text-[#e2e8f0]">
      <TopBar />
      <IndexBar />
      <div className="flex-1 overflow-hidden">
        <MarketPage />
      </div>
    </div>
  );
}
