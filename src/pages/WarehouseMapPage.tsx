import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Package,
  PackageMinus,
  PackagePlus,
  RefreshCw,
} from 'lucide-react';
import { fetchWarehouseMap, unloadPallet } from '../api/client';
import { LoadPalletModal } from '../components/LoadPalletModal';
import { useAuth } from '../context/AuthContext';
import type { StorageLocation, WarehouseSummary } from '../types';

const COLUMNS = ['A', 'B', 'C', 'D', 'E'];
const ROWS = [1, 2, 3, 4, 5];

export function WarehouseMapPage() {
  const { user } = useAuth();
  const canOperateStock = user?.role === 'TECHNICIAN' || user?.role === 'ADMIN';

  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [summary, setSummary] = useState<WarehouseSummary>({
    total_storage: 24,
    occupied_count: 0,
    free_count: 24,
  });
  const [selectedCode, setSelectedCode] = useState<string>('A1');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unloading, setUnloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [loadModalDest, setLoadModalDest] = useState<string | undefined>(undefined);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  const loadMap = useCallback(async (isInitial = false) => {
    if (!isInitial) setRefreshing(true);
    try {
      const data = await fetchWarehouseMap();
      setLocations(data.locations);
      setSummary(data.summary);
      setLastSyncedAt(new Date(data.server_time).toLocaleTimeString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouse map.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMap(true);
    const intervalId = window.setInterval(() => {
      loadMap(false);
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [loadMap]);

  const locationMap = useMemo(() => {
    const map = new Map<string, StorageLocation>();
    for (const loc of locations) {
      map.set(loc.code, loc);
    }
    return map;
  }, [locations]);

  const freeStorageLocations = useMemo(
    () => locations.filter((loc) => !loc.is_transfer_point && !loc.is_occupied),
    [locations]
  );

  const selectedLocation = locationMap.get(selectedCode) || null;

  const openLoadModal = (destCode?: string) => {
    setLoadModalDest(destCode);
    setLoadModalOpen(true);
  };

  const handleUnload = async (locationCode: string) => {
    setError(null);
    setBanner(null);
    setUnloading(true);
    try {
      const res = await unloadPallet(locationCode);
      setBanner(res.detail);
      await loadMap(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unload pallet.');
    } finally {
      setUnloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Floor Map</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            5×5 Grid (A1 Transfer Point + 24 Storage Slots) · Auto-syncs every 3 seconds
            {lastSyncedAt ? ` · Last sync ${lastSyncedAt}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadMap(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {canOperateStock && (
            <button
              type="button"
              onClick={() => openLoadModal()}
              disabled={freeStorageLocations.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              Load Pallet
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards & Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Free Storage
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1" data-testid="summary-free">
              {summary.free_count} / {summary.total_storage}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            FREE
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Occupied Storage
            </p>
            <p className="text-2xl font-bold text-rose-700 mt-1" data-testid="summary-occupied">
              {summary.occupied_count} / {summary.total_storage}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300">
            <Package className="w-3.5 h-3.5" />
            OCCUPIED
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Transfer Point
            </p>
            <p className="text-base font-semibold text-slate-900 mt-1">
              A1 (Entry / Exit)
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            TRANSFER
          </span>
        </div>
      </div>

      {banner && (
        <div
          role="status"
          className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900 flex items-center justify-between"
        >
          <span>{banner}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs font-semibold underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-900"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 5x5 Warehouse Grid */}
        <section
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-sm"
          aria-label="5 by 5 warehouse grid"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Floor Layout (A–E × 1–5)</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-amber-900 font-medium">
                <span className="w-3 h-3 rounded bg-amber-200 border border-amber-500 inline-block" />
                A1 Transfer
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-900 font-medium">
                <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-600 inline-block" />
                Free
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-900 font-medium">
                <span className="w-3 h-3 rounded bg-rose-200 border border-rose-600 inline-block" />
                Occupied
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Loading warehouse grid...
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="grid grid-cols-[24px_repeat(5,minmax(0,1fr))] gap-1.5 sm:gap-2 text-center text-xs font-bold text-slate-500">
                <div />
                {COLUMNS.map((col) => (
                  <div key={col}>{col}</div>
                ))}
              </div>

              {ROWS.map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-[24px_repeat(5,minmax(0,1fr))] gap-1.5 sm:gap-2 items-stretch"
                >
                  <div className="flex items-center justify-center text-xs font-bold text-slate-500">
                    {row}
                  </div>
                  {COLUMNS.map((col) => {
                    const code = `${col}${row}`;
                    const cell = locationMap.get(code);
                    const isSelected = selectedCode === code;

                    if (!cell) {
                      return (
                        <div
                          key={code}
                          className="min-h-[68px] sm:min-h-[84px] rounded-xl border border-slate-200 bg-slate-100"
                        />
                      );
                    }

                    if (cell.is_transfer_point) {
                      return (
                        <button
                          key={code}
                          type="button"
                          data-testid={`cell-${code}`}
                          onClick={() => setSelectedCode(code)}
                          aria-label={`${code} transfer point`}
                          className={`min-h-[68px] sm:min-h-[84px] rounded-xl border-2 border-dashed p-1.5 sm:p-2.5 flex flex-col justify-between text-left transition-all cursor-pointer bg-amber-50 border-amber-500 text-amber-950 ${
                            isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-xs sm:text-sm">{code}</span>
                            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          </div>
                          <div>
                            <span className="inline-block text-[10px] sm:text-xs font-bold uppercase tracking-wide bg-amber-200/80 text-amber-950 px-1.5 py-0.5 rounded">
                              TRANSFER
                            </span>
                          </div>
                        </button>
                      );
                    }

                    const occupied = cell.is_occupied && cell.pallet;
                    return (
                      <button
                        key={code}
                        type="button"
                        data-testid={`cell-${code}`}
                        data-status={occupied ? 'occupied' : 'free'}
                        onClick={() => setSelectedCode(code)}
                        aria-label={`${code} ${occupied ? `occupied by ${cell.pallet?.pallet_number}` : 'free'}`}
                        className={`min-h-[68px] sm:min-h-[84px] rounded-xl border-2 p-1.5 sm:p-2.5 flex flex-col justify-between text-left transition-all cursor-pointer ${
                          occupied
                            ? 'bg-rose-50 border-rose-500 text-rose-950 hover:bg-rose-100/70'
                            : 'bg-emerald-50 border-emerald-500 text-emerald-950 hover:bg-emerald-100/70'
                        } ${isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs sm:text-sm">{code}</span>
                          {occupied ? (
                            <Package className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          )}
                        </div>
                        <div className="w-full overflow-hidden">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              occupied
                                ? 'bg-rose-200 text-rose-950'
                                : 'bg-emerald-200 text-emerald-950'
                            }`}
                          >
                            {occupied ? 'OCCUPIED' : 'FREE'}
                          </span>
                          {occupied && cell.pallet && (
                            <p className="text-[10px] sm:text-xs font-medium truncate mt-0.5 text-rose-900">
                              {cell.pallet.pallet_number}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Location / Pallet Inspector */}
        <aside
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
          data-testid="location-inspector"
        >
          <h2 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Location Details
          </h2>

          {!selectedLocation ? (
            <p className="text-sm text-slate-500 py-6">
              Select a cell on the warehouse map to inspect its status.
            </p>
          ) : selectedLocation.is_transfer_point ? (
            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-slate-900">A1</span>
                <span className="text-xs font-bold uppercase px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  Transfer Point
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong>A1</strong> is the transient pallet entry and exit point.
                Incoming pallets are palletized here before shuttle transfer to a
                storage location, and unloaded pallets return here to leave stock.
              </p>
            </div>
          ) : selectedLocation.is_occupied && selectedLocation.pallet ? (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-slate-900">
                  {selectedLocation.code}
                </span>
                <span className="text-xs font-bold uppercase px-2.5 py-1 rounded bg-rose-100 text-rose-900 border border-rose-300">
                  Occupied
                </span>
              </div>

              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-3 py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Pallet Number</dt>
                  <dd className="font-semibold text-slate-900" data-testid="inspector-pallet-number">
                    {selectedLocation.pallet.pallet_number}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Barcode</dt>
                  <dd className="font-mono text-slate-900">
                    {selectedLocation.pallet.barcode}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Item / Product</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {selectedLocation.pallet.item_name}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Quantity</dt>
                  <dd className="font-semibold text-slate-900">
                    {selectedLocation.pallet.quantity}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Loaded By</dt>
                  <dd className="text-slate-700">
                    {selectedLocation.pallet.loaded_by_username || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-1.5">
                  <dt className="text-slate-500">Loaded At</dt>
                  <dd className="text-slate-700 text-right">
                    {new Date(selectedLocation.pallet.loaded_at).toLocaleString()}
                  </dd>
                </div>
              </dl>

              {canOperateStock ? (
                <button
                  type="button"
                  onClick={() => handleUnload(selectedLocation.code)}
                  disabled={unloading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-medium text-sm py-2.5 px-4 disabled:opacity-50 cursor-pointer"
                >
                  <PackageMinus className="w-4 h-4" />
                  {unloading
                    ? 'Unloading...'
                    : `Unload Pallet from ${selectedLocation.code}`}
                </button>
              ) : (
                <p className="text-xs text-slate-500 bg-slate-100 rounded-lg p-2.5">
                  Read-only access: Auditors can inspect pallet details but cannot
                  load or unload stock.
                </p>
              )}
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-slate-900">
                  {selectedLocation.code}
                </span>
                <span className="text-xs font-bold uppercase px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Free
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Storage location <strong>{selectedLocation.code}</strong> is currently
                empty and available to store one pallet.
              </p>
              {canOperateStock && (
                <button
                  type="button"
                  onClick={() => openLoadModal(selectedLocation.code)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm py-2.5 px-4 cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4" />
                  Load Pallet into {selectedLocation.code}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>

      <LoadPalletModal
        isOpen={loadModalOpen}
        freeLocations={freeStorageLocations}
        initialDestination={loadModalDest}
        onClose={() => setLoadModalOpen(false)}
        onLoaded={async (msg) => {
          setBanner(msg);
          await loadMap(false);
        }}
      />
    </div>
  );
}
