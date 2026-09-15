import React, { useState } from 'react';
import { Bill, CollectionHistoryEntry, Area, Salesman } from '../types';
import { Search, AlertOctagon, History, Calendar, Database, Table, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { DeepInformationTable } from './DeepInformationTable';

interface HistoryTabProps {
  bills: Bill[];
  collectionHistory: CollectionHistoryEntry[];
  areas: Area[];
  salesmen?: Salesman[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  bills,
  collectionHistory,
  areas,
  salesmen = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'breaches' | 'pending' | 'paid'>('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(bills.length > 0 ? bills[0] : null);
  const [viewMode, setViewMode] = useState<'standard' | 'deep'>('standard');

  // Compute age in days and check credit breach (> 30 days and still pending or balance > 0)
  const today = new Date();
  const billsWithMeta = bills.map(b => {
    let daysOld = 0;
    try {
      const issued = new Date(b.dateIssued);
      const diffTime = today.getTime() - issued.getTime();
      daysOld = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      daysOld = 0;
    }
    const isPending = b.status === 'pending' || b.balance > 0;
    const isCreditBreach = isPending && daysOld > 30;

    return {
      ...b,
      daysOld,
      isCreditBreach,
    };
  });

  const breachCount = billsWithMeta.filter(b => b.isCreditBreach).length;

  // Filter bills by search query & status filter
  const filteredBills = billsWithMeta.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || b.billNumber.toLowerCase().includes(q) || b.shopName.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (statusFilter === 'breaches') return b.isCreditBreach;
    if (statusFilter === 'pending') return b.status === 'pending' || b.balance > 0;
    if (statusFilter === 'paid') return b.status === 'paid' && b.balance <= 0;
    return true;
  });

  // Selected bill deduction history
  const selectedHistory = selectedBill
    ? collectionHistory.filter(c => c.billNumber === selectedBill.billNumber)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner & View Mode Toggle */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Master Bills &amp; Credit Term Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Standard view shows the 4 essential fields: <strong>Invoice Num</strong>, <strong>Outlet Name</strong>, <strong>Amount Value</strong>, and <strong>Balance Amount</strong>. Detailed backend data is accessible under Deep Information.
            </p>
          </div>

          {/* Switcher: Standard 4-Column vs Deep Information Table */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'standard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              4-Column View
            </button>
            <button
              onClick={() => setViewMode('deep')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'deep'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              Deep Information Table
            </button>
          </div>
        </div>

        {/* Filters shown in Standard Mode */}
        {viewMode === 'standard' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* Quick Status Buttons */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All ({bills.length})
              </button>
              <button
                onClick={() => setStatusFilter('breaches')}
                className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                  statusFilter === 'breaches'
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-red-700 hover:bg-red-50'
                }`}
              >
                <AlertOctagon className="w-3 h-3" />
                Breaches &gt;30d ({breachCount})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'pending' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'paid' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Paid
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search Invoice # or Outlet Name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* RENDER VIEW MODE: DEEP INFORMATION TABLE */}
      {viewMode === 'deep' ? (
        <DeepInformationTable
          bills={bills}
          collectionHistory={collectionHistory}
          areas={areas}
          salesmen={salesmen}
          currentRole="admin"
        />
      ) : (
        /* RENDER VIEW MODE: STRICT 4-COLUMN STANDARD VIEW */
        <div className="space-y-4">
          {/* Credit Breach Warning Banner if any */}
          {breachCount > 0 && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-900">
              <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-red-900 text-sm">
                  🚨 {breachCount} Customer Bill(s) Exceeded 30-Day Credit Term Limit!
                </h4>
                <p className="text-red-700 mt-0.5">
                  These customers have unpaid balances older than 1 month. Salesmen must collect these dues immediately.
                </p>
              </div>
            </div>
          )}

          {/* Master Detail Grid: 4-Column Bills Table on Left, Chronological Ledger on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Exactly 4 Columns Requested */}
            <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Bills Register ({filteredBills.length})
                </h3>
                <span className="text-[11px] text-slate-400">Click row to view deduction audit</span>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 w-32">Invoice Num</th>
                      <th className="px-3 py-2.5">Outlet Name</th>
                      <th className="px-3 py-2.5 text-right w-32">Amount Value (₹)</th>
                      <th className="px-3 py-2.5 text-right w-32">Balance Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          No matching bills found.
                        </td>
                      </tr>
                    ) : (
                      filteredBills.map(b => {
                        const isSelected = selectedBill?.billId === b.billId;

                        return (
                          <tr
                            key={b.billId}
                            onClick={() => setSelectedBill(b)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50/80 border-l-4 border-blue-600 font-medium'
                                : b.isCreditBreach
                                ? 'bg-red-50/60 hover:bg-red-100/50'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Column 1: Invoice Num */}
                            <td className="px-3 py-2.5 font-mono font-black text-blue-900 text-xs">
                              {b.billNumber}
                              {b.isOldBill && (
                                <span className="ml-1 text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded">
                                  OLD
                                </span>
                              )}
                            </td>

                            {/* Column 2: Outlet Name */}
                            <td className="px-3 py-2.5">
                              <div className="font-bold text-slate-900">{b.shopName}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>Area: {b.areaId}</span>
                                {b.isCreditBreach && (
                                  <span className="text-red-700 font-bold bg-red-100 px-1 rounded">
                                    &gt;30d Breach ({b.daysOld}d)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Column 3: Amount Value */}
                            <td className="px-3 py-2.5 text-right font-black font-mono text-slate-900">
                              ₹{b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Column 4: Balance Amount */}
                            <td className="px-3 py-2.5 text-right font-black font-mono">
                              {b.balance <= 0 ? (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  CLEARED
                                </span>
                              ) : (
                                <span className={b.isCreditBreach ? 'text-red-700' : 'text-amber-800'}>
                                  ₹{b.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Collection Deduction Ledger for Selected Bill */}
            <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
              <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Deduction History (Append-Only Log)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Sheet: CollectionHistory</span>
                </h3>
                {selectedBill && (
                  <div className="mt-2 bg-white rounded-md p-2.5 border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Selected Invoice:</span>
                      <span className="font-bold text-slate-900 font-mono">{selectedBill.billNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Outlet Name:</span>
                      <span className="font-semibold text-slate-800">{selectedBill.shopName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Amount Value:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{selectedBill.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Balance Amount:</span>
                      <span className="font-black text-amber-800">
                        ₹{selectedBill.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                {selectedHistory.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-1">
                    <Calendar className="w-8 h-8 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No collections recorded yet</p>
                    <p className="text-[11px] text-slate-400">
                      When a salesman logs a payment, deduction entries appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-semibold text-slate-500">
                      {selectedHistory.length} chronological collection deduction{selectedHistory.length === 1 ? '' : 's'}:
                    </div>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                      {selectedHistory.map(entry => (
                        <div key={entry.collectionId} className="p-3 bg-white text-xs hover:bg-slate-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {entry.collectionId}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">{entry.collectionDate}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-slate-600">
                              Collected by: <strong className="text-slate-800">{entry.salesmanName}</strong>
                            </span>
                            <span className="font-bold text-emerald-700 text-sm">
                              +₹{entry.amountCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-right text-[11px] text-slate-500 mt-1 font-mono">
                            Balance after deduction: ₹{entry.runningBalanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
