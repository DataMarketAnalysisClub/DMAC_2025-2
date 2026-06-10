import { useEffect, useState } from 'react';
import { usePolling } from '../../hooks/usePolling';

/** Red banner shown when the FastAPI backend is unreachable. */
export function BackendBanner() {
  const [down, setDown] = useState(false);

  function check() {
    fetch('/health')
      .then((res) => setDown(!res.ok))
      .catch(() => setDown(true));
  }

  useEffect(check, []);
  usePolling(check, 15_000);

  if (!down) return null;

  return (
    <div className="flex items-center justify-center gap-2 h-6 bg-[#7f1d1d] border-b border-[#991b1b]">
      <span className="text-[#fecaca] text-[11px] font-semibold tracking-wide">
        ⚠ BACKEND UNREACHABLE — data will not refresh. Is the API running on port 8000?
      </span>
    </div>
  );
}
