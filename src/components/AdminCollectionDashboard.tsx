import React, { useState, useMemo } from 'react';
import { Area, Salesman, Bill, CollectionHistoryEntry } from '../types';
import { getTodayDateStr } from '../data/initialData';
import {
  LayoutDashboard,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Plus,
  ArrowUpDown,
  Building2,
  Calendar,
  Wallet,
  TrendingUp,
  MapPin,
  ShieldAlert,
  BookOpen,
  Database,
  Table,
} from 'lucide-react';
import { DeepInformationTable } from './DeepInformationTable';

interface AdminCollectionDashboardProps {
  areas: Area[];
  salesmen: Salesman[];
  bills: Bill[];
  collectionHistory: CollectionHistoryEntry[];
  onNavigateToAddBillWithArea: (areaId: string) => void;
  onVerifyCollection?: (collectionId: string, status: 'Verified' | 'Flagged', notes: string) => void;
  onSwitchToLedger?: (areaId?: string) => void;
}

export const AdminCollectionDashboard: React.FC<AdminCollectionDashboardProps> = ({
  areas,
  salesmen,
  bills,
  collectionHistory,
  onNavigateToAddBillWithArea,
  onVerifyCollection,
  onSwitchToLedger,
}) => {
  // 1. Filter States
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [entryStatusFilter, setEntryStatusFilter] = useState<'all' | 'paid' | 'partial' | 'uncollected'>('all');
  const [viewMode, setViewMode] = useState<'standard' | 'deep'>('standard');

  // 2. Computed Area-Wise Breakdown
  const areaSummaries = useMemo(() => {
    return areas.map(area => {
      const areaBills = bills.filter(b => b.areaId === area.areaId);
      const totalInvoiced = areaBills.reduce((sum, b) => sum + b.amount, 0);
      const totalBalance = areaBills.reduce((sum, b) => sum + b.balance, 0);
      const totalCollected = totalInvoiced - totalBalance;
      const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

      // Collections made today for this area
      const todayCollections = collectionHistory.filter(c => {
        const matchesArea = c.areaId === area.areaId || areaBills.some(b => b.billId === c.billId);
        return matchesArea && c.collectionDate === selectedDate;
      });
      const todayTotal = todayCollections.reduce((sum, c) => sum + c.amountCollected, 0);

      return {
        areaId: area.areaId,
        areaName: area.areaName,
        billCount: areaBills.length,
        totalInvoiced,
        totalCollected,
        totalBalance,
        collectionRate,
        todayTotal,
        todayCount: todayCollections.length,
      };
    });
  }, [areas, bills, collectionHistory, selectedDate]);

  // 3. Filtered Overall Metrics based on selectedAreaId
  const activeBills = useMemo(() => {
    return bills.filter(b => {
      if (selectedAreaId !== 'all' && b.areaId !== selectedAreaId) return false;
      return true;
    });
  }, [bills, selectedAreaId]);

  const totalInvoiced = activeBills.reduce((sum, b) => sum + b.amount, 0);
  const totalBalanceDue = activeBills.reduce((sum, b) => sum + b.balance, 0);
  const totalCollectedAllTime = totalInvoiced - totalBalanceDue;
  const overallRate = totalInvoiced > 0 ? (totalCollectedAllTime / totalInvoiced) * 100 : 0;

  // 4. Today's Collections Under Selected Area
  // "the admin collection shoul have alll the entries made by the salesman that day under that area as todays collction"
  const todaysCollections = useMemo(() => {
    return collectionHistory.filter(c => {
      if (selectedDate && c.collectionDate !== selectedDate) return false;
      if (selectedSalesmanId !== 'all' && c.salesmanId !== selectedSalesmanId) return false;

      // Match area either directly via areaId or by looking up the bill
      const bill = bills.find(b => b.billId === c.billId || b.billNumber === c.billNumber);
      const billAreaId = c.areaId || bill?.areaId;

      if (selectedAreaId !== 'all' && billAreaId !== selectedAreaId) return false;
      return true;
    });
  }, [collectionHistory, bills, selectedDate, selectedSalesmanId, selectedAreaId]);

  const totalTodayCollected = todaysCollections.reduce((sum, c) => sum + c.amountCollected, 0);

  // 5. Easy Flow List of Entries for Admin
  // "there will be list of entries for admin make it easier flow: innovice num shop name amount"
  const filteredEntries = useMemo(() => {
    return bills.filter(b => {
      if (selectedAreaId !== 'all' && b.areaId !== selectedAreaId) return false;

      // Status filter
      const isPaid = b.status === 'paid' || b.balance <= 0;
      const isPartial = b.balance > 0 && b.balance < b.amount;
      const isUncollected = b.balance === b.amount;

      if (entryStatusFilter === 'paid' && !isPaid) return false;
      if (entryStatusFilter === 'partial' && !isPartial) return false;
      if (entryStatusFilter === 'uncollected' && !isUncollected) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInvoice = b.billNumber.toLowerCase().includes(q);
        const matchShop = b.shopName.toLowerCase().includes(q);
        const matchArea = b.areaId.toLowerCase().includes(q);
        if (!matchInvoice && !matchShop && !matchArea) return false;
      }

      return true;
    });
  }, [bills, selectedAreaId, entryStatusFilter, searchQuery]);

  const selectedAreaObj = areas.find(a => a.areaId === selectedAreaId);

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls Bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Admin Collection Dashboard &amp; Bill Entries
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-semibold inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" /> Non-Editable Entries
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Areawise collection analytics, today's collection verification, and streamlined invoice flow.
              </p>
            </div>
          </div>

          {/* Area Filter Selector (Prompt requirement: "the dashboard should show total collected with areawise filter") */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200 p-1.5 rounded-lg">
              <MapPin className="w-4 h-4 text-blue-700 ml-1" />
              <label className="text-xs font-bold text-blue-900">Area Filter:</label>
              <select
                value={selectedAreaId}
                onChange={e => setSelectedAreaId(e.target.value)}
                className="px-3 py-1 text-xs font-bold rounded border border-blue-300 bg-white text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">🌐 All Areas Combined ({areas.length})</option>
                {areas.map(a => (
                  <option key={a.areaId} value={a.areaId}>
                    {a.areaId} - {a.areaName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Select Date for Today's Collections"
              />
              {selectedDate !== getTodayDateStr() && (
                <button
                  onClick={() => setSelectedDate(getTodayDateStr())}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                >
                  Today
                </button>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs">
              <button
                onClick={() => setViewMode('standard')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'standard'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                4-Column View
              </button>
              <button
                onClick={() => setViewMode('deep')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'deep'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-blue-300" />
                Deep Information Table
              </button>
            </div>

            {onSwitchToLedger && (
              <button
                onClick={() => onSwitchToLedger(selectedAreaId !== 'all' ? selectedAreaId : undefined)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded shadow-2xs transition-colors"
                title="Open physical notebook ledger format"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Notebook View
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'deep' ? (
        <DeepInformationTable
          bills={selectedAreaId === 'all' ? bills : bills.filter(b => b.areaId === selectedAreaId)}
          collectionHistory={collectionHistory}
          areas={areas}
          salesmen={salesmen}
          currentRole="admin"
        />
      ) : (
        <>
          {/* 2. Key Dashboard Metrics with Areawise Focus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Collected ({selectedAreaId === 'all' ? 'All Areas' : selectedAreaObj?.areaName})
            </span>
            <span className="p-1.5 rounded bg-emerald-50 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            ₹{totalCollectedAllTime.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="font-bold text-slate-700">{overallRate.toFixed(1)}%</span> of ₹{totalInvoiced.toLocaleString()} invoiced
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, overallRate)}%` }}
            />
          </div>
        </div>

        {/* Today's Collection Under Selected Area */}
        <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-xs bg-gradient-to-br from-white to-blue-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Today's Collection ({selectedDate})
            </span>
            <span className="p-1.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">
              {todaysCollections.length} entries
            </span>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            ₹{totalTodayCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-blue-800 mt-1">
            Under {selectedAreaId === 'all' ? 'all territory areas' : selectedAreaObj?.areaName}
          </div>
        </div>

        {/* Total Outstanding Balance */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Outstanding Balance Due
            </span>
            <span className="p-1.5 rounded bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-800 mt-2">
            ₹{totalBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {activeBills.filter(b => b.balance > 0).length} pending customer bills
          </div>
        </div>

        {/* Active Invoices Count */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Invoices Logged
            </span>
            <span className="p-1.5 rounded bg-slate-100 text-slate-700">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {activeBills.length} Bills
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activeBills.filter(b => b.status === 'paid' || b.balance <= 0).length} Paid •{' '}
            {activeBills.filter(b => b.balance > 0 && b.balance < b.amount).length} Partial •{' '}
            {activeBills.filter(b => b.balance === b.amount).length} Uncollected
          </div>
        </div>
      </div>

      {/* 3. Areawise Breakdown Grid (Quick-Switch Cards) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Areawise Performance &amp; Collection Progress
          </h3>
          <span className="text-[11px] text-slate-500">
            Click any area card below to filter the entire dashboard and entry lists!
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {areaSummaries.map(a => {
            const isSelected = selectedAreaId === a.areaId;
            return (
              <button
                key={a.areaId}
                onClick={() => setSelectedAreaId(isSelected ? 'all' : a.areaId)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-900">{a.areaId}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{a.billCount} bills</span>
                </div>
                <div className="text-xs font-bold text-slate-800 truncate mt-0.5" title={a.areaName}>
                  {a.areaName}
                </div>
                <div className="text-xs font-black text-emerald-700 mt-1">
                  ₹{a.totalCollected.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  Due: ₹{a.totalBalance.toLocaleString()}
                </div>
                {/* Micro progress bar */}
                <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, a.collectionRate)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. TODAY'S COLLECTIONS UNDER SELECTED AREA */}
      {/* "the admin collection shoul have alll the entries made by the salesman that day under that area as todays collction" */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Today's Collections under {selectedAreaId === 'all' ? 'All Areas' : `${selectedAreaObj?.areaName} (${selectedAreaId})`} ({todaysCollections.length})
            </h3>
            <p className="text-xs text-slate-500">
              All collections logged by salesmen for {selectedDate} in the selected territory.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-bold px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Today's Total: <span className="font-mono text-emerald-950 font-black">₹{totalTodayCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {todaysCollections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No collection entries logged for {selectedDate} in {selectedAreaId === 'all' ? 'any area' : selectedAreaObj?.areaName}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Invoice Num</th>
                  <th className="px-4 py-2.5">Outlet Name</th>
                  <th className="px-4 py-2.5 text-right">Amount Value (₹)</th>
                  <th className="px-4 py-2.5 text-right">Balance Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todaysCollections.map(c => {
                  const bill = bills.find(b => b.billId === c.billId || b.billNumber === c.billNumber);
                  const effectiveArea = c.areaId || bill?.areaId || '—';
                  const isVerified = c.verificationStatus === 'Verified';

                  return (
                    <tr key={c.collectionId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-700">
                        {c.billNumber}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        <div className="font-semibold text-slate-900">{c.shopName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          By: {c.salesmanName} ({c.salesmanId}) • Area: {effectiveArea}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-emerald-600 text-sm font-mono">
                        ₹{c.amountCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono font-semibold text-slate-600">
                            ₹{c.runningBalanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          {onVerifyCollection && (
                            <button
                              onClick={() => onVerifyCollection(c.collectionId, 'Verified', 'Verified by Admin')}
                              disabled={isVerified}
                              className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 text-white transition-colors"
                            >
                              {isVerified ? '✔ Audited' : 'Approve'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. STREAMLINED LIST OF ENTRIES FOR ADMIN */}
      {/* "there will be list of entries for admin make it easier flow: innovice num shop name amount" */}
      {/* "no user will be having ability to edit the entries" */}
      {/* "next tab adds a new entry under the same selected area" */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                All Bill Entries &amp; Invoices ({filteredEntries.length})
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Read-Only • No Editing Allowed
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Easier flow showing: <strong>Invoice Num</strong> • <strong>Shop Name</strong> • <strong>Amount</strong> • Click "+ Add Next Entry" to quickly append bill under that area.
              </p>
            </div>

            {/* "+ Add New Entry under Selected Area" shortcut button */}
            <button
              onClick={() => {
                const targetArea = selectedAreaId !== 'all' ? selectedAreaId : (areas[0]?.areaId || 'A1');
                onNavigateToAddBillWithArea(targetArea);
              }}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-xs transition-colors"
              title="Adds a new entry under the currently selected area"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Entry Under {selectedAreaId !== 'all' ? selectedAreaId : (areas[0]?.areaId || 'A1')}
            </button>
          </div>

          {/* Search and Category Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Invoice #, Shop Name, or Area..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
              <button
                onClick={() => setEntryStatusFilter('all')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  entryStatusFilter === 'all' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({activeBills.length})
              </button>
              <button
                onClick={() => setEntryStatusFilter('paid')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  entryStatusFilter === 'paid' ? 'bg-white shadow-2xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fully Paid ({activeBills.filter(b => b.status === 'paid' || b.balance <= 0).length})
              </button>
              <button
                onClick={() => setEntryStatusFilter('partial')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  entryStatusFilter === 'partial' ? 'bg-white shadow-2xs text-amber-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Partial ({activeBills.filter(b => b.balance > 0 && b.balance < b.amount).length})
              </button>
              <button
                onClick={() => setEntryStatusFilter('uncollected')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  entryStatusFilter === 'uncollected' ? 'bg-white shadow-2xs text-red-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Uncollected ({activeBills.filter(b => b.balance === b.amount).length})
              </button>
            </div>
          </div>
        </div>

        {/* Read-Only Notice banner */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Strict Audit Policy: Entries cannot be modified or edited after creation to preserve financial ledger integrity.</span>
          </div>
          <span className="font-mono text-slate-400">Database: grb_data.xlsx [Bills]</span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No bill entries found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Invoice Num</th>
                  <th className="px-4 py-3">Outlet Name</th>
                  <th className="px-4 py-3 text-right">Amount Value (₹)</th>
                  <th className="px-4 py-3 text-right">Balance Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map(b => {
                  const isPaid = b.status === 'paid' || b.balance <= 0;
                  const isPartial = b.balance > 0 && b.balance < b.amount;

                  return (
                    <tr key={b.billId} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Invoice Num */}
                      <td className="px-4 py-3 font-mono font-bold text-blue-800">
                        {b.billNumber}
                      </td>

                      {/* 2. Outlet Name */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{b.shopName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Area: {b.areaId} • Issued: {b.dateIssued}
                        </div>
                      </td>

                      {/* 3. Amount Value */}
                      <td className="px-4 py-3 text-right font-black text-slate-900 text-sm font-mono">
                        ₹{b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 4. Balance Amount */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`font-mono font-bold ${
                              isPaid ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-slate-800'
                            }`}
                          >
                            {isPaid ? 'CLEARED' : `₹${b.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                          </span>
                          <button
                            onClick={() => onNavigateToAddBillWithArea(b.areaId)}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors inline-flex items-center gap-1"
                            title={`Add another bill entry under area ${b.areaId}`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                            +{b.areaId}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )}
</div>
  );
};
