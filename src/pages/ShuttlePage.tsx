import { useCallback, useEffect, useState } from 'react';
import { BatteryCharging, Bot, RefreshCw } from 'lucide-react';
import { fetchShuttleStatus } from '../api/client';
import type { ShuttleStatus } from '../types';

export function ShuttlePage() {
  const [shuttle, setShuttle] = useState<ShuttleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShuttle = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchShuttleStatus();
      setShuttle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shuttle status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShuttle();
  }, [loadShuttle]);

  const batteryColor =
    (shuttle?.battery_percentage ?? 0) >= 50
      ? 'bg-emerald-600'
      : (shuttle?.battery_percentage ?? 0) >= 20
        ? 'bg-amber-500'
        : 'bg-rose-600';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shuttle Status</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Database-backed telemetry for the floor transfer shuttle
          </p>
        </div>
        <button
          type="button"
          onClick={loadShuttle}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          Loading shuttle telemetry...
        </div>
      ) : shuttle ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Shuttle Identifier
                </p>
                <p className="text-xl font-bold text-slate-900" data-testid="shuttle-identifier">
                  {shuttle.identifier}
                </p>
              </div>
            </div>

            <span
              data-testid="shuttle-status"
              className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300"
            >
              {shuttle.status}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <BatteryCharging className="w-4 h-4 text-slate-500" />
                Battery Level
              </span>
              <span className="font-bold text-slate-900" data-testid="shuttle-battery">
                {shuttle.battery_percentage}%
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${batteryColor}`}
                style={{ width: `${Math.min(100, Math.max(0, shuttle.battery_percentage))}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Operating range: A1 Transfer ↔ 24 Storage Locations</span>
            <span>Updated: {new Date(shuttle.updated_at).toLocaleString()}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
