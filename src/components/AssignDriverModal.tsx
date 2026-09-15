import React, { useState } from 'react';
import { Bill, Driver, DriverAssignment } from '../types';
import { getTomorrowDateStr, getTodayDateStr } from '../data/initialData';
import { Truck, X, Check, Calendar, AlertCircle } from 'lucide-react';

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  drivers: Driver[];
  salesmanId: string;
  salesmanName: string;
  onConfirmAssignment: (assignment: Omit<DriverAssignment, 'assignmentId' | 'status' | 'collectedAmount'>) => void;
}

export const AssignDriverModal: React.FC<AssignDriverModalProps> = ({
  isOpen,
  onClose,
  bill,
  drivers,
  salesmanId,
  salesmanName,
  onConfirmAssignment,
}) => {
  if (!isOpen || !bill) return null;

  const [driverId, setDriverId] = useState(drivers.length > 0 ? drivers[0].driverId : '');
  const [amountToCollect, setAmountToCollect] = useState(bill.balance.toString());
  const [scheduledDate, setScheduledDate] = useState(getTomorrowDateStr());
  const [notes, setNotes] = useState('Collect payment in morning during delivery route');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmt = parseFloat(amountToCollect);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }
    if (parsedAmt > bill.balance) {
      setErrorMsg(`Amount to collect cannot exceed the bill balance of ₹${bill.balance.toLocaleString()}`);
      return;
    }
    if (!driverId) {
      setErrorMsg('Please select a driver.');
      return;
    }

    const selDriver = drivers.find(d => d.driverId === driverId);

    onConfirmAssignment({
      billId: bill.billId,
      billNumber: bill.billNumber,
      shopName: bill.shopName,
      areaId: bill.areaId,
      salesmanId,
      salesmanName,
      driverId,
      driverName: selDriver ? selDriver.driverName : 'Unknown',
      amountToCollect: parsedAmt,
      assignedDate: getTodayDateStr(),
      scheduledDate,
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-lg w-full border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-orange-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-700">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Assign Collection to Delivery Driver</h3>
              <p className="text-[11px] text-orange-100">
                Driver will carry this bill on next-day run manifest
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-orange-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Summary Banner */}
        <div className="p-4 bg-orange-50/60 border-b border-orange-100 text-xs text-slate-800 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Shop Name:</span>
            <span className="font-bold text-slate-900">{bill.shopName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Bill Number:</span>
            <span className="font-mono font-bold text-blue-700">{bill.billNumber} (Area {bill.areaId})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Outstanding Balance:</span>
            <span className="font-bold text-amber-800 font-mono">
              ₹{bill.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Delivery Driver: *
            </label>
            <select
              value={driverId}
              onChange={e => setDriverId(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-orange-500 bg-white font-medium"
            >
              {drivers.map(d => (
                <option key={d.driverId} value={d.driverId}>
                  {d.driverId} - {d.driverName} ({d.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Amount to Collect (₹): *
              </label>
              <input
                type="number"
                step="0.01"
                max={bill.balance}
                value={amountToCollect}
                onChange={e => setAmountToCollect(e.target.value)}
                className="w-full px-3 py-2 font-bold font-mono rounded border border-slate-300 focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-[10px] text-slate-400">Max: ₹{bill.balance.toLocaleString()}</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Scheduled Date (Tomorrow): *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded border border-slate-300 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Instructions / Delivery Notes for Driver:
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Call owner at 10 AM, collect cash with delivery crate"
              className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" /> Assign to Driver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
