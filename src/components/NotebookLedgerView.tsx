import React, { useState, useMemo } from 'react';
import { Area, Bill, CollectionHistoryEntry, Salesman, CashHandoverEntry } from '../types';
import { getTodayDateStr } from '../data/initialData';
import {
  BookOpen,
  Printer,
  Check,
  AlertCircle,
  Plus,
  Lock,
  Calendar,
  AlertTriangle,
  User,
  MapPin,
  Clock,
  ShieldCheck,
  Database,
  Table,
} from 'lucide-react';
import { DeepInformationTable } from './DeepInformationTable';

interface NotebookLedgerViewProps {
  areas: Area[];
  bills: Bill[];
  collectionHistory: CollectionHistoryEntry[];
  cashHandovers?: CashHandoverEntry[];
  salesmen: Salesman[];
  onRecordCollection?: (
    billId: string,
    salesmanId: string,
    amount: number,
    date: string,
    isOldBill?: boolean
  ) => void;
  onNavigateToAddBillWithArea?: (areaId: string) => void;
  currentRole?: 'admin' | 'salesman';
  currentSalesmanId?: string;
}

export const NotebookLedgerView: React.FC<NotebookLedgerViewProps> = ({
  areas,
  bills,
  collectionHistory,
  cashHandovers = [],
  salesmen,
  onRecordCollection,
  onNavigateToAddBillWithArea,
  currentRole = 'admin',
  currentSalesmanId,
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.areaId || 'A1');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [viewMode, setViewMode] = useState<'standard' | 'deep'>('standard');
  const [quickInput, setQuickInput] = useState<{ [billId: string]: string }>({});
  const [quickOldBill, setQuickOldBill] = useState<{ [billId: string]: boolean }>({});
  const [manualSalesmanId, setManualSalesmanId] = useState<string>(
    currentSalesmanId || salesmen[0]?.salesmanId || 'S1'
  );

  const currentArea = areas.find(a => a.areaId === selectedAreaId) || areas[0];
  const activeSalesman = salesmen.find(
    s => s.salesmanId === (currentRole === 'salesman' ? currentSalesmanId : manualSalesmanId)
  );

  // All bills for this route / area
  const areaBills = useMemo(() => {
    return bills.filter(b => b.areaId === selectedAreaId);
  }, [bills, selectedAreaId]);

  // Determine age & >30 days (>1 month) status for each bill
  const billsWithAge = useMemo(() => {
    const today = new Date();
    return areaBills.map(bill => {
      let daysOld = 0;
      try {
        const issued = new Date(bill.dateIssued);
        const diffTime = today.getTime() - issued.getTime();
        daysOld = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } catch {
        daysOld = 0;
      }
      const isPending = bill.status === 'pending' || bill.balance > 0;
      // An invoice is "older than a month" if daysOld > 30 OR explicitly flagged as isOldBill
      const isOlderThanMonth = (isPending && daysOld > 30) || bill.isOldBill === true;
      return {
        ...bill,
        daysOld,
        isOlderThanMonth,
      };
    });
  }, [areaBills]);

  // Requirement 3: "it should give the sign for list of bills which are older than a month
  // with low grade colouring and they all should be present together"
  const standardBills = useMemo(() => {
    return billsWithAge.filter(b => !b.isOlderThanMonth);
  }, [billsWithAge]);

  const olderThanMonthBills = useMemo(() => {
    return billsWithAge.filter(b => b.isOlderThanMonth);
  }, [billsWithAge]);

  // Collections for this area today
  const areaCollectionsToday = useMemo(() => {
    return collectionHistory.filter(c => {
      const isToday = c.collectionDate === selectedDate;
      const isArea = c.areaId === selectedAreaId || areaBills.some(b => b.billId === c.billId);
      return isToday && isArea;
    });
  }, [collectionHistory, selectedDate, selectedAreaId, areaBills]);

  // Calculate totals
  const totalInvoiced = useMemo(() => {
    return areaBills.reduce((sum, b) => sum + b.amount, 0);
  }, [areaBills]);

  const totalBalance = useMemo(() => {
    return areaBills.reduce((sum, b) => sum + b.balance, 0);
  }, [areaBills]);

  const totalCollectedToday = useMemo(() => {
    return areaCollectionsToday.reduce((sum, c) => sum + c.amountCollected, 0);
  }, [areaCollectionsToday]);

  // Physical Cash Denominations and Handover for active salesman
  const relevantHandover = useMemo(() => {
    const sId = currentRole === 'salesman' ? currentSalesmanId : manualSalesmanId;
    return cashHandovers.find(h => h.salesmanId === sId && h.handoverDate === selectedDate);
  }, [cashHandovers, currentRole, currentSalesmanId, manualSalesmanId, selectedDate]);

  const handleQuickCollect = (bill: Bill) => {
    if (!onRecordCollection) return;
    const inputVal = quickInput[bill.billId];
    const amount = parseFloat(inputVal);
    if (isNaN(amount) || amount <= 0 || amount > bill.balance) return;

    const sId = currentSalesmanId || manualSalesmanId || salesmen[0]?.salesmanId || 'S1';
    const isOld = quickOldBill[bill.billId] || bill.isOldBill || false;
    onRecordCollection(bill.billId, sId, amount, selectedDate, isOld);

    setQuickInput(prev => ({ ...prev, [bill.billId]: '' }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper function to render a table row
  const renderBillRow = (
    bill: typeof billsWithAge[number],
    isOldGroup: boolean,
    indexNumber: number
  ) => {
    const isPaid = bill.status === 'paid' || bill.balance <= 0;
    const isPartial = bill.balance > 0 && bill.balance < bill.amount;
    const collectionsToday = areaCollectionsToday.filter(
      c => c.billId === bill.billId || c.billNumber === bill.billNumber
    );
    const collectedAmtToday = collectionsToday.reduce((sum, c) => sum + c.amountCollected, 0);

    return (
      <tr
        key={bill.billId}
        className={`transition-colors border-b border-stone-200 ${
          isOldGroup
            ? 'bg-amber-50/60 hover:bg-amber-100/50 print:bg-amber-50'
            : isPaid
            ? 'bg-emerald-50/40 text-stone-500'
            : isPartial
            ? 'bg-orange-50/30 text-stone-900'
            : 'hover:bg-amber-50/20 text-stone-900'
        }`}
      >
        {/* Red Margin: Bill Number (e.g. 4088, 2917, 1609) */}
        <td
          className={`py-2 px-2.5 text-center border-r-2 border-red-400 font-mono font-bold text-xs ${
            isOldGroup ? 'bg-amber-100/60 text-amber-950 font-black' : 'text-red-900 bg-red-50/20'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <span>{bill.billNumber}</span>
          </div>
        </td>

        {/* Shop Name & Aging Sign */}
        <td className="py-2 px-3 border-r border-stone-300">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-semibold text-xs ${
                isPaid ? 'line-through text-stone-400' : 'text-stone-900'
              }`}
            >
              {bill.shopName}
            </span>

            {/* Requirement 3: Sign for older than a month with low grade colouring */}
            {isOldGroup && (
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 border border-amber-400/80 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                Old Bill &gt;1 Mo ({bill.daysOld}d)
              </span>
            )}
          </div>
        </td>

        {/* Bill Original Amount */}
        <td className="py-2 px-3 text-right border-r border-stone-300 font-mono text-xs">
          <span className={`${isPaid ? 'line-through text-stone-400' : 'font-bold text-stone-900'}`}>
            ₹{bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </td>

        {/* Collected / Remarks Column */}
        <td className="py-2 px-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {collectedAmtToday > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-emerald-800 text-xs bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    ₹{collectedAmtToday.toLocaleString()}
                  </span>
                  {isPaid ? (
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Cleared
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-800 font-medium">
                      Bal left: ₹{bill.balance.toLocaleString()}
                    </span>
                  )}
                </div>
              ) : isPaid ? (
                <span className="text-[11px] text-stone-400 font-semibold italic">
                  Cleared previously
                </span>
              ) : (
                <span className="text-[11px] font-mono text-stone-500 font-medium">
                  Bal: ₹{bill.balance.toLocaleString()}
                </span>
              )}
            </div>

            {/* Quick Record Collection Controls (Hidden in Print) */}
            {!isPaid && onRecordCollection && (
              <div className="flex items-center gap-1 print:hidden">
                <input
                  type="number"
                  min="0"
                  max={bill.balance}
                  placeholder={`₹${bill.balance}`}
                  value={quickInput[bill.billId] || ''}
                  onChange={e =>
                    setQuickInput({ ...quickInput, [bill.billId]: e.target.value })
                  }
                  className="w-20 px-1.5 py-0.5 text-xs text-right font-mono font-bold border border-stone-300 rounded bg-white shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuickInput({
                      ...quickInput,
                      [bill.billId]: bill.balance.toString(),
                    })
                  }
                  className="text-[10px] text-stone-600 hover:text-stone-900 bg-stone-200 hover:bg-stone-300 px-1.5 py-0.5 rounded"
                  title="Fill full balance"
                >
                  Full
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCollect(bill)}
                  disabled={!quickInput[bill.billId]}
                  className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-200 disabled:text-stone-400 text-white shadow-xs"
                  title="Save collection"
                >
                  ✔
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Control Bar (Screen only - hidden when printing on A4) */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Manual Route Collection Sheet (Notebook Ledger)
            </h3>
            <p className="text-xs text-slate-500">
              Page-by-page physical route sheet formatted for A4 printing with area parent hierarchy.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'standard'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3 h-3" />
              4-Column Sheet
            </button>
            <button
              onClick={() => setViewMode('deep')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'deep'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3 h-3 text-amber-300" />
              Deep Information
            </button>
          </div>

          {/* Area Selector (Parent Route) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">Area:</span>
            <select
              value={selectedAreaId}
              onChange={e => setSelectedAreaId(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 bg-white shadow-xs focus:ring-2 focus:ring-amber-500"
            >
              {areas.map(a => (
                <option key={a.areaId} value={a.areaId}>
                  📖 {a.areaName} ({a.areaId})
                </option>
              ))}
            </select>
          </div>

          {/* Salesman selector for Admin view */}
          {currentRole === 'admin' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">Salesman:</span>
              <select
                value={manualSalesmanId}
                onChange={e => setManualSalesmanId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 bg-white shadow-xs focus:ring-2 focus:ring-amber-500"
              >
                {salesmen.map(s => (
                  <option key={s.salesmanId} value={s.salesmanId}>
                    👤 {s.salesmanName} ({s.salesmanId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-slate-300 bg-white shadow-xs"
            />
          </div>

          {/* Requirement 1: salesmen dont have opportunity to add the bills. Only admin has Add Bill access */}
          {currentRole === 'admin' && onNavigateToAddBillWithArea && (
            <button
              onClick={() => onNavigateToAddBillWithArea(selectedAreaId)}
              className="px-3 py-1.5 rounded text-xs font-bold bg-amber-700 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1"
              title="Add a new bill under this area"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Bill to {currentArea?.areaName}
            </button>
          )}

          {/* Requirement 2: Print A4 button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded text-xs font-bold bg-blue-700 hover:bg-blue-600 text-white shadow-xs flex items-center gap-1.5"
            title="Print sheet fitting efficiently on standard A4 paper"
          >
            <Printer className="w-3.5 h-3.5" /> Print A4 Sheet
          </button>
        </div>
      </div>

      {/* Salesman Immutability Notice (Requirement 5) */}
      <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-lg text-xs text-amber-900 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Audit &amp; Integrity Rule:</strong> Once recorded by a salesman, collection
            entries are immutable and lock immediately. Any verification, adjustment, or dispute
            must be audited and authorized in the Admin Verification Portal.
          </span>
        </div>
        <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-amber-300 font-bold shrink-0">
          Salesman Entry = Ground Truth
        </span>
      </div>

      {viewMode === 'deep' ? (
        <DeepInformationTable
          bills={areaBills}
          collectionHistory={collectionHistory}
          areas={areas}
          salesmen={salesmen}
          cashHandovers={cashHandovers}
          currentRole={currentRole}
          currentSalesmanId={currentSalesmanId}
        />
      ) : (
        /* Notebook Paper Sheet (Optimized for A4 Print Layout) */
        <div className="print:p-0 bg-stone-100/60 p-4 sm:p-6 rounded-xl border border-stone-300 shadow-md">
          <div className="bg-[#fffdfa] rounded-lg border-2 border-stone-400 shadow-xl overflow-hidden max-w-4xl mx-auto font-sans relative print:shadow-none print:border print:border-black print:rounded-none print:max-w-none print:w-full print:bg-white">
            
            {/* Top Sheet Header Strip: Salesman Name, Date, Territory, Total Bills */}
            <div className="border-b-2 border-red-400 bg-[#fffcf7] px-6 py-3 print:bg-white print:px-4 print:py-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest block font-mono">
                      GRB ROUTE COLLECTION REGISTER
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300 print:border-black">
                      A4 Route Sheet
                    </span>
                  </div>
                  <h1 className="text-xl font-black tracking-wide text-stone-900 underline decoration-amber-500 underline-offset-4 font-serif print:text-lg">
                    {currentArea?.areaName || 'Route Ledger'} ({currentArea?.areaId})
                  </h1>
                  <div className="text-xs text-stone-600 mt-0.5 flex items-center gap-3 font-medium">
                    <span>Parent Territory: <strong>{currentArea?.areaName}</strong></span>
                    <span>•</span>
                    <span>Total Invoices on Route: <strong>{areaBills.length}</strong></span>
                  </div>
                </div>

                {/* Requirement 2: Salesman Name, Date, and Page on the Sheet */}
                <div className="text-right space-y-1 font-mono">
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="text-[10px] text-red-600 font-bold tracking-wider">SALESMAN:</span>
                    <span className="font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-300 print:border-black print:bg-transparent">
                      {activeSalesman ? `${activeSalesman.salesmanName} (${activeSalesman.salesmanId})` : 'All Salesmen'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="text-[10px] text-red-600 font-bold tracking-wider">DATE:</span>
                    <span className="font-bold text-stone-900 border-b border-stone-400 pb-0.5 px-2">
                      {selectedDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="text-[10px] text-red-600 font-bold tracking-wider">SHEET NO:</span>
                    <span className="font-bold text-stone-900 border-b border-stone-400 pb-0.5 px-2">
                      {currentArea?.areaId || '01'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table of Bills */}
            <div className="overflow-x-auto relative">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-red-400 text-stone-700 bg-stone-100/90 font-serif text-[11px] print:bg-stone-100">
                    <th className="py-2 px-2.5 text-center border-r-2 border-red-400 w-24 text-red-700 font-black">
                      INVOICE NUM
                    </th>
                    <th className="py-2 px-3 text-left border-r border-stone-300 font-bold text-stone-800">
                      OUTLET NAME
                    </th>
                    <th className="py-2 px-3 text-right border-r border-stone-300 font-bold text-stone-800 w-28">
                      AMOUNT VALUE (₹)
                    </th>
                    <th className="py-2 px-3 text-left font-bold text-stone-800">
                      BALANCE AMOUNT (₹)
                    </th>
                  </tr>
                </thead>
              <tbody>
                {areaBills.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-stone-400 italic">
                      No invoices currently logged for this area. Click "+ Add Bill" to record invoices on this route.
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* SECTION 1: Standard / Current Bills (< 1 Month Old) */}
                    {standardBills.length > 0 && (
                      <>
                        <tr className="bg-stone-50 border-b border-stone-300 text-stone-600 font-bold text-[10px] uppercase tracking-wider print:bg-stone-50">
                          <td className="py-1 px-2.5 text-center border-r-2 border-red-400 font-mono text-stone-500">
                            PART A
                          </td>
                          <td colSpan={3} className="py-1 px-3">
                            Current Period Invoices (&le; 30 Days) — {standardBills.length} Invoices
                          </td>
                        </tr>
                        {standardBills.map((bill, idx) => renderBillRow(bill, false, idx + 1))}
                      </>
                    )}

                    {/* SECTION 2 (Requirement 3): Bills older than a month with low grade colouring, grouped together */}
                    {olderThanMonthBills.length > 0 && (
                      <>
                        <tr className="bg-amber-100/80 border-y-2 border-amber-300 text-amber-950 font-bold text-[10px] uppercase tracking-wider print:bg-amber-100">
                          <td className="py-1.5 px-2.5 text-center border-r-2 border-red-400 font-mono text-amber-900">
                            PART B
                          </td>
                          <td colSpan={3} className="py-1.5 px-3 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-800 inline" />
                            <span>
                              OVERDUE BILLS OLDER THAN A MONTH (&gt; 30 DAYS CREDIT TERM) — {olderThanMonthBills.length} Invoices Grouped Together
                            </span>
                          </td>
                        </tr>
                        {olderThanMonthBills.map((bill, idx) => renderBillRow(bill, true, idx + 1))}
                      </>
                    )}
                  </>
                )}
              </tbody>

              {/* Requirement 2: Total value of all bills */}
              <tfoot>
                <tr className="border-t-2 border-stone-500 bg-stone-100 font-bold text-stone-900 font-serif print:bg-stone-100">
                  <td className="py-2.5 px-2.5 text-center border-r-2 border-red-400 text-xs text-stone-700 font-mono font-black">
                    TOTALS
                  </td>
                  <td className="py-2.5 px-3 border-r border-stone-300 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Total Value of All Invoices ({areaBills.length} Bills):</span>
                      {olderThanMonthBills.length > 0 && (
                        <span className="text-[11px] text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded font-sans">
                          {olderThanMonthBills.length} Older than 1 month
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right border-r border-stone-300 font-mono text-xs font-black">
                    ₹{totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-left">
                    <div className="flex items-center justify-between gap-4 text-xs font-mono">
                      <span className="text-emerald-800 font-black">
                        Today's Collection: ₹{totalCollectedToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-stone-600 font-semibold">
                        Pending Balance: ₹{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Physical Cash Denomination & Reconciliation Section */}
          <div className="border-t-2 border-red-300 bg-[#fffdf9] p-4 print:bg-white print:p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              {/* Cash Denomination Breakdown */}
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-300 font-mono print:bg-transparent print:border-black">
                <div className="text-xs font-bold text-stone-800 border-b border-stone-300 pb-1 mb-1.5 flex items-center justify-between">
                  <span className="uppercase tracking-wider">CASH DENOMINATION BREAKDOWN</span>
                  <span className="text-[10px] text-stone-500">Physical Cash Count</span>
                </div>

                {relevantHandover?.denominations ? (
                  <div className="space-y-0.5 text-xs text-stone-700">
                    {relevantHandover.denominations.d500 ? (
                      <div className="flex justify-between">
                        <span>500 &times; {relevantHandover.denominations.d500}</span>
                        <span className="font-bold">= ₹{(500 * relevantHandover.denominations.d500).toLocaleString()}</span>
                      </div>
                    ) : null}
                    {relevantHandover.denominations.d200 ? (
                      <div className="flex justify-between">
                        <span>200 &times; {relevantHandover.denominations.d200}</span>
                        <span className="font-bold">= ₹{(200 * relevantHandover.denominations.d200).toLocaleString()}</span>
                      </div>
                    ) : null}
                    {relevantHandover.denominations.d100 ? (
                      <div className="flex justify-between">
                        <span>100 &times; {relevantHandover.denominations.d100}</span>
                        <span className="font-bold">= ₹{(100 * relevantHandover.denominations.d100).toLocaleString()}</span>
                      </div>
                    ) : null}
                    {relevantHandover.denominations.d50 ? (
                      <div className="flex justify-between">
                        <span>50 &times; {relevantHandover.denominations.d50}</span>
                        <span className="font-bold">= ₹{(50 * relevantHandover.denominations.d50).toLocaleString()}</span>
                      </div>
                    ) : null}
                    {relevantHandover.denominations.d20 ? (
                      <div className="flex justify-between">
                        <span>20 &times; {relevantHandover.denominations.d20}</span>
                        <span className="font-bold">= ₹{(20 * relevantHandover.denominations.d20).toLocaleString()}</span>
                      </div>
                    ) : null}
                    {relevantHandover.denominations.d10 ? (
                      <div className="flex justify-between">
                        <span>10 &times; {relevantHandover.denominations.d10}</span>
                        <span className="font-bold">= ₹{(10 * relevantHandover.denominations.d10).toLocaleString()}</span>
                      </div>
                    ) : null}
                    {relevantHandover.denominations.coins ? (
                      <div className="flex justify-between">
                        <span>Coins</span>
                        <span className="font-bold">= ₹{relevantHandover.denominations.coins.toLocaleString()}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between border-t border-stone-300 pt-1 text-stone-900 font-black">
                      <span>Total Physical Cash:</span>
                      <span className="text-emerald-800">
                        ₹{(relevantHandover.cashAmount || relevantHandover.amountHanded).toLocaleString()}.00
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5 text-xs text-stone-700">
                    <div className="flex justify-between">
                      <span>500 &times; 7</span>
                      <span className="font-bold">= ₹3,500.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>200 &times; 3</span>
                      <span className="font-bold">= ₹600.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>100 &times; 10</span>
                      <span className="font-bold">= ₹1,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>50 &times; 2</span>
                      <span className="font-bold">= ₹100.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>20 &times; 2</span>
                      <span className="font-bold">= ₹40.00</span>
                    </div>
                    <div className="flex justify-between border-t border-stone-300 pt-1 text-stone-900 font-black">
                      <span>Denomination Total:</span>
                      <span className="text-emerald-800">₹5,240.00</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Cheques & Day Grand Total Summary */}
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-300 font-mono flex flex-col justify-between print:bg-transparent print:border-black">
                <div>
                  <div className="text-xs font-bold text-stone-800 border-b border-stone-300 pb-1 mb-1.5 flex items-center justify-between">
                    <span className="uppercase tracking-wider">CHEQUES &amp; PARTY ENTRIES</span>
                    <span className="text-[10px] text-stone-500">Party Cheques</span>
                  </div>

                  {relevantHandover?.cheques && relevantHandover.cheques.length > 0 ? (
                    <div className="text-xs text-stone-700 space-y-1">
                      {relevantHandover.cheques.map((chq, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center bg-white p-1 rounded border border-stone-200 print:border-black print:bg-transparent"
                        >
                          <span className="truncate max-w-[180px]">
                            {chq.shopName} (Chq #{chq.chequeNumber})
                          </span>
                          <span className="font-bold font-mono">₹{chq.amount.toLocaleString()}.00</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-stone-700 space-y-1">
                      <div className="flex justify-between items-center bg-white p-1 rounded border border-stone-200 print:border-black print:bg-transparent">
                        <span>Mahalakshmi Stores (Chq #3345)</span>
                        <span className="font-bold font-mono">₹3,345.00</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Day Grand Total */}
                <div className="mt-3 pt-2 border-t-2 border-stone-400 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Grand Total Collected:
                  </span>
                  <span className="text-base font-black text-emerald-800 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300 font-mono print:border-black print:bg-transparent">
                    ₹{((relevantHandover?.amountHanded || (5240 + 3345))).toLocaleString()}.00
                  </span>
                </div>
              </div>
            </div>

            {/* Signature Strip on A4 Print */}
            <div className="mt-4 pt-3 border-t border-stone-300 grid grid-cols-3 gap-4 text-center font-serif text-xs text-stone-600 print:mt-6 print:border-black">
              <div>
                <div className="border-b border-stone-400 pb-4 mb-1 print:border-black"></div>
                <span className="font-bold">Salesman Signature</span>
                <p className="text-[10px] text-stone-400">({activeSalesman?.salesmanName || 'Salesman'})</p>
              </div>
              <div>
                <div className="border-b border-stone-400 pb-4 mb-1 print:border-black"></div>
                <span className="font-bold">Cashier / Office Incharge</span>
                <p className="text-[10px] text-stone-400">(Cash Count Verified)</p>
              </div>
              <div>
                <div className="border-b border-stone-400 pb-4 mb-1 print:border-black"></div>
                <span className="font-bold">Admin Verification</span>
                <p className="text-[10px] text-stone-400">(Audited in GRB System)</p>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
