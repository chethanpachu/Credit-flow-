import React, { useState, useRef, useEffect } from 'react';
import { Area, Bill } from '../types';
import { getTodayDateStr } from '../data/initialData';
import { PlusCircle, AlertOctagon, CheckCircle2, RotateCcw, AlertTriangle, MapPin, Lock, ArrowRight, CornerDownLeft } from 'lucide-react';

interface AddBillsTabProps {
  areas: Area[];
  bills: Bill[];
  onAddBill: (bill: Omit<Bill, 'billId' | 'balance' | 'status'>) => void;
  sessionBills: Bill[];
  salesmanName?: string;
  allowedAreaIds?: string[];
  initialAreaId?: string;
}

export const AddBillsTab: React.FC<AddBillsTabProps> = ({
  areas,
  bills,
  onAddBill,
  sessionBills,
  salesmanName,
  allowedAreaIds,
  initialAreaId,
}) => {
  // Filter areas if restricted to logged-in salesman
  const availableAreas = allowedAreaIds
    ? areas.filter(a => allowedAreaIds.includes(a.areaId))
    : areas;

  const [areaId, setAreaId] = useState(() => {
    if (initialAreaId && availableAreas.some(a => a.areaId === initialAreaId)) {
      return initialAreaId;
    }
    return availableAreas.length > 0 ? availableAreas[0].areaId : '';
  });

  const [billNumber, setBillNumber] = useState('');
  const [shopName, setShopName] = useState('');
  const [amount, setAmount] = useState('');
  const [dateIssued, setDateIssued] = useState(getTodayDateStr());

  // Update area if initialAreaId changes externally
  useEffect(() => {
    if (initialAreaId && availableAreas.some(a => a.areaId === initialAreaId)) {
      setAreaId(initialAreaId);
    }
  }, [initialAreaId]);

  // Update default area if availableAreas changes
  useEffect(() => {
    if (availableAreas.length > 0 && !availableAreas.some(a => a.areaId === areaId)) {
      setAreaId(availableAreas[0].areaId);
    }
  }, [allowedAreaIds, availableAreas]);

  // Error modals & banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [doubleBillingModal, setDoubleBillingModal] = useState<{
    shop: string;
    pendingBill: Bill;
  } | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const areaSelectRef = useRef<HTMLSelectElement>(null);
  const billNumberInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    billNumberInputRef.current?.focus();
  }, []);

  const currentAreaObj = areas.find(a => a.areaId === areaId);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedNum = billNumber.trim();
    const trimmedShop = shopName.trim();
    const parsedAmount = parseFloat(amount);

    setErrorBanner(null);

    // 1. Check Area (comes first)
    if (!areaId) {
      setErrorBanner('Please select an Area first.');
      areaSelectRef.current?.focus();
      return;
    }

    if (!trimmedNum) {
      setErrorBanner('Bill / Invoice Number is required.');
      billNumberInputRef.current?.focus();
      return;
    }
    if (!/^\d+$/.test(trimmedNum)) {
      setErrorBanner('Invoice Number must contain only numbers (no text or letters allowed).');
      billNumberInputRef.current?.focus();
      return;
    }
    if (!trimmedShop) {
      setErrorBanner('Shop Name is required.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorBanner('Please enter a valid positive Bill Amount.');
      return;
    }

    // 1. Block duplicate Bill Numbers
    const duplicate = bills.find(
      b => b.billNumber.trim().toLowerCase() === trimmedNum.toLowerCase()
    );
    if (duplicate) {
      setErrorBanner(
        `DUPLICATE BILL NUMBER BLOCKED: Bill "${trimmedNum}" already exists (Shop: ${duplicate.shopName}, Amount: ₹${duplicate.amount.toLocaleString()}). Each bill number must be unique.`
      );
      billNumberInputRef.current?.focus();
      return;
    }

    // 2. Block Double Billing rule:
    // "A customer with an unpaid old bill cannot receive a new bill until the old one is cleared (no double billing)."
    const unpaidBill = bills.find(
      b =>
        b.shopName.trim().toLowerCase() === trimmedShop.toLowerCase() &&
        (b.status === 'pending' || b.balance > 0)
    );

    if (unpaidBill) {
      setDoubleBillingModal({
        shop: trimmedShop,
        pendingBill: unpaidBill,
      });
      return;
    }

    // Passed all validations -> save bill!
    onAddBill({
      billNumber: trimmedNum,
      shopName: trimmedShop,
      areaId,
      amount: parsedAmount,
      dateIssued: dateIssued || getTodayDateStr(),
    });

    setSuccessBanner(
      `✔ Saved Bill #${trimmedNum} for "${trimmedShop}" (₹${parsedAmount.toLocaleString()}). Retained Area "${currentAreaObj?.areaName || areaId}" for next entry!`
    );
    setTimeout(() => setSuccessBanner(null), 4000);

    // Fast-entry reset: Clear bill details BUT RETAIN THE EXACT SAME SELECTED AREA!
    // "next tab adds a new entry under the same selected area"
    setBillNumber('');
    setShopName('');
    setAmount('');
    setDateIssued(getTodayDateStr());
    billNumberInputRef.current?.focus();
  };

  const handleClear = () => {
    setBillNumber('');
    setShopName('');
    setAmount('');
    setDateIssued(getTodayDateStr());
    setErrorBanner(null);
    billNumberInputRef.current?.focus();
  };

  const totalSessionAmount = sessionBills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      {/* Fast Entry Form Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-purple-700" />
              New Bill Entry — Admin Controlled (Area Hierarchy First)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select territory area as parent route, then add bills sequentially. Area is retained for rapid consecutive invoicing. Salesmen cannot add bills.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded font-bold">
              Admin Exclusive Bill Creation
            </span>
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium">
              Credit Integrity: No Double Billing
            </span>
          </div>
        </div>

        {/* Banners */}
        {errorBanner && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorBanner}</div>
          </div>
        )}

        {successBanner && (
          <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successBanner}
          </div>
        )}

        {/* Input Grid: AREA SELECTION COMES FIRST AS REQUESTED */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Area Retention Banner */}
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-blue-900 font-semibold">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>
                Active Area for Consecutive Entries: <strong className="text-blue-950 font-bold underline">{currentAreaObj ? `${currentAreaObj.areaName} (${areaId})` : areaId}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-blue-700">
              <span className="bg-blue-100/80 px-2 py-0.5 rounded font-mono font-medium">
                Auto-retained after saving
              </span>
              <span className="text-slate-400">•</span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <Lock className="w-3 h-3 text-slate-500" /> Entries are non-editable
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* 1. AREA SELECTION COMES FIRST */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                1. Select Area First *
              </label>
              <select
                ref={areaSelectRef}
                value={areaId}
                onChange={e => setAreaId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded border-2 border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-blue-50/50 text-slate-900"
              >
                {availableAreas.length === 0 ? (
                  <option value="">No areas assigned to you</option>
                ) : (
                  availableAreas.map(a => (
                    <option key={a.areaId} value={a.areaId}>
                      {a.areaId} - {a.areaName}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Bill Number (Strictly Numbers Only) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Invoice Number (Numbers only) *
              </label>
              <input
                ref={billNumberInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 4088"
                value={billNumber}
                onChange={e => setBillNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 3. Shop Name */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. Shop Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Mahalakshmi Provision Stores"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 4. Bill Amount */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                4. Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="₹ 0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className="w-full px-3 py-2 text-xs font-bold rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">5. Date Issued:</label>
              <input
                type="date"
                value={dateIssued}
                onChange={e => setDateIssued(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Form
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm flex items-center gap-1.5"
                title="Saves this bill and immediately queues the next entry under the same selected area"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                Save &amp; Add Next in {currentAreaObj ? currentAreaObj.areaId : 'Same Area'} [Enter]
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Running List of Bills Added This Session */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Running List of Bills Added This Session ({sessionBills.length})</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" /> Non-Editable Entries
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Instant feed of newly entered bills. Once saved, entries cannot be altered to maintain strict audit records.
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
            Session Total: <span className="text-blue-700 font-bold">₹{totalSessionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {sessionBills.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No bills entered yet in this session. Fill the form above and press Enter to save.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Bill Number</th>
                  <th className="px-4 py-2.5">Shop Name</th>
                  <th className="px-4 py-2.5">Area</th>
                  <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                  <th className="px-4 py-2.5 text-right">Balance (₹)</th>
                  <th className="px-4 py-2.5 text-center">Date Issued</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-center">Audit Lock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionBills.map(b => {
                  const areaObj = areas.find(a => a.areaId === b.areaId);
                  return (
                    <tr key={b.billId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                        {b.billNumber}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {b.shopName}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {areaObj ? `${areaObj.areaName} (${b.areaId})` : b.areaId}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                        ₹{b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-amber-700">
                        ₹{b.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-500 font-mono">
                        {b.dateIssued}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-[10px] text-slate-400 font-mono inline-flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Double Billing Blocked Modal */}
      {doubleBillingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full border border-red-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-red-600 p-4 text-white flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-100" />
              <div>
                <h3 className="font-bold text-base">Double Billing Blocked!</h3>
                <p className="text-xs text-red-100">Customer has unpaid previous bill</p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p className="leading-relaxed">
                As per distributorship credit policy, <strong>no new bill can be issued</strong> until the customer's pending bill is completely cleared.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Shop Name:</span>
                  <span className="font-bold text-slate-900">{doubleBillingModal.shop}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unpaid Bill #:</span>
                  <span className="font-mono font-bold text-red-700">{doubleBillingModal.pendingBill.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding Balance:</span>
                  <span className="font-bold text-red-700 text-sm">
                    ₹{doubleBillingModal.pendingBill.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date Issued:</span>
                  <span className="text-slate-700">{doubleBillingModal.pendingBill.dateIssued}</span>
                </div>
              </div>

              <p className="text-slate-500 italic">
                Action needed: Salesman must first collect the outstanding ₹{doubleBillingModal.pendingBill.balance.toLocaleString()} in the Evening Collection tab.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDoubleBillingModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs"
              >
                Understood, Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
