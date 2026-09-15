import React, { useState, useEffect } from 'react';
import { DenominationBreakdown, ChequeEntry, OnlinePaymentEntry } from '../types';
import { Banknote, Calculator, Plus, Trash2, CheckCircle2, AlertCircle, FileText, Smartphone, CreditCard } from 'lucide-react';

interface DenominationCounterProps {
  value?: DenominationBreakdown;
  cheques?: ChequeEntry[];
  onlinePayments?: OnlinePaymentEntry[];
  onChange?: (
    denominations: DenominationBreakdown,
    totalCash: number,
    cheques: ChequeEntry[],
    onlinePayments: OnlinePaymentEntry[],
    grandTotal: number
  ) => void;
  expectedAmount?: number;
  readOnly?: boolean;
}

export const DENOM_VALUES = [
  { key: 'd500' as const, label: '₹500', value: 500, color: 'bg-stone-50 border-stone-300 text-stone-900' },
  { key: 'd200' as const, label: '₹200', value: 200, color: 'bg-amber-50 border-amber-300 text-amber-900' },
  { key: 'd100' as const, label: '₹100', value: 100, color: 'bg-purple-50 border-purple-300 text-purple-900' },
  { key: 'd50' as const, label: '₹50', value: 50, color: 'bg-cyan-50 border-cyan-300 text-cyan-900' },
  { key: 'd20' as const, label: '₹20', value: 20, color: 'bg-orange-50 border-orange-300 text-orange-900' },
  { key: 'd10' as const, label: '₹10', value: 10, color: 'bg-amber-50 border-amber-300 text-amber-900' },
];

export function calculateCashTotal(denoms: DenominationBreakdown): number {
  const sum500 = (denoms.d500 || 0) * 500;
  const sum200 = (denoms.d200 || 0) * 200;
  const sum100 = (denoms.d100 || 0) * 100;
  const sum50 = (denoms.d50 || 0) * 50;
  const sum20 = (denoms.d20 || 0) * 20;
  const sum10 = (denoms.d10 || 0) * 10;
  const coins = denoms.coins || 0;
  return sum500 + sum200 + sum100 + sum50 + sum20 + sum10 + coins;
}

export function autoCalculateDenominations(amount: number): DenominationBreakdown {
  let remaining = Math.max(0, Math.floor(amount));
  const d500 = Math.floor(remaining / 500);
  remaining %= 500;
  const d200 = Math.floor(remaining / 200);
  remaining %= 200;
  const d100 = Math.floor(remaining / 100);
  remaining %= 100;
  const d50 = Math.floor(remaining / 50);
  remaining %= 50;
  const d20 = Math.floor(remaining / 20);
  remaining %= 20;
  const d10 = Math.floor(remaining / 10);
  remaining %= 10;
  const coins = remaining;
  return { d500, d200, d100, d50, d20, d10, coins };
}

