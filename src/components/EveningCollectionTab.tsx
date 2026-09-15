import React, { useState, useEffect } from 'react';
import { Salesman, SalesmanArea, Bill, CollectionHistoryEntry, Driver, DriverAssignment } from '../types';
import { getTodayDateStr } from '../data/initialData';
import { Wallet, Check, AlertCircle, Sparkles, Truck, Calendar, Clock, Lock, ShieldCheck } from 'lucide-react';
import { AssignDriverModal } from './AssignDriverModal';

interface EveningCollectionTabProps {
  salesmen: Salesman[];
  salesmanAreas: SalesmanArea[];
  bills: Bill[];
  drivers: Driver[];
  driverAssignments: DriverAssignment[];
  onRecordCollection: (
    billId: string,
    salesmanId: string,
    amountCollected: number,
    collectionDate: string
  ) => void;
  onAssignToDriver: (assignment: Omit<DriverAssignment, 'assignmentId' | 'status' | 'collectedAmount'>) => void;
  recentCollections: CollectionHistoryEntry[];
  lockedSalesmanId?: string; // Strict salesman isolation
}

export const EveningCollectionTab: React.FC<EveningCollectionTabProps> = ({
  salesmen,
  salesmanAreas,
  bills,
  drivers,
  driverAssignments,
  onRecordCollection,
  onAssignToDriver,
  recentCollections,
  lockedSalesmanId,
}) => {
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>(
    lockedSalesmanId || (salesmen.length > 0 ? salesmen[0].salesmanId : '')
  );

  useEffect(() => {
    if (lockedSalesmanId) {
      setSelectedSalesmanId(lockedSalesmanId);
    }
  }, [lockedSalesmanId]);

  const [collectionDate, setCollectionDate] = useState<string>(getTodayDateStr());

  // Input states per bill: { [billId]: string }
  const [collectionInputs, setCollectionInputs] = useState<Record<string, string>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Modal for assigning to driver
  const [driverModalBill, setDriverModalBill] = useState<Bill | null>(null);

  // Determine assigned areas for active salesman
  const assignedAreas = salesmanAreas
    .filter(sa => sa.salesmanId === selectedSalesmanId)
    .map(sa => sa.areaId);

  // All bills in assigned territory areas
  const territoryBills = bills.filter(b => assignedAreas.includes(b.areaId));

  // Categorize into the 3 collector tiers:
  // "collection section will be having all the list of amount collected first , next partial amount and then no collection made this will be easier for collector"
  const fullyCollectedBills = territoryBills.filter(b => b.status === 'paid' || b.balance <= 0);
  const partialBills = territoryBills.filter(b => b.balance > 0 && b.balance < b.amount);
  const noCollectionBills = territoryBills.filter(b => b.balance === b.amount);

  // Active view tab in the collection section
  const [collectorTierTab, setCollectorTierTab] = useState<'all' | 'full' | 'partial' | 'uncollected'>('all');

  // Combined ordered list: 1. Full -> 2. Partial -> 3. No Collection
  const orderedBills = [
    ...fullyCollectedBills,
    ...partialBills,
    ...noCollectionBills,
  ];

  const displayedBills =
    collectorTierTab === 'full'
      ? fullyCollectedBills
      : collectorTierTab === 'partial'
      ? partialBills
      : collectorTierTab === 'uncollected'
      ? noCollectionBills
      : orderedBills;

  // Initialize/update default amounts whenever territoryBills changes
  useEffect(() => {
    const initialAmounts: Record<string, string> = {};
    territoryBills.forEach(b => {
      if (b.balance > 0) {
        initialAmounts[b.billId] = b.balance.toString();
      }
    });
    setCollectionInputs(initialAmounts);
  }, [selectedSalesmanId, bills]);

  const handleInputChange = (billId: string, val: string) => {
    setCollectionInputs(prev => ({
      ...prev,
      [billId]: val,
    }));
  };

  const handleSetFull = (billId: string, balance: number) => {
    setCollectionInputs(prev => ({
      ...prev,
      [billId]: balance.toString(),
    }));
  };

  const handleCollectSingle = (bill: Bill) => {
    setFeedbackMsg(null);
    const inputVal = collectionInputs[bill.billId];
    const amount = parseFloat(inputVal);

    if (isNaN(amount) || amount <= 0) {
      setFeedbackMsg({
        text: `Please enter a valid positive collection amount for Bill #${bill.billNumber}.`,
        isError: true,
      });
      return;
    }

    if (amount > bill.balance) {
      setFeedbackMsg({
        text: `REJECTED: Entered amount (₹${amount.toLocaleString()}) exceeds current bill balance of ₹${bill.balance.toLocaleString()}!`,
        isError: true,
      });
      return;
    }

    onRecordCollection(bill.billId, selectedSalesmanId, amount, collectionDate);
    const newBal = bill.balance - amount;
    const isPaid = newBal <= 0;

    setFeedbackMsg({
      text: `Successfully collected ₹${amount.toLocaleString()} for Bill #${bill.billNumber} (${bill.shopName}). ${
        isPaid ? 'Bill is now fully PAID and cleared!' : `Remaining balance: ₹${newBal.toLocaleString()}`
      }`,
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const currentSalesman = salesmen.find(s => s.salesmanId === selectedSalesmanId);
  const totalDues = territoryBills.reduce((acc, b) => acc + b.balance, 0);
  const totalOriginal = territoryBills.reduce((acc, b) => acc + b.amount, 0);
  const totalCollectedSoFar = totalOriginal - totalDues;

  const totalFullyCollected = fullyCollectedBills.reduce((acc, b) => acc + b.amount, 0);
  const partialCollectedAmt = partialBills.reduce((acc, b) => acc + (b.amount - b.balance), 0);
  const partialBalanceAmt = partialBills.reduce((acc, b) => acc + b.balance, 0);
  const noCollectionAmt = noCollectionBills.reduce((acc, b) => acc + b.balance, 0);

  return (
    <div className="space-y-6">
      {/* Salesman & Date Selection Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Salesman:
              </label>
              {lockedSalesmanId ? (
                <div className="px-3 py-2 text-xs font-bold rounded border border-blue-200 bg-blue-50 text-blue-900 min-w-[200px]">
                  {currentSalesman?.salesmanId} — {currentSalesman?.salesmanName} (Locked Account)
                </div>
              ) : (
                <select
                  value={selectedSalesmanId}
                  onChange={e => setSelectedSalesmanId(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
                >
                  {salesmen.map(s => (
                    <option key={s.salesmanId} value={s.salesmanId}>
                      {s.salesmanId} — {s.salesmanName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Collection Date:
              </label>
              <input
                type="date"
                value={collectionDate}
                onChange={e => setCollectionDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-4">
              <span className="text-xs text-slate-500 font-medium">
                Assigned Territory Areas:{' '}
                <span className="font-semibold text-slate-800">
                  {assignedAreas.join(', ') || 'None assigned'}
                </span>
              </span>
            </div>
          </div>

          <div className="text-right flex items-center gap-4">
            <div className="text-left bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <div className="text-[11px] text-emerald-700 font-medium">Collected So Far:</div>
              <div className="text-base font-black text-emerald-800">
                ₹{totalCollectedSoFar.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-left bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
              <div className="text-[11px] text-amber-700 font-medium">Pending Dues:</div>
              <div className="text-base font-black text-amber-900">
                ₹{totalDues.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collector Tier Summary Cards (Prompt: Amount collected first, next partial amount, then no collection) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tier 1 Card */}
        <button
          onClick={() => setCollectorTierTab(collectorTierTab === 'full' ? 'all' : 'full')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            collectorTierTab === 'full'
              ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              1. Amount Collected (Full)
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {fullyCollectedBills.length} Bills
            </span>
          </div>
          <div className="text-xl font-black text-emerald-700 mt-2">
            ₹{totalFullyCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            Fully paid and cleared bills in territory
          </div>
        </button>

        {/* Tier 2 Card */}
        <button
          onClick={() => setCollectorTierTab(collectorTierTab === 'partial' ? 'all' : 'partial')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            collectorTierTab === 'partial'
              ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              2. Partial Amount Collected
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {partialBills.length} Bills
            </span>
          </div>
          <div className="text-xl font-black text-amber-800 mt-2">
            ₹{partialCollectedAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">
            Remaining due: ₹{partialBalanceAmt.toLocaleString()}
          </div>
        </button>

        {/* Tier 3 Card */}
        <button
          onClick={() => setCollectorTierTab(collectorTierTab === 'uncollected' ? 'all' : 'uncollected')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            collectorTierTab === 'uncollected'
              ? 'border-red-600 bg-red-50/80 ring-2 ring-red-500/20 shadow-xs'
              : 'border-red-200 bg-red-50/30 hover:bg-red-50/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
              3. No Collection Made
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
              {noCollectionBills.length} Bills
            </span>
          </div>
          <div className="text-xl font-black text-red-700 mt-2">
            ₹{noCollectionAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-red-600 mt-1">
            Pending initial collection
          </div>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-md border flex items-center gap-2 text-xs font-medium ${
            feedbackMsg.isError
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedbackMsg.isError ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* COLLECTION SECTION: Amount Collected First, Next Partial Amount, Then No Collection Made */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              Collector View: {currentSalesman?.salesmanName}'s Territory ({territoryBills.length} Bills)
            </h3>
            <p className="text-xs text-slate-500">
              Ordered flow: <strong>1. Amount Collected First</strong> → <strong>2. Next Partial Amount</strong> → <strong>3. No Collection Made</strong>.
            </p>
          </div>

          {/* Quick Segment Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setCollectorTierTab('all')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                collectorTierTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Ordered ({orderedBills.length})
            </button>
            <button
              onClick={() => setCollectorTierTab('full')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                collectorTierTab === 'full'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-800 hover:bg-emerald-100/60'
              }`}
            >
              ✔ 1. Full ({fullyCollectedBills.length})
            </button>
            <button
              onClick={() => setCollectorTierTab('partial')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                collectorTierTab === 'partial'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-800 hover:bg-amber-100/60'
              }`}
            >
              ⚡ 2. Partial ({partialBills.length})
            </button>
            <button
              onClick={() => setCollectorTierTab('uncollected')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                collectorTierTab === 'uncollected'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-red-800 hover:bg-red-100/60'
              }`}
            >
              ⏳ 3. No Collection ({noCollectionBills.length})
            </button>
          </div>
        </div>

        {displayedBills.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No Bills Found in this Category!</p>
            <p className="text-xs text-slate-400">
              Assigned areas: {assignedAreas.join(', ') || 'None'}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {displayedBills.map(bill => {
                  const isFullyPaid = bill.status === 'paid' || bill.balance <= 0;
                  const isPartial = bill.balance > 0 && bill.balance < bill.amount;

                  const inputAmt = collectionInputs[bill.billId] ?? bill.balance.toString();
                  const numAmt = parseFloat(inputAmt) || 0;
                  const isExceeding = numAmt > bill.balance;

                  return (
                    <tr
                      key={bill.billId}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isFullyPaid
                          ? 'bg-emerald-50/20'
                          : isPartial
                          ? 'bg-amber-50/15'
                          : ''
                      }`}
                    >
                      {/* 1. Invoice Num */}
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">
                        {bill.billNumber}
                      </td>

                      {/* 2. Outlet Name */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{bill.shopName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Area: {bill.areaId} • Issued: {bill.dateIssued}
                          {isFullyPaid && <span className="ml-1.5 text-emerald-700 font-bold">✔ Cleared</span>}
                          {isPartial && <span className="ml-1.5 text-amber-700 font-bold">⚡ Partial</span>}
                        </div>
                      </td>

                      {/* 3. Amount Value */}
                      <td className="px-4 py-3 text-right font-black text-slate-900 font-mono text-sm">
                        ₹{bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 4. Balance Amount & Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="font-mono font-bold text-slate-800">
                            {isFullyPaid ? (
                              <span className="text-emerald-700 font-bold">CLEARED (₹0.00)</span>
                            ) : (
                              <span className={isPartial ? 'text-amber-800' : 'text-slate-800'}>
                                ₹{bill.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                          {!isFullyPaid && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                max={bill.balance}
                                value={inputAmt}
                                onChange={e => handleInputChange(bill.billId, e.target.value)}
                                className={`w-20 px-1.5 py-0.5 text-xs font-bold rounded border text-right focus:outline-none focus:ring-1 ${
                                  isExceeding
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-slate-300 focus:ring-blue-500 bg-white text-slate-900'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleSetFull(bill.billId, bill.balance)}
                                className="px-1 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded border border-slate-200"
                                title="Reset to full remaining balance"
                              >
                                Full
                              </button>
                              <button
                                onClick={() => handleCollectSingle(bill)}
                                disabled={isExceeding || numAmt <= 0}
                                className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors shadow-2xs inline-flex items-center gap-0.5"
                                title="Record collection"
                              >
                                <Check className="w-3 h-3" /> Collect
                              </button>
                              <button
                                onClick={() => setDriverModalBill(bill)}
                                className="px-1.5 py-0.5 text-xs font-bold rounded bg-orange-600 hover:bg-orange-500 text-white transition-colors shadow-2xs inline-flex items-center gap-0.5"
                                title="Assign to driver"
                              >
                                <Truck className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {isExceeding && (
                            <span className="text-[10px] text-red-600 font-semibold">Max ₹{bill.balance.toLocaleString()}</span>
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

      {/* Recent Collections Feed in this session */}
      {recentCollections.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recently Logged Collections in this session ({recentCollections.length})
            </h4>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <Lock className="w-3 h-3 text-slate-500" /> Immutable (Admin Audited)
            </span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
            {recentCollections.map(c => (
              <div key={c.collectionId} className="pt-1.5 flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-emerald-700 font-bold">{c.collectionId}</span>
                  <span className="font-semibold text-slate-900">{c.shopName}</span>
                  <span className="font-mono text-slate-500">(Bill #{c.billNumber})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Salesman: {c.salesmanName}</span>
                  <span className="font-bold text-emerald-600">
                    +₹{c.amountCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Bal left: ₹{c.runningBalanceAfter.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Locked
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      <AssignDriverModal
        isOpen={!!driverModalBill}
        onClose={() => setDriverModalBill(null)}
        bill={driverModalBill}
        drivers={drivers}
        salesmanId={selectedSalesmanId}
        salesmanName={currentSalesman?.salesmanName || ''}
        onConfirmAssignment={(data) => {
          onAssignToDriver(data);
          setFeedbackMsg({
            text: `🚚 Assigned Bill #${data.billNumber} (${data.shopName}) to ${data.driverName} for scheduled collection on ${data.scheduledDate}!`,
          });
          setTimeout(() => setFeedbackMsg(null), 5000);
        }}
      />
    </div>
  );
};
