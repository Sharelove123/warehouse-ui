import React, { useEffect, useState } from 'react';
import { PackagePlus, X } from 'lucide-react';
import { loadPallet } from '../api/client';
import type { StorageLocation } from '../types';

interface LoadPalletModalProps {
  isOpen: boolean;
  freeLocations: StorageLocation[];
  initialDestination?: string;
  onClose: () => void;
  onLoaded: (message: string) => Promise<void> | void;
}

export function LoadPalletModal({
  isOpen,
  freeLocations,
  initialDestination,
  onClose,
  onLoaded,
}: LoadPalletModalProps) {
  const [palletNumber, setPalletNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPalletNumber('');
      setBarcode('');
      setItemName('');
      setQuantity('1');
      if (
        initialDestination &&
        freeLocations.some((loc) => loc.code === initialDestination)
      ) {
        setDestination(initialDestination);
      } else if (freeLocations.length > 0) {
        setDestination(freeLocations[0].code);
      } else {
        setDestination('');
      }
    }
  }, [isOpen, initialDestination, freeLocations]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qtyNum = Number(quantity);
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
      setError('Quantity must be a positive whole number.');
      return;
    }
    if (!destination) {
      setError('No free storage locations are available.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await loadPallet({
        pallet_number: palletNumber.trim(),
        barcode: barcode.trim(),
        item_name: itemName.trim(),
        quantity: qtyNum,
        destination,
      });
      await onLoaded(result.detail);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pallet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-pallet-title"
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-700" />
            <h2 id="load-pallet-title" className="font-semibold text-slate-900">
              Load Pallet via A1
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
            aria-label="Close load pallet dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 bg-slate-100 rounded-lg p-2.5">
            Submitting palletizes at transfer point <strong>A1</strong> and immediately
            transfers the pallet to the selected storage location.
          </p>

          {error && (
            <div
              role="alert"
              className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="pallet-number" className="block text-sm font-medium text-slate-700 mb-1">
              Pallet number
            </label>
            <input
              id="pallet-number"
              type="text"
              required
              value={palletNumber}
              onChange={(e) => setPalletNumber(e.target.value)}
              placeholder="e.g. PLT-2045"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="pallet-barcode" className="block text-sm font-medium text-slate-700 mb-1">
              Barcode
            </label>
            <input
              id="pallet-barcode"
              type="text"
              required
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 890100204501"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="pallet-item" className="block text-sm font-medium text-slate-700 mb-1">
              Item / product name
            </label>
            <input
              id="pallet-item"
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Stepper Motor Kit"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pallet-qty" className="block text-sm font-medium text-slate-700 mb-1">
                Quantity
              </label>
              <input
                id="pallet-qty"
                type="number"
                min={1}
                step={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="pallet-dest" className="block text-sm font-medium text-slate-700 mb-1">
                Destination
              </label>
              <select
                id="pallet-dest"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {freeLocations.length === 0 ? (
                  <option value="">No free cells</option>
                ) : (
                  freeLocations.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.code} (Free)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || freeLocations.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Loading...' : 'Confirm Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
