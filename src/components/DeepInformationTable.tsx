import React, { useState, useMemo } from 'react';
import { Bill, CollectionHistoryEntry, Area, Salesman, DriverAssignment, CashHandoverEntry, Driver } from '../types';
import {
  Database,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  Eye,
  X,
  FileSpreadsheet,
  Building2,
  Calendar,
  AlertOctagon,
  ArrowUpDown,
  Check,
} from 'lucide-react';

interface DeepInformationTableProps {
  bills: Bill[];
  collectionHistory: CollectionHistoryEntry[];
  areas: Area[];
  salesmen: Salesman[];
  drivers?: Driver[];
  driverAssignments?: DriverAssignment[];
  cashHandovers?: CashHandoverEntry[];
  currentRole?: 'admin' | 'salesman';
  currentSalesmanId?: string;
  initialInvoiceFilter?: string;
}

export const DeepInformationTable: React.FC<DeepInformationTableProps> = ({
  bills,
  collectionHistory,
  areas,
  salesmen,
  drivers = [],
  driverAssignments = [],
  cashHandovers = [],
  currentRole = 'admin',
  currentSalesmanId,
  initialInvoiceFilter = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialInvoiceFilter);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>(
    currentRole === 'salesman' && currentSalesmanId ? currentSalesmanId : 'all'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'breach' | 'collected_today' | 'has_returns'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'Verified' | 'Flagged' | 'Pending Review'>('all');
  const [selectedDeepRecord, setSelectedDeepRecord] = useState<any | null>(null);

  // Area Lookup map
  const areaMap = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach(a => map.set(a.areaId, a.areaName));
    return map;
  }, [areas]);

  // Salesman Lookup map
  const salesmanMap = useMemo(() => {
    const map = new Map<string, string>();
    salesmen.forEach(s => map.set(s.salesmanId, s.salesmanName));
    return map;
  }, [salesmen]);

  // Driver Assignment lookup map by billId
  const assignmentMap = useMemo(() => {
    const map = new Map<string, DriverAssignment>();
    driverAssignments.forEach(da => map.set(da.billId, da));
    return map;
  }, [driverAssignments]);

  // Build Comprehensive Deep Records combining bills with their entire backend history
  const deepRecords = useMemo(() => {
    return bills.map(bill => {
      // Find all collections for this bill
      const billCollections = collectionHistory.filter(
        c => c.billId === bill.billId || c.billNumber === bill.billNumber
      );

      const totalCollected = billCollections.reduce((sum, c) => sum + (c.amountCollected || 0), 0);
      const totalReturns = billCollections.reduce((sum, c) => sum + (c.returnAmount || 0), 0);
      
      const latestCollection = billCollections.length > 0 ? billCollections[0] : null;
      const assignment = assignmentMap.get(bill.billId);

      // Derive verification status: if any flagged -> Flagged; else if all verified -> Verified; else Pending
      let auditStatus: 'Verified' | 'Flagged' | 'Pending Review' | 'No Collections' = 'No Collections';
      if (billCollections.length > 0) {
        if (billCollections.some(c => c.verificationStatus === 'Flagged')) {
          auditStatus = 'Flagged';
        } else if (billCollections.every(c => c.verificationStatus === 'Verified')) {
          auditStatus = 'Verified';
        } else {
          auditStatus = 'Pending Review';
        }
      }

      // Check if bill has collections recorded today
      const today = new Date().toISOString().split('T')[0];
      const hasCollectedToday = billCollections.some(c => c.collectionDate === today && c.amountCollected > 0);

      // Return reasons
      const returnReasons = billCollections
        .filter(c => (c.returnAmount || 0) > 0 && c.returnReason)
        .map(c => c.returnReason)
        .join(', ');

      return {
        billId: bill.billId,
        invoiceNum: bill.billNumber,
        outletName: bill.shopName,
        amountValue: bill.amount,
        balanceAmount: bill.balance,
        areaId: bill.areaId,
        areaName: areaMap.get(bill.areaId) || bill.areaId,
        dateIssued: bill.dateIssued,
        daysOld: bill.daysOld || 0,
        isCreditBreach: bill.isCreditBreach || false,
        isOldBill: bill.isOldBill || false,
        billStatus: bill.status,
        totalCollected,
        totalReturns,
        returnReasons,
        collectionCount: billCollections.length,
        collections: billCollections,
        latestCollectionDate: latestCollection?.collectionDate || '—',
        latestCollectedAmount: latestCollection?.amountCollected ?? 0,
        latestPaymentMode: latestCollection?.paymentMode || '—',
        latestChequeOrUtr: latestCollection?.chequeOrUtrNumber || '',
        auditStatus,
        adminNotes: latestCollection?.adminNotes || '',
        driverAssignment: assignment || null,
        hasCollectedToday,
        salesmanId: latestCollection?.salesmanId || (currentRole === 'salesman' ? currentSalesmanId : undefined),
        salesmanName: latestCollection?.salesmanName || (latestCollection?.salesmanId ? salesmanMap.get(latestCollection.salesmanId) : '—'),
      };
    });
  }, [bills, collectionHistory, areaMap, salesmanMap, assignmentMap, currentRole, currentSalesmanId]);

  // Filter Deep Records
  const filteredRecords = useMemo(() => {
    return deepRecords.filter(item => {
      // Salesman Isolation if salesman role
      if (currentRole === 'salesman' && currentSalesmanId) {
        if (selectedSalesmanId !== 'all' && item.salesmanId && item.salesmanId !== currentSalesmanId) {
          // Allow if bill belongs to salesman's territory
        }
      } else if (selectedSalesmanId !== 'all') {
        if (item.salesmanId && item.salesmanId !== selectedSalesmanId) return false;
      }

      // Area filter
      if (selectedAreaId !== 'all' && item.areaId !== selectedAreaId) return false;

      // Status filter
      if (statusFilter === 'pending' && (item.billStatus === 'paid' || item.balanceAmount <= 0)) return false;
      if (statusFilter === 'paid' && item.balanceAmount > 0) return false;
      if (statusFilter === 'breach' && !item.isCreditBreach) return false;
      if (statusFilter === 'collected_today' && !item.hasCollectedToday) return false;
      if (statusFilter === 'has_returns' && item.totalReturns <= 0) return false;

      // Verification filter
      if (verificationFilter !== 'all' && item.auditStatus !== verificationFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInvoice = item.invoiceNum.toLowerCase().includes(q);
        const matchShop = item.outletName.toLowerCase().includes(q);
        const matchArea = item.areaName.toLowerCase().includes(q) || item.areaId.toLowerCase().includes(q);
        const matchSalesman = (item.salesmanName || '').toLowerCase().includes(q);
        const matchNotes = (item.adminNotes || '').toLowerCase().includes(q);
        const matchDriver = (item.driverAssignment?.driverName || '').toLowerCase().includes(q);
        if (!matchInvoice && !matchShop && !matchArea && !matchSalesman && !matchNotes && !matchDriver) return false;
      }

      return true;
    });
  }, [deepRecords, selectedAreaId, selectedSalesmanId, statusFilter, verificationFilter, searchQuery, currentRole, currentSalesmanId]);

  // Aggregated Summary
  const totalInvoiced = filteredRecords.reduce((sum, r) => sum + r.amountValue, 0);
  const totalBalance = filteredRecords.reduce((sum, r) => sum + r.balanceAmount, 0);
  const totalCollectedAllTime = filteredRecords.reduce((sum, r) => sum + r.totalCollected, 0);
  const totalReturnsAllTime = filteredRecords.reduce((sum, r) => sum + r.totalReturns, 0);
  const breachCount = filteredRecords.filter(r => r.isCreditBreach).length;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Invoice Num',
      'Outlet Name',
      'Amount Value (₹)',
      'Balance Amount (₹)',
      'Area ID',
      'Area Name',
      'Salesman Name',
      'Date Issued',
      'Age (Days)',
      'Credit Status',
      'Total Collected (₹)',
      'Total Returns (₹)',
      'Return Reason',
      'Audit Status',
      'Admin Notes',
      'Latest Payment Mode',
      'Driver Assigned',
    ];

    const rows = filteredRecords.map(r => [
      `"${r.invoiceNum}"`,
      `"${r.outletName.replace(/"/g, '""')}"`,
      r.amountValue,
      r.balanceAmount,
      `"${r.areaId}"`,
      `"${r.areaName.replace(/"/g, '""')}"`,
      `"${(r.salesmanName || '—').replace(/"/g, '""')}"`,
      r.dateIssued,
      r.daysOld,
      r.isCreditBreach ? 'Breach >30d' : r.balanceAmount <= 0 ? 'Cleared' : 'Active',
      r.totalCollected,
      r.totalReturns,
      `"${(r.returnReasons || '').replace(/"/g, '""')}"`,
      r.auditStatus,
      `"${(r.adminNotes || '').replace(/"/g, '""')}"`,
      r.latestPaymentMode,
      `"${(r.driverAssignment?.driverName || '—').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GRB_Deep_Information_Master_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Context */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-lg">
              <Database className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Master Audit &amp; Deep Information Table
                </h2>
                <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                  Comprehensive Backend Store ({filteredRecords.length} records)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized detailed repository: all route data, return deductions, credit terms, payment references, and audit histories stored under one single table.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Deep Table (CSV)</span>
            </button>
          </div>
        </div>

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200/80">
            <div className="text-[11px] text-slate-500">Total Invoiced</div>
            <div className="text-base font-black text-slate-900 font-mono mt-0.5">
              ₹{totalInvoiced.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200/80">
            <div className="text-[11px] text-slate-500">Collected All-Time</div>
            <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
              ₹{totalCollectedAllTime.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200/80">
            <div className="text-[11px] text-slate-500">Remaining Balance</div>
            <div className="text-base font-black text-amber-800 font-mono mt-0.5">
              ₹{totalBalance.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200/80">
            <div className="text-[11px] text-slate-500">Returns Deducted</div>
            <div className="text-base font-black text-rose-700 font-mono mt-0.5">
              ₹{totalReturnsAllTime.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200/80">
            <div className="text-[11px] text-slate-500">Overdue &gt;30d</div>
            <div className={`text-base font-black font-mono mt-0.5 ${breachCount > 0 ? 'text-red-700' : 'text-slate-700'}`}>
              {breachCount} bills
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search Invoice #, Outlet, Area, Salesman..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Area */}
            <select
              value={selectedAreaId}
              onChange={e => setSelectedAreaId(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium text-slate-700"
            >
              <option value="all">All Areas / Routes</option>
              {areas.map(a => (
                <option key={a.areaId} value={a.areaId}>
                  {a.areaId} - {a.areaName}
                </option>
              ))}
            </select>

            {/* Salesman */}
            {currentRole === 'admin' && (
              <select
                value={selectedSalesmanId}
                onChange={e => setSelectedSalesmanId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium text-slate-700"
              >
                <option value="all">All Salesmen</option>
                {salesmen.map(s => (
                  <option key={s.salesmanId} value={s.salesmanId}>
                    {s.salesmanName} ({s.salesmanId})
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium text-slate-700"
            >
              <option value="all">All Bill Statuses</option>
              <option value="pending">Pending Balance Only</option>
              <option value="paid">Fully Paid / Cleared</option>
              <option value="breach">Credit Breaches (&gt;30d)</option>
              <option value="collected_today">Collected Today</option>
              <option value="has_returns">Has Return Deductions</option>
            </select>

            {/* Audit Status Filter */}
            <select
              value={verificationFilter}
              onChange={e => setVerificationFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium text-slate-700"
            >
              <option value="all">All Audit Statuses</option>
              <option value="Verified">Verified / Approved</option>
              <option value="Flagged">Flagged</option>
              <option value="Pending Review">Pending Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Deep Information Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-200 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                {/* The 4 core user-mandated columns first */}
                <th className="px-3.5 py-3 text-center w-28 bg-slate-950/80 text-amber-400">Invoice Num</th>
                <th className="px-3.5 py-3 min-w-[180px] bg-slate-950/80 text-white">Outlet Name</th>
                <th className="px-3.5 py-3 text-right w-28 bg-slate-950/80 text-white">Amount Value</th>
                <th className="px-3.5 py-3 text-right w-28 bg-slate-950/80 text-white">Balance Amount</th>

                {/* Deep Backend Information Columns */}
                <th className="px-3 py-3 w-32">Territory / Area</th>
                <th className="px-3 py-3 w-32">Salesman</th>
                <th className="px-3 py-3 text-center w-24">Date &amp; Age</th>
                <th className="px-3 py-3 text-right w-28">Collected Total</th>
                <th className="px-3 py-3 text-right w-28 text-rose-300">Return / Exp</th>
                <th className="px-3 py-3 text-center w-28">Payment Mode</th>
                <th className="px-3 py-3 text-center w-28">Audit Status</th>
                <th className="px-3 py-3 min-w-[160px]">Admin Notes</th>
                <th className="px-3 py-3 text-center w-28">Driver Delivery</th>
                <th className="px-3 py-3 text-center w-20">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-10 text-center text-slate-400 text-xs">
                    No matching records found in the deep information store.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => {
                  const isPaid = r.balanceAmount <= 0;
                  const invoiceNumOnly = r.invoiceNum.replace(/\D/g, '') || r.invoiceNum;

                  return (
                    <tr
                      key={r.billId}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        r.isCreditBreach
                          ? 'bg-red-50/20'
                          : isPaid
                          ? 'bg-emerald-50/10'
                          : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50/40'
                      }`}
                      onClick={() => setSelectedDeepRecord(r)}
                    >
                      {/* 1. Invoice Num */}
                      <td className="px-3.5 py-2.5 text-center font-mono font-black text-blue-900 bg-blue-50/30">
                        {invoiceNumOnly}
                        {r.isOldBill && (
                          <span className="block text-[9px] font-sans font-bold text-amber-800 bg-amber-100 rounded px-1 mt-0.5">
                            OLD BILL
                          </span>
                        )}
                      </td>

                      {/* 2. Outlet Name */}
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">
                        <div>{r.outletName}</div>
                        {r.isCreditBreach && (
                          <div className="text-[10px] text-red-700 font-bold flex items-center gap-0.5 mt-0.5">
                            <AlertOctagon className="w-3 h-3 text-red-600" />
                            <span>Credit Breach &gt;30d</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Amount Value */}
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800">
                        ₹{r.amountValue.toLocaleString()}
                      </td>

                      {/* 4. Balance Amount */}
                      <td className="px-3.5 py-2.5 text-right font-mono font-black">
                        {isPaid ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                            ₹0 (CLEARED)
                          </span>
                        ) : (
                          <span className={r.isCreditBreach ? 'text-red-700 font-extrabold' : 'text-amber-800'}>
                            ₹{r.balanceAmount.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* 5. Territory / Area */}
                      <td className="px-3 py-2.5 text-slate-700 font-medium">
                        <div className="font-semibold text-[11px] truncate max-w-[130px]">{r.areaName}</div>
                        <div className="text-[10px] font-mono text-slate-400">ID: {r.areaId}</div>
                      </td>

                      {/* 6. Salesman */}
                      <td className="px-3 py-2.5 text-slate-700 font-medium">
                        <div className="font-semibold text-[11px]">{r.salesmanName}</div>
                        {r.salesmanId && <div className="text-[10px] font-mono text-slate-400">({r.salesmanId})</div>}
                      </td>

                      {/* 7. Date & Age */}
                      <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                        <div className="text-[11px]">{r.dateIssued}</div>
                        <div className={`text-[10px] font-bold ${r.daysOld > 30 ? 'text-red-600' : 'text-slate-400'}`}>
                          {r.daysOld}d old
                        </div>
                      </td>

                      {/* 8. Collected Total */}
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                        {r.totalCollected > 0 ? `₹${r.totalCollected.toLocaleString()}` : '—'}
                      </td>

                      {/* 9. Return / Expiry Deductions */}
                      <td className="px-3 py-2.5 text-right font-mono">
                        {r.totalReturns > 0 ? (
                          <div>
                            <span className="font-bold text-rose-700">-₹{r.totalReturns.toLocaleString()}</span>
                            {r.returnReasons && (
                              <div className="text-[9px] text-slate-500 font-sans truncate max-w-[100px] ml-auto">
                                {r.returnReasons}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 10. Payment Mode */}
                      <td className="px-3 py-2.5 text-center">
                        {r.latestPaymentMode !== '—' ? (
                          <span className="uppercase font-mono font-bold text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded">
                            {r.latestPaymentMode}
                            {r.latestChequeOrUtr ? ` #${r.latestChequeOrUtr}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 11. Audit Status */}
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            r.auditStatus === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : r.auditStatus === 'Flagged'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : r.auditStatus === 'Pending Review'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.auditStatus}
                        </span>
                      </td>

                      {/* 12. Admin Notes */}
                      <td className="px-3 py-2.5 text-slate-600 italic truncate max-w-[180px]">
                        {r.adminNotes || '—'}
                      </td>

                      {/* 13. Driver Delivery */}
                      <td className="px-3 py-2.5 text-center text-[11px]">
                        {r.driverAssignment ? (
                          <div className="font-medium text-blue-900">
                            <span className="font-bold">{r.driverAssignment.driverName}</span>
                            <span className="block text-[10px] text-slate-500">
                              {r.driverAssignment.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 14. Action View */}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDeepRecord(r);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded text-[11px] font-semibold text-slate-700 transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Record 360-degree Detail Modal / Drawer */}
      {selectedDeepRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    Deep Information: Invoice #{selectedDeepRecord.invoiceNum}
                  </h3>
                  <div className="text-xs text-slate-300">
                    {selectedDeepRecord.outletName} • {selectedDeepRecord.areaName} ({selectedDeepRecord.areaId})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeepRecord(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Primary 4 values highlighted */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-blue-50/60 p-3 rounded-lg border border-blue-200">
                <div>
                  <span className="text-[10px] text-blue-900 font-bold uppercase">Invoice Num</span>
                  <div className="font-mono font-black text-sm text-blue-950 mt-0.5">
                    {selectedDeepRecord.invoiceNum}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-blue-900 font-bold uppercase">Outlet Name</span>
                  <div className="font-bold text-xs text-blue-950 truncate mt-0.5">
                    {selectedDeepRecord.outletName}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-blue-900 font-bold uppercase">Amount Value</span>
                  <div className="font-mono font-black text-sm text-slate-900 mt-0.5">
                    ₹{selectedDeepRecord.amountValue.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-blue-900 font-bold uppercase">Balance Amount</span>
                  <div className="font-mono font-black text-sm text-emerald-800 mt-0.5">
                    ₹{selectedDeepRecord.balanceAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Complete Backend Detail Attributes */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wide">
                  Backend Attributes &amp; Territory Routing
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500">Route / Area:</span>{' '}
                    <strong className="text-slate-900">{selectedDeepRecord.areaName} ({selectedDeepRecord.areaId})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned Salesman:</span>{' '}
                    <strong className="text-slate-900">{selectedDeepRecord.salesmanName || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Date Invoiced:</span>{' '}
                    <strong className="font-mono text-slate-900">{selectedDeepRecord.dateIssued} ({selectedDeepRecord.daysOld} days)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Credit Policy:</span>{' '}
                    <span className={`font-bold ${selectedDeepRecord.isCreditBreach ? 'text-red-700' : 'text-emerald-700'}`}>
                      {selectedDeepRecord.isCreditBreach ? 'Breach >30 Days' : 'Within Standard Term'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Returns Deducted:</span>{' '}
                    <strong className="text-rose-700 font-mono">₹{selectedDeepRecord.totalReturns.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Audit Status:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedDeepRecord.auditStatus}</span>
                  </div>
                </div>
              </div>

              {/* Deduction History / Chronological Append-Only Log */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wide">
                  Transaction &amp; Deduction History ({selectedDeepRecord.collections.length} entries)
                </h4>
                {selectedDeepRecord.collections.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded border border-slate-200 text-center text-slate-400">
                    No collection transactions logged yet for this invoice.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDeepRecord.collections.map((c: CollectionHistoryEntry) => (
                      <div
                        key={c.collectionId}
                        className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>₹{c.amountCollected.toLocaleString()}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {c.paymentMode}
                            </span>
                            {c.verificationStatus && (
                              <span
                                className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                                  c.verificationStatus === 'Verified'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.verificationStatus === 'Flagged'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {c.verificationStatus}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Collected by: <strong>{c.salesmanName}</strong> on <span className="font-mono">{c.collectionDate}</span> • Balance After: <span className="font-mono font-semibold">₹{c.runningBalanceAfter.toLocaleString()}</span>
                          </div>
                          {c.returnAmount ? (
                            <div className="text-[11px] text-rose-700 mt-0.5">
                              Return deduction: -₹{c.returnAmount.toLocaleString()} ({c.returnReason || 'Reason not recorded'})
                            </div>
                          ) : null}
                          {c.adminNotes && (
                            <div className="text-[11px] text-slate-600 italic mt-0.5">
                              Audit Note: {c.adminNotes}
                            </div>
                          )}
                        </div>

                        <div className="text-right text-[10px] font-mono text-slate-400">
                          {c.collectionId}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedDeepRecord(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
