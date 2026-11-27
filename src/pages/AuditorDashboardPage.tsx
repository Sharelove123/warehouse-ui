import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { fetchAuditorDashboard, fetchAuditorMovements } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  AuditorDashboardResponse,
  MovementLog,
  MovementsPagination,
} from '../types';

const DEFAULT_MOVEMENTS_PAGINATION: MovementsPagination = {
  page: 1,
  page_size: 10,
  total_count: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
};

export function AuditorDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AuditorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [movementsPagination, setMovementsPagination] = useState<MovementsPagination>(
    DEFAULT_MOVEMENTS_PAGINATION
  );
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState<'ALL' | 'LOAD' | 'UNLOAD'>('ALL');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementPage, setMovementPage] = useState(1);
  const hasLoadedDashboardRef = useRef(false);

  const canView = user?.role === 'AUDITOR' || user?.role === 'ADMIN';

  const loadDashboard = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [dashRes, movRes] = await Promise.all([
        fetchAuditorDashboard(),
        hasLoadedDashboardRef.current
          ? fetchAuditorMovements({
              page: movementPage,
              pageSize: 10,
              action: actionFilter,
              q: movementSearch,
            })
          : Promise.resolve(null),
      ]);
      hasLoadedDashboardRef.current = true;
      setData(dashRes);
      if (movRes) {
        setMovements(movRes.results);
        setMovementsPagination(movRes.pagination);
      } else {
        setMovements(dashRes.recent_movements);
        setMovementsPagination(dashRes.movements_pagination);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load auditor dashboard.');
    } finally {
      setLoading(false);
    }
  }, [canView, movementPage, actionFilter, movementSearch]);

  useEffect(() => {
    if (!hasLoadedDashboardRef.current) {
      loadDashboard();
    }
  }, [loadDashboard]);

  useEffect(() => {
    if (!canView || !hasLoadedDashboardRef.current) return;
    let cancelled = false;
    setMovementsLoading(true);

    fetchAuditorMovements({
      page: movementPage,
      pageSize: 10,
      action: actionFilter,
      q: movementSearch,
    })
      .then((res) => {
        if (!cancelled) {
          setMovements(res.results);
          setMovementsPagination(res.pagination);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load transfer activity.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMovementsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canView, movementPage, actionFilter, movementSearch]);

  const filteredPallets = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.active_pallets;
    return data.active_pallets.filter(
      (p) =>
        p.pallet_number.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.item_name.toLowerCase().includes(q) ||
        (p.location_code || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  if (!canView) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">Access Restricted</h1>
        <p className="text-sm text-slate-600">
          The Auditor Dashboard is available to Auditor and Admin roles only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Auditor Dashboard</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Live capacity metrics, 7-day occupancy history, and pallet audit inspection
          </p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer self-start sm:self-auto"
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

      {loading || !data ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          Loading auditor metrics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Occupied Slots
              </p>
              <p className="text-2xl font-bold text-rose-700 mt-1" data-testid="dash-occupied">
                {data.summary.occupied_count}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Free Capacity
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1" data-testid="dash-free">
                {data.summary.free_count}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Utilization
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data.summary.utilization_pct}%
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Total Storage Cells
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data.summary.total_storage}
              </p>
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                7-Day Occupancy &amp; Free Capacity
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Daily counts out of 24 storage locations (excluding transfer point A1).
                Days 1–6 reflect reproducible historical end-of-day snapshots; today
                updates dynamically with live stock operations.
              </p>
            </div>

            <div className="h-72 w-full" data-testid="occupancy-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.history_7d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 24]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="occupied_count"
                    name="Occupied"
                    stackId="capacity"
                    fill="#e11d48"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="free_count"
                    name="Free"
                    stackId="capacity"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">
                  Active Stored Pallets ({filteredPallets.length})
                </h2>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter pallet, item, cell..."
                    className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-2 pr-3">Cell</th>
                      <th className="py-2 pr-3">Pallet #</th>
                      <th className="py-2 pr-3">Item</th>
                      <th className="py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPallets.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
                          No stored pallets match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPallets.map((pallet) => (
                        <tr key={pallet.id}>
                          <td className="py-2.5 pr-3 font-bold text-slate-900">
                            {pallet.location_code}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-xs text-slate-800">
                            {pallet.pallet_number}
                          </td>
                          <td className="py-2.5 pr-3 text-slate-700">{pallet.item_name}</td>
                          <td className="py-2.5 text-right font-semibold">{pallet.quantity}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-slate-900">
                    Recent Transfer Activity ({movementsPagination.total_count})
                  </h2>
                  <span className="text-xs text-slate-500" data-testid="movements-page-info">
                    Page {movementsPagination.page} of {movementsPagination.total_pages}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    aria-label="Filter transfer action"
                    value={actionFilter}
                    onChange={(e) => {
                      setActionFilter(e.target.value as 'ALL' | 'LOAD' | 'UNLOAD');
                      setMovementPage(1);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="ALL">All actions</option>
                    <option value="LOAD">LOAD only</option>
                    <option value="UNLOAD">UNLOAD only</option>
                  </select>

                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      aria-label="Search transfer activity"
                      value={movementSearch}
                      onChange={(e) => {
                        setMovementSearch(e.target.value);
                        setMovementPage(1);
                      }}
                      placeholder="Filter pallet, cell, operator..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-2 pr-3">Action</th>
                      <th className="py-2 pr-3">Pallet #</th>
                      <th className="py-2 pr-3">Cell</th>
                      <th className="py-2 pr-3">By</th>
                      <th className="py-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movementsLoading ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Loading transfer activity...
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No transfer activity matches your filters.
                        </td>
                      </tr>
                    ) : (
                      movements.map((mov) => (
                        <tr key={mov.id} data-testid={`movement-row-${mov.id}`}>
                          <td className="py-2.5 pr-3">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                mov.action === 'LOAD'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-rose-100 text-rose-900'
                              }`}
                            >
                              {mov.action}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-xs">{mov.pallet_number}</td>
                          <td className="py-2.5 pr-3 font-semibold">{mov.location_code}</td>
                          <td className="py-2.5 pr-3 text-slate-600">
                            {mov.performed_by_username || '—'}
                          </td>
                          <td className="py-2.5 text-right text-xs text-slate-500 whitespace-nowrap">
                            {new Date(mov.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  {movementsPagination.total_count === 0
                    ? '0 records'
                    : `Showing ${(movementsPagination.page - 1) * movementsPagination.page_size + 1}–${Math.min(
                        movementsPagination.page * movementsPagination.page_size,
                        movementsPagination.total_count
                      )} of ${movementsPagination.total_count}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                    disabled={!movementsPagination.has_previous || movementsLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementPage((p) => p + 1)}
                    disabled={!movementsPagination.has_next || movementsLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
