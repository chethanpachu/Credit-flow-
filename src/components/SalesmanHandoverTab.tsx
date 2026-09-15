import React, { useState } from 'react';
import { Salesman, CollectionHistoryEntry, CashHandoverEntry, DenominationBreakdown, ChequeEntry, OnlinePaymentEntry } from '../types';
import { getTodayDateStr } from '../data/initialData';
import { DenominationCounter, calculateCashTotal } from './DenominationCounter';
import { Banknote, CheckCircle2, AlertTriangle, Clock, ArrowRight, ShieldCheck, FileText, Check, Smartphone } from 'lucide-react';

interface SalesmanHandoverTabProps {
  salesmanId: string;
  salesmanName: string;
  collectionHistory: CollectionHistoryEntry[];
  cashHandovers: CashHandoverEntry[];
  onSubmitHandover: (
    amount: number,
    date: string,
    denominations?: DenominationBreakdown,
    cheques?: ChequeEntry[],
    onlinePayments?: OnlinePaymentEntry[],
    cashAmount?: number,
    chequeAmount?: number,
    onlineAmount?: number
  ) => void;
}

export const SalesmanHandoverTab: React.FC<SalesmanHandoverTabProps> = ({
  salesmanId,
  salesmanName,
  collectionHistory,
  cashHandovers,
  onSubmitHandover,
}) => {
  const [handoverDate, setHandoverDate] = useState<string>(getTodayDateStr());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Denominations & Cheques & Online state
  const [denominations, setDenominations] = useState<DenominationBreakdown>({
    d500: 0,
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    coins: 0,
  });
  const [cheques, setCheques] = useState<ChequeEntry[]>([]);
  const [onlinePayments, setOnlinePayments] = useState<OnlinePaymentEntry[]>([]);
  const [totalCash, setTotalCash] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<number>(0);

  // Filter collections for this salesman today
  const todayCollections = collectionHistory.filter(
    c => c.salesmanId === salesmanId && c.collectionDate === handoverDate
  );

  const totalCollectedToday = todayCollections.reduce((sum, c) => sum + c.amountCollected, 0);
  const nilVisitsToday = todayCollections.filter(c => c.isNilPayment);

  // My handovers
  const myHandovers = cashHandovers.filter(h => h.salesmanId === salesmanId);
  const todayHandover = myHandovers.find(h => h.handoverDate === handoverDate);

  const handleDenominationChange = (
    newDenoms: DenominationBreakdown,
    cash: number,
    newCheques: ChequeEntry[],
    newOnline: OnlinePaymentEntry[],
    total: number
  ) => {
    setDenominations(newDenoms);
    setTotalCash(cash);
    setCheques(newCheques);
    setOnlinePayments(newOnline);
    setGrandTotal(total);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (grandTotal <= 0) {
      alert('Please enter at least one denomination count, cheque amount, or online payment.');
      return;
    }

    const chequeAmt = cheques.reduce((sum, c) => sum + (c.amount || 0), 0);
    const onlineAmt = onlinePayments.reduce((sum, o) => sum + (o.amount || 0), 0);
    onSubmitHandover(grandTotal, handoverDate, denominations, cheques, onlinePayments, totalCash, chequeAmt, onlineAmt);
    
    setSuccessMsg(
      `✔ Submitted ₹${grandTotal.toLocaleString()} Handover Proof (Cash: ₹${totalCash.toLocaleString()} + Online: ₹${onlineAmt.toLocaleString()} + Cheques: ₹${chequeAmt.toLocaleString()}) for ${handoverDate} to Admin for Confirmation!`
    );
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Today's System Collections</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{totalCollectedToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {todayCollections.length} bill collection{todayCollections.length === 1 ? '' : 's'} logged today
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Entered Total Handover Proof</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Cash: ₹{totalCash.toLocaleString()} | Online: ₹{onlinePayments.reduce((s, o) => s + (o.amount || 0), 0).toLocaleString()} | Chq: ₹{cheques.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Reconciliation Variance</div>
          <div
            className={`text-2xl font-black mt-1 ${
              Math.abs(grandTotal - totalCollectedToday) < 0.01
                ? 'text-emerald-600'
                : grandTotal < totalCollectedToday
                ? 'text-red-600'
                : 'text-amber-600'
            }`}
          >
            ₹{(grandTotal - totalCollectedToday).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {Math.abs(grandTotal - totalCollectedToday) < 0.01
              ? '✔ Exact match with bill collections'
              : grandTotal > totalCollectedToday
              ? 'Surplus / Excess cash'
              : 'Shortage / Pending bills'}
            {nilVisitsToday.length > 0 && ` • (${nilVisitsToday.length} NIL visits reported)`}
          </div>
        </div>
      </div>

      {/* Admin Confirmation Status Banner for Today's Handover */}
      {todayHandover && (
        <div
          className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            todayHandover.verificationStatus === 'Verified'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : todayHandover.verificationStatus === 'Flagged'
              ? 'bg-red-50 border-red-300 text-red-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                todayHandover.verificationStatus === 'Verified'
                  ? 'bg-emerald-600 text-white'
                  : todayHandover.verificationStatus === 'Flagged'
                  ? 'bg-red-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>Proof Status for {handoverDate}:</span>
                <span className="uppercase font-black text-xs px-2 py-0.5 rounded-full bg-white/80 border">
                  {todayHandover.verificationStatus || 'Pending Review'}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {todayHandover.verificationStatus === 'Verified'
                  ? `Confirmed and signed-off by Office Admin${todayHandover.verifiedAt ? ` at ${todayHandover.verifiedAt}` : ''}.`
                  : todayHandover.verificationStatus === 'Flagged'
                  ? `Admin flagged discrepancy: "${todayHandover.adminNotes || 'Audit issue detected'}"`
                  : 'Handover proof is submitted. Awaiting Admin verification in the office.'}
              </p>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <div className="text-slate-500 text-[11px]">Submitted Amount:</div>
            <div className="text-base font-black">
              ₹{todayHandover.amountHanded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Handover Date & Title Bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600" />
            Evening Handover Proof: Cash Denominations, Online &amp; Cheques
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter physical currency note counts, online payment UPI/UTR references, and received cheques for Admin confirmation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Handover Date:</label>
          <input
            type="date"
            value={handoverDate}
            onChange={e => setHandoverDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono font-bold rounded border border-slate-300 bg-white"
          />
          <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono font-semibold">
            Salesman: {salesmanName} ({salesmanId})
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Denomination & Payment Counter Component */}
      <div className="space-y-4">
        <DenominationCounter
          value={denominations}
          cheques={cheques}
          onlinePayments={onlinePayments}
          onChange={handleDenominationChange}
          expectedAmount={totalCollectedToday}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={grandTotal <= 0}
            className="px-6 py-2.5 text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 text-white shadow-md flex items-center gap-2 transition-all"
          >
            <Check className="w-4 h-4" />
            Submit Handover Proof for Admin Confirmation (₹{grandTotal.toLocaleString()})
          </button>
        </div>
      </div>

      {/* History of My Cash Handovers & Admin Verification Status */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              My Handover History &amp; Admin Confirmation Trail
            </h3>
            <span className="text-xs text-slate-500">
              Audit log of all physical currency, online UPI payments, cheques, and Admin confirmations.
            </span>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600">
            {myHandovers.length} records
          </span>
        </div>

        {myHandovers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No cash handover records found for your account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Invoice Num</th>
                  <th className="px-4 py-2.5">Outlet Name</th>
                  <th className="px-4 py-2.5 text-right">Amount Value (₹)</th>
                  <th className="px-4 py-2.5 text-right">Balance Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myHandovers.map(h => {
                  const status = h.verificationStatus || 'Pending Review';
                  return (
                    <tr key={`${h.salesmanId}-${h.handoverDate}`} className="hover:bg-slate-50">
                      {/* 1. Invoice Num */}
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-800">
                        HND-{h.handoverDate}
                      </td>

                      {/* 2. Outlet Name */}
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900">Office Handover — {salesmanName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Cash: ₹{(h.cashAmount ?? h.amountHanded).toLocaleString()} • Online: ₹{(h.onlineAmount ?? 0).toLocaleString()} • Chq: ₹{(h.chequeAmount ?? 0).toLocaleString()}
                        </div>
                      </td>

                      {/* 3. Amount Value */}
                      <td className="px-4 py-2.5 text-right font-black text-emerald-700 font-mono text-sm">
                        ₹{h.amountHanded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 4. Balance Amount */}
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