export const DenominationCounter: React.FC<DenominationCounterProps> = ({
  value = {},
  cheques: initialCheques = [],
  onlinePayments: initialOnline = [],
  onChange,
  expectedAmount,
  readOnly = false,
}) => {
  const [denoms, setDenoms] = useState<DenominationBreakdown>(value);
  const [chequeList, setChequeList] = useState<ChequeEntry[]>(initialCheques);
  const [onlineList, setOnlineList] = useState<OnlinePaymentEntry[]>(initialOnline);

  // New Cheque inputs
  const [newShopName, setNewShopName] = useState('');
  const [newChequeNumber, setNewChequeNumber] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newChequeAmount, setNewChequeAmount] = useState('');

  // New Online Payment inputs
  const [newOnlineShop, setNewOnlineShop] = useState('');
  const [newOnlineApp, setNewOnlineApp] = useState('UPI / GPay');
  const [newOnlineUtr, setNewOnlineUtr] = useState('');
  const [newOnlineAmount, setNewOnlineAmount] = useState('');

  useEffect(() => {
    setDenoms(value);
  }, [JSON.stringify(value)]);

  useEffect(() => {
    setChequeList(initialCheques);
  }, [JSON.stringify(initialCheques)]);

  useEffect(() => {
    setOnlineList(initialOnline);
  }, [JSON.stringify(initialOnline)]);

  const totalCash = calculateCashTotal(denoms);
  const totalCheques = chequeList.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalOnline = onlineList.reduce((sum, o) => sum + (o.amount || 0), 0);
  const grandTotal = totalCash + totalCheques + totalOnline;
  const diff = expectedAmount !== undefined ? grandTotal - expectedAmount : 0;
  const isExactMatch = expectedAmount !== undefined && Math.abs(diff) < 0.01;

  const triggerChange = (
    newDenoms: DenominationBreakdown,
    newCheques: ChequeEntry[],
    newOnline: OnlinePaymentEntry[]
  ) => {
    const cash = calculateCashTotal(newDenoms);
    const chq = newCheques.reduce((sum, c) => sum + (c.amount || 0), 0);
    const onl = newOnline.reduce((sum, o) => sum + (o.amount || 0), 0);
    onChange?.(newDenoms, cash, newCheques, newOnline, cash + chq + onl);
  };

  const updateCount = (key: keyof DenominationBreakdown, count: number) => {
    if (readOnly) return;
    const safeCount = isNaN(count) || count < 0 ? 0 : Math.floor(count);
    const updated = { ...denoms, [key]: safeCount };
    setDenoms(updated);
    triggerChange(updated, chequeList, onlineList);
  };

  const updateCoins = (coinsVal: number) => {
    if (readOnly) return;
    const safeCoins = isNaN(coinsVal) || coinsVal < 0 ? 0 : coinsVal;
    const updated = { ...denoms, coins: safeCoins };
    setDenoms(updated);
    triggerChange(updated, chequeList, onlineList);
  };

  const handleAddCheque = () => {
    const amt = parseFloat(newChequeAmount);
    if (!newShopName.trim() || isNaN(amt) || amt <= 0) return;

    const newEntry: ChequeEntry = {
      id: 'CHQ-' + Date.now(),
      shopName: newShopName.trim(),
      chequeNumber: newChequeNumber.trim() || 'Cheque',
      bankName: newBankName.trim() || undefined,
      amount: amt,
    };

    const updated = [...chequeList, newEntry];
    setChequeList(updated);
    setNewShopName('');
    setNewChequeNumber('');
    setNewBankName('');
    setNewChequeAmount('');
    triggerChange(denoms, updated, onlineList);
  };

  const handleRemoveCheque = (id: string) => {
    if (readOnly) return;
    const updated = chequeList.filter(c => c.id !== id);
    setChequeList(updated);
    triggerChange(denoms, updated, onlineList);
  };

  const handleAddOnline = () => {
    const amt = parseFloat(newOnlineAmount);
    if (!newOnlineShop.trim() || isNaN(amt) || amt <= 0) return;

    const newEntry: OnlinePaymentEntry = {
      id: 'ONL-' + Date.now(),
      shopName: newOnlineShop.trim(),
      utrNumber: newOnlineUtr.trim() || 'UPI-Ref-' + Math.floor(100000 + Math.random() * 900000),
      appOrMethod: newOnlineApp,
      amount: amt,
      paymentDate: new Date().toISOString().split('T')[0],
    };

    const updated = [...onlineList, newEntry];
    setOnlineList(updated);
    setNewOnlineShop('');
    setNewOnlineUtr('');
    setNewOnlineAmount('');
    triggerChange(denoms, chequeList, updated);
  };

  const handleRemoveOnline = (id: string) => {
    if (readOnly) return;
    const updated = onlineList.filter(o => o.id !== id);
    setOnlineList(updated);
    triggerChange(denoms, chequeList, updated);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Cash Denomination &amp; Cheque Breakdown
          </span>
        </div>
        <span className="text-[11px] text-slate-300 font-mono">
          Physical Currency Count
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Currency Denominations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                <th className="py-2 px-3 text-left">Denomination Note</th>
                <th className="py-2 px-3 text-center w-24">Count (Nos.)</th>
                <th className="py-2 px-3 text-right">Subtotal Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DENOM_VALUES.map(denom => {
                const count = denoms[denom.key] || 0;
                const lineTotal = count * denom.value;
                return (
                  <tr key={denom.key} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-black border ${denom.color}`}>
                          {denom.label}
                        </span>
                        <span className="text-slate-400 text-[11px]">×</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {readOnly ? (
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {count || '0'}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={count === 0 ? '' : count}
                          onChange={e => updateCount(denom.key, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-center font-mono font-bold text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}

              {/* Coins row */}
              <tr className="hover:bg-slate-50/60">
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black border bg-slate-100 border-slate-300 text-slate-800">
                      Coins / Change
                    </span>
                  </div>
                </td>
                <td className="py-2 px-3 text-center">
                  <span className="text-slate-400 text-[11px] font-mono">lump sum</span>
                </td>
                <td className="py-2 px-3 text-right">
                  {readOnly ? (
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(denoms.coins || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0.00"
                      value={denoms.coins === 0 || !denoms.coins ? '' : denoms.coins}
                      onChange={e => updateCoins(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right font-mono font-bold text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ml-auto block"
                    />
                  )}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t border-slate-300 text-slate-900">
                <td className="py-2.5 px-3 uppercase tracking-wider text-[11px]">Total Physical Cash</td>
                <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                  {Object.entries(denoms)
                    .filter(([k]) => k !== 'coins')
                    .reduce((sum: number, [, v]) => sum + (Number(v) || 0), 0)} notes
                </td>
                <td className="py-2.5 px-3 text-right font-black text-emerald-700 font-mono text-sm">
                  ₹{totalCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Cheques Section */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Cheques Received ({chequeList.length})
            </h4>
            <span className="text-[11px] font-mono font-bold text-blue-700">
              Total Cheques: ₹{totalCheques.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {chequeList.length > 0 ? (
            <div className="space-y-1.5 mb-3">
              {chequeList.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded bg-blue-50/50 border border-blue-100 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{c.shopName}</span>
                    <span className="text-slate-500 text-[11px] ml-2 font-mono">
                      (Chq #: {c.chequeNumber}{c.bankName ? ` • ${c.bankName}` : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black font-mono text-blue-900">
                      ₹{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCheque(c.id)}
                        className="text-slate-400 hover:text-red-600 p-0.5"
                        title="Remove cheque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic py-1 mb-2">
              No cheques entered.
            </div>
          )}

          {/* Add Cheque Form */}
          {!readOnly && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs mb-3">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="Outlet / Shop Name"
                  value={newShopName}
                  onChange={e => setNewShopName(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Cheque No."
                  value={newChequeNumber}
                  onChange={e => setNewChequeNumber(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Bank Name"
                  value={newBankName}
                  onChange={e => setNewBankName(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="₹ Amount"
                  value={newChequeAmount}
                  onChange={e => setNewChequeAmount(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono font-bold"
                />
              </div>
              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddCheque}
                  disabled={!newShopName.trim() || !newChequeAmount}
                  className="w-full h-full py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded font-bold flex items-center justify-center shadow-xs"
                  title="Add Cheque"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Online Payment Entries Section (Prompt: "add a online payment entry and cheque") */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              Online Payments / UPI / Bank Transfer ({onlineList.length})
            </h4>
            <span className="text-[11px] font-mono font-bold text-purple-700">
              Total Online: ₹{totalOnline.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {onlineList.length > 0 ? (
            <div className="space-y-1.5 mb-3">
              {onlineList.map(o => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-2 rounded bg-purple-50/50 border border-purple-100 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{o.shopName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 ml-2">
                      {o.appOrMethod || 'UPI'}
                    </span>
                    <span className="text-slate-500 text-[11px] ml-2 font-mono">
                      Ref/UTR: {o.utrNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black font-mono text-purple-900">
                      ₹{o.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOnline(o.id)}
                        className="text-slate-400 hover:text-red-600 p-0.5"
                        title="Remove online payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic py-1 mb-2">
              No online/UPI transfers entered.
            </div>
          )}

          {/* Add Online Payment Form */}
          {!readOnly && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="Outlet / Shop Name"
                  value={newOnlineShop}
                  onChange={e => setNewOnlineShop(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <select
                  value={newOnlineApp}
                  onChange={e => setNewOnlineApp(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-medium text-slate-700"
                >
                  <option value="UPI / GPay">GPay (UPI)</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Paytm">Paytm</option>
                  <option value="NEFT/IMPS">Bank Transfer</option>
                  <option value="QR Code">QR Code</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="UTR / UPI Ref Number"
                  value={newOnlineUtr}
                  onChange={e => setNewOnlineUtr(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="₹ Amount"
                  value={newOnlineAmount}
                  onChange={e => setNewOnlineAmount(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono font-bold"
                />
              </div>
              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddOnline}
                  disabled={!newOnlineShop.trim() || !newOnlineAmount}
                  className="w-full h-full py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 text-white rounded font-bold flex items-center justify-center shadow-xs"
                  title="Add Online Payment"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notebook Style Handwritten Calculation Strip */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs font-mono text-amber-950">
          <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider mb-1 flex items-center justify-between">
            <span>Ledger Denomination Note:</span>
            <span>Manual Sheet Summary</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            {DENOM_VALUES.filter(d => (denoms[d.key] || 0) > 0).map(d => (
              <span key={d.key} className="bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">
                {d.value} × {denoms[d.key]} = ₹{(denoms[d.key]! * d.value).toLocaleString()}
              </span>
            ))}
            {(denoms.coins || 0) > 0 && (
              <span className="bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">
                Coins = ₹{denoms.coins?.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Grand Total & Reconciliation Status */}
        <div className="p-3 rounded-lg bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <span>Total Handover (Cash + Online + Cheques)</span>
            </div>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span className="text-xl font-black font-mono text-emerald-400">
                ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                (Cash: ₹{totalCash.toLocaleString()} | Online: ₹{totalOnline.toLocaleString()} | Chq: ₹{totalCheques.toLocaleString()})
              </span>
            </div>
          </div>

          {expectedAmount !== undefined && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400">System Collections:</div>
                <div className="text-xs font-bold font-mono text-slate-200">
                  ₹{expectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {isExactMatch ? (
                <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500 rounded text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Exact Match!
                </div>
              ) : (
                <div className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 border ${
                  diff > 0
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-red-500/20 border-red-500 text-red-300'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  {diff > 0 ? `+₹${diff.toLocaleString()} (Excess)` : `-₹${Math.abs(diff).toLocaleString()} (Short)`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
