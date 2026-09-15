import React, { useState, useMemo } from 'react';
import { Salesman, CollectionHistoryEntry, CashHandoverEntry, Bill, Area } from '../types';
import { getTodayDateStr } from '../data/initialData';
import { DeepInformationTable } from './DeepInformationTable';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Filter,
  Check,
  Clock,
  MapPin,
  Lock,
  Edit2,
  X,
  History,
  ShieldAlert,
  Table as TableIcon,
} from 'lucide-react';

interface AdminVerificationTabProps {
  salesmen: Salesman[];
  collectionHistory: CollectionHistoryEntry[];
  cashHandovers: CashHandoverEntry[];
  bills: Bill[];
  areas?: Area[];
  onVerifyCollection: (collectionId: string, status: 'Verified' | 'Flagged', adminNotes: string) => void;
  onVerifyHandover: (salesmanId: string, handoverDate: string, status: 'Verified' | 'Flagged', adminNotes: string) => void;
  onAdminEditCollection?: (collectionId: string, newAmount: number, adminReason: string) => void;
}

export const AdminVerificationTab: React.FC<AdminVerificationTabProps> = ({
  salesmen,
  collectionHistory,
  cashHandovers,
  bills,
  areas = [],
  onVerifyCollection,
  onVerifyHandover,
  onAdminEditCollection,
}) => {
  const [viewMode, setViewMode] = useState<'standard' | 'deep'>('standard');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});
  const [handoverNote, setHandoverNote] = useState<string>('Cash received in office and verified against receipts');
  
  // Admin Edit Collection Modal state (Requirement 5)
  const [editingCollection, setEditingCollection] = useState<CollectionHistoryEntry | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  // Filter collections with Area awareness and sort in the EXACT salesman travel sequence
  const filteredCollections = useMemo(() => {
    const list = collectionHistory.filter(c => {
      if (selectedSalesmanId !== 'all' && c.salesmanId !== selectedSalesmanId) return false;
      if (selectedDate && c.collectionDate !== selectedDate) return false;
      
      // Area filter
      if (selectedAreaId !== 'all') {
        const bill = bills.find(b => b.billId === c.billId || b.billNumber === c.billNumber);
        const effectiveArea = c.areaId || bill?.areaId;
        if (effectiveArea !== selectedAreaId) return false;
      }

      const currentStatus = c.verificationStatus || 'Pending Review';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;
      return true;
    });

    // Sort by salesman route travel sequence (Stop 1, Stop 2...) so Admin's list matches the physical bills stack
    return [...list].sort((a, b) => (a.travelSequence ?? 9999) - (b.travelSequence ?? 9999));
  }, [collectionHistory, selectedSalesmanId, selectedDate, selectedAreaId, bills, statusFilter]);

  // Filter handovers
  const filteredHandovers = cashHandovers.filter(h => {
    if (selectedSalesmanId !== 'all' && h.salesmanId !== selectedSalesmanId) return false;
    if (selectedDate && h.handoverDate !== selectedDate) return false;
    return true;
  });

  const totalCollectedInView = filteredCollections.reduce((sum, c) => sum + c.amountCollected, 0);
  const totalHandedInView = filteredHandovers.reduce((sum, h) => sum + h.amountHanded, 0);
  const difference = totalHandedInView - totalCollectedInView;

  const handleVerifyAll = (status: 'Verified' | 'Flagged') => {
    filteredCollections.forEach(c => {
      onVerifyCollection(
        c.collectionId,
        status,
        activeNotes[c.collectionId] || (status === 'Verified' ? 'Approved by Admin' : 'Flagged during evening audit')
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Control Header */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Area Filter */}
            {areas.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600" /> Area Filter:
                </label>
                <select
                  value={selectedAreaId}
                  onChange={e => setSelectedAreaId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white min-w-[170px]"
                >
                  <option value="all">All Territory Areas</option>
                  {areas.map(a => (
                    <option key={a.areaId} value={a.areaId}>
                      {a.areaId} - {a.areaName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Salesman Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Salesman to Audit:
              </label>
              <select
                value={selectedSalesmanId}
                onChange={e => setSelectedSalesmanId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
              >
                <option value="all">All Salesmen ({salesmen.length})</option>
                {salesmen.map(s => (
                  <option key={s.salesmanId} value={s.salesmanId}>
                    {s.salesmanId} — {s.salesmanName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Entry Date:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 rounded"
                  >
                    All Dates
                  </button>
                )}
              </div>
            </div>

            {/* Verification Status Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Review Status:
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Verified">Verified / Approved</option>
                <option value="Flagged">Flagged</option>
              </select>
            </div>
          </div>

          {/* Quick Bulk Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVerifyAll('Verified')}
              disabled={filteredCollections.length === 0}
              className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve All in View
            </button>
            <button
              onClick={() => handleVerifyAll('Flagged')}
              disabled={filteredCollections.length === 0}
              className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:bg-slate-200 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Flag All in View
            </button>
          </div>
        </div>
      </div>

      {/* Audit Reconciliation Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Logged Bill Collections</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{totalCollectedInView.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {filteredCollections.length} collection entries logged
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Physical Cash Handed Over</div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            ₹{totalHandedInView.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {filteredHandovers.length} cash handover submissions
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Audit Discrepancy</div>
          <div
            className={`text-2xl font-black mt-1 ${
              difference === 0
                ? 'text-emerald-600'
                : difference < 0
                ? 'text-red-600'
                : 'text-amber-600'
            }`}
          >
            {difference === 0 ? '₹0.00 (Balanced)' : `${difference < 0 ? '-' : '+'}₹${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {difference === 0
              ? 'Exact match between cash and entries'
              : difference < 0
              ? 'WARNING: Cash short by this amount'
              : 'Excess cash handed over'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Verification Status</div>
          <div className="text-sm font-bold text-slate-800 mt-2">
            {filteredCollections.filter(c => c.verificationStatus === 'Verified').length} of{' '}
            {filteredCollections.length} Verified
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
            {filteredCollections.filter(c => c.verificationStatus === 'Flagged').length} Flagged with issues
          </div>
        </div>
      </div>

      {/* Evening Handover Proof Submissions Card */}
      {filteredHandovers.length > 0 && (
        <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <div>
              <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Salesman Evening Handover Proof Submissions
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Review and confirm physical note counts, online UPI transactions, and cheques submitted by salesmen.
              </p>
            </div>
            <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Admin Confirmation Queue ({filteredHandovers.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {filteredHandovers.map(h => {
              const currentStatus = h.verificationStatus || 'Pending Review';
              const d = h.denominations || {};

              // Find collections logged by this salesman on this date
              const salesmanCollections = collectionHistory.filter(
                c => c.salesmanId === h.salesmanId && c.collectionDate === h.handoverDate
              );
              const systemCollectedAmt = salesmanCollections.reduce((sum, c) => sum + c.amountCollected, 0);
              const nilVisits = salesmanCollections.filter(c => c.isNilPayment);
              const variance = h.amountHanded - systemCollectedAmt;

              return (
                <div key={`${h.salesmanId}-${h.handoverDate}`} className="py-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-sm">{h.salesmanName}</span>
                        <span className="font-mono text-slate-400 font-normal">({h.salesmanId})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            currentStatus === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : currentStatus === 'Flagged'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Date: <span className="font-mono font-semibold text-slate-700">{h.handoverDate}</span> • 
                        Total Proof Submitted:{' '}
                        <span className="font-black text-blue-900 font-mono text-xs">
                          ₹{h.amountHanded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {' '}• System Logged:{' '}
                        <span className="font-mono font-semibold text-slate-700">₹{systemCollectedAmt.toLocaleString()}</span>
                        {' '}(Variance:{' '}
                        <span className={`font-mono font-bold ${Math.abs(variance) < 0.01 ? 'text-emerald-700' : variance > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                          {variance >= 0 ? `+₹${variance.toLocaleString()}` : `-₹${Math.abs(variance).toLocaleString()}`}
                        </span>)
                      </div>
                      {h.adminNotes && (
                        <div className="text-[11px] text-slate-600 italic">
                          Admin Remark: <span className="font-medium text-slate-800">{h.adminNotes}</span>
                          {h.verifiedAt && <span className="text-slate-400 font-mono text-[10px] ml-1">({h.verifiedAt})</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onVerifyHandover(h.salesmanId, h.handoverDate, 'Verified', 'Verified & confirmed in office cash counter')}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm &amp; Approve Proof
                      </button>
                      <button
                        onClick={() => onVerifyHandover(h.salesmanId, h.handoverDate, 'Flagged', 'Discrepancy in denomination or online proof')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 hover:bg-red-200 text-red-800 flex items-center gap-1.5 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Flag Discrepancy
                      </button>
                    </div>
                  </div>

                  {/* Proof Breakdown Pills (Cash, Online, Cheques, NIL visits) */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-500">Physical Cash:</span>{' '}
                        <span className="font-mono font-bold text-slate-800">₹{(h.cashAmount ?? h.amountHanded).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Online/UPI:</span>{' '}
                        <span className="font-mono font-bold text-purple-700">₹{(h.onlineAmount ?? 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Cheques:</span>{' '}
                        <span className="font-mono font-bold text-blue-700">₹{(h.chequeAmount ?? 0).toLocaleString()}</span>
                      </div>
                      {nilVisits.length > 0 && (
                        <div className="text-amber-800 font-medium">
                          <span>🛑 {nilVisits.length} NIL Visit{nilVisits.length === 1 ? '' : 's'} Reported</span>
                        </div>
                      )}
                    </div>

                    {/* Detailed Breakdown Tags */}
                    <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                      {h.denominations && (
                        <>
                          {d.d500 ? <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">500×{d.d500}</span> : null}
                          {d.d200 ? <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">200×{d.d200}</span> : null}
                          {d.d100 ? <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">100×{d.d100}</span> : null}
                          {d.d50 ? <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">50×{d.d50}</span> : null}
                          {d.d20 ? <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">20×{d.d20}</span> : null}
                          {d.d10 ? <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">10×{d.d10}</span> : null}
                          {d.coins ? <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">Coins:₹{d.coins}</span> : null}
                        </>
                      )}

                      {h.onlinePayments && h.onlinePayments.length > 0 && (
                        h.onlinePayments.map((op, idx) => (
                          <span key={idx} className="bg-purple-100 border border-purple-200 text-purple-900 px-1.5 py-0.5 rounded font-bold">
                            📱 {op.paymentMode.toUpperCase()}: ₹{op.amount} {op.utrNumber ? `(Ref: ${op.utrNumber})` : ''}
                          </span>
                        ))
                      )}

                      {h.cheques && h.cheques.length > 0 && (
                        h.cheques.map((ch, idx) => (
                          <span key={idx} className="bg-blue-100 border border-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                            🏦 Chq #{ch.chequeNumber}: ₹{ch.amount} ({ch.bankName || 'Bank'})
                          </span>
                        ))
                      )}
                    </div>

                    {/* NIL Outlets detail if any */}
                    {nilVisits.length > 0 && (
                      <div className="pt-1 text-[11px] text-amber-900 border-t border-slate-200/50 flex flex-wrap gap-2">
                        <span className="font-semibold">NIL Outlets:</span>
                        {nilVisits.map(nv => (
                          <span key={nv.collectionId} className="bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px]">
                            {nv.shopName} ({nv.nilReason || nv.notes || 'No payment'})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Salesman Entries Verification Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Salesman Collection Entries Verification Table ({filteredCollections.length})
            </h3>
            <p className="text-xs text-slate-500">
              Admin audit log: review individual bill collection entries submitted by salesmen.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('standard')}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  viewMode === 'standard'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                4-Column Standard
              </button>
              <button
                onClick={() => setViewMode('deep')}
                className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'deep'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Deep Information Table
              </button>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 hidden md:inline-block">
              Storage: grb_data.xlsx [CollectionHistory]
            </span>
          </div>
        </div>

        {viewMode === 'deep' ? (
          <div className="p-4">
            <DeepInformationTable
              bills={bills}
              collectionHistory={collectionHistory}
              salesmen={salesmen}
              areas={areas}
            />
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No collection entries found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">📍 Travel Sequence Order:</span>
                <span>Entries arranged in the exact order of the salesman&apos;s physical collection route.</span>
              </div>
              <div className="font-mono text-slate-500">
                {selectedSalesmanId !== 'all' ? `Salesman: ${selectedSalesmanId}` : 'All Salesmen'} |{' '}
                {selectedAreaId !== 'all' ? `Route: ${selectedAreaId}` : 'All Routes'}
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Invoice Num</th>
                  <th className="px-4 py-3">Outlet Name</th>
                  <th className="px-4 py-3 text-right">Amount Value (₹)</th>
                  <th className="px-4 py-3 text-right">Balance Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCollections.map((c, index) => {
                  const status = c.verificationStatus || 'Pending Review';
                  const noteVal = activeNotes[c.collectionId] ?? c.adminNotes ?? '';
                  const invoiceNum = c.billNumber.replace(/\D/g, '') || c.billNumber;
                  const retAmt = c.returnAmount || 0;

                  return (
                    <tr key={c.collectionId} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Invoice Num */}
                      <td className="px-4 py-3 font-mono font-black text-blue-900 text-xs">
                        {invoiceNum}
                        <div className="text-[10px] text-slate-400 font-normal">
                          Stop #{c.travelSequence ?? index + 1}
                        </div>
                      </td>

                      {/* 2. Outlet Name */}
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="font-semibold text-slate-900">{c.shopName}</div>
                        <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                          <span>{c.collectionDate}</span>
                          {c.salesmanName && <span>• {c.salesmanName}</span>}
                          {retAmt > 0 && (
                            <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Return: -₹{retAmt.toLocaleString()} {c.returnReason ? `(${c.returnReason})` : ''}
                            </span>
                          )}
                          {c.isNilPayment && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold">
                              🛑 NIL: {c.nilReason || 'No payment'}
                            </span>
                          )}
                          {!c.isNilPayment && c.paymentMode && c.paymentMode !== 'cash' && (
                            <span className="text-purple-700 font-semibold uppercase">
                              {c.paymentMode} {c.chequeOrUtrNumber ? `(${c.chequeOrUtrNumber})` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Amount Value */}
                      <td className="px-4 py-3 text-right font-black text-sm">
                        {c.isNilPayment ? (
                          <span className="text-amber-700 font-mono">₹0.00</span>
                        ) : (
                          <div className="text-emerald-700 font-mono">
                            ₹{c.amountCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        )}
                        {c.adminAdjusted && (
                          <div className="text-[10px] text-amber-700 font-normal flex items-center justify-end gap-0.5">
                            <History className="w-2.5 h-2.5" />
                            <span>Orig: ₹{c.originalSalesmanAmount?.toLocaleString()}</span>
                          </div>
                        )}
                      </td>

                      {/* 4. Balance Amount & Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                            <span>₹{c.runningBalanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            {c.runningBalanceAfter === 0 && (
                              <span className="text-[9px] font-sans font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                                CLEARED
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                status === 'Verified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : status === 'Flagged'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {status}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="Audit note"
                              value={noteVal}
                              onChange={e =>
                                setActiveNotes(prev => ({
                                  ...prev,
                                  [c.collectionId]: e.target.value,
                                }))
                              }
                              className="w-28 px-1.5 py-0.5 text-[11px] rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() =>
                                onVerifyCollection(
                                  c.collectionId,
                                  'Verified',
                                  noteVal || 'Verified by Admin'
                                )
                              }
                              className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-0.5 shadow-2xs cursor-pointer"
                              title="Mark Verified / Approved"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() =>
                                onVerifyCollection(
                                  c.collectionId,
                                  'Flagged',
                                  noteVal || 'Flagged for discrepancy'
                                )
                              }
                              className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 hover:bg-red-200 text-red-800 flex items-center gap-0.5 cursor-pointer"
                              title="Flag as problematic"
                            >
                              <AlertTriangle className="w-3 h-3" />
                            </button>
                            {onAdminEditCollection && (
                              <button
                                onClick={() => {
                                  setEditingCollection(c);
                                  setEditAmount(c.amountCollected.toString());
                                  setEditReason(c.adminNotes || '');
                                }}
                                className="px-1.5 py-0.5 text-xs font-semibold rounded bg-purple-100 hover:bg-purple-200 text-purple-800 flex items-center gap-0.5 cursor-pointer"
                                title="Edit Salesman Collection (Reflects in Admin Audit Log)"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
                <tr>
                  <td className="px-4 py-3 font-mono font-black text-blue-900">
                    TOTAL ({filteredCollections.length} Bills)
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600">
                    All Route Entries
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-black text-sm text-emerald-700">
                    ₹{totalCollectedInView.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                    ₹{filteredCollections.reduce((sum, c) => sum + (c.runningBalanceAfter || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Admin Edit Modal (Requirement 5: any changes reflect in admin audit with immutable salesman record) */}
      {editingCollection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-slate-900 text-base">Admin Adjustment &amp; Audit</h3>
              </div>
              <button
                onClick={() => setEditingCollection(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Bill / Invoice:</span>
                  <span className="font-bold text-slate-900">
                    {editingCollection.shopName} (#{editingCollection.billNumber})
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Salesman Entry (Immutable):</span>
                  <span className="font-bold text-blue-700">
                    {editingCollection.salesmanName} ({editingCollection.salesmanId})
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Recorded Amount:</span>
                  <span className="font-bold text-emerald-700">
                    ₹{editingCollection.amountCollected.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Collection Date:</span>
                  <span className="text-slate-900">{editingCollection.collectionDate}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Correct / Adjusted Amount (₹):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Admin Adjustment (Audit Log):
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Salesman reported error in physical cash count / shopkeeper partial cheque correction"
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-purple-900 text-[11px] leading-relaxed">
                <strong>Audit Notice:</strong> Salesman's original entry of ₹{editingCollection.amountCollected} will be permanently archived in the audit record. The invoice balance and collection logs will update automatically.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCollection(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseFloat(editAmount);
                    if (!isNaN(parsed) && parsed >= 0 && onAdminEditCollection) {
                      onAdminEditCollection(editingCollection.collectionId, parsed, editReason);
                      setEditingCollection(null);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 rounded-lg shadow-sm"
                >
                  Save &amp; Record Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
