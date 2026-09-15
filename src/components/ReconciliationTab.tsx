import React, { useState } from 'react';
import { Salesman, CollectionHistoryEntry, CashHandoverEntry, DenominationBreakdown, ChequeEntry } from '../types';
import { getTodayDateStr } from '../data/initialData';
import { DenominationCounter, DENOM_VALUES, calculateCashTotal } from './DenominationCounter';
import {
  Calculator,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
  Banknote,
  FileSpreadsheet,
  X,
  FileCheck,
} from 'lucide-react';

interface ReconciliationTabProps {
  salesmen: Salesman[];
  collectionHistory: CollectionHistoryEntry[];
  cashHandovers: CashHandoverEntry[];
  onSaveHandover: (
    salesmanId: string,
    handoverDate: string,
    amount: number,
    denominations?: DenominationBreakdown,
    cheques?: ChequeEntry[],
    cashAmount?: number,
    chequeAmount?: number
  ) => void;
}

export const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
  salesmen,
  collectionHistory,
  cashHandovers,
  onSaveHandover,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [handoverInputs, setHandoverInputs] = useState<Record<string, string>>({});
  const [expandedSalesmanId, setExpandedSalesmanId] = useState<string | null>(null);
  const [denominationModalSalesman, setDenominationModalSalesman] = useState<Salesman | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Temporary denomination editing state when modal is open
  const [modalDenominations, setModalDenominations] = useState<DenominationBreakdown>({
    d500: 0,
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    coins: 0,
  });
  const [modalCheques, setModalCheques] = useState<ChequeEntry[]>([]);
  const [modalTotalCash, setModalTotalCash] = useState<number>(0);
  const [modalGrandTotal, setModalGrandTotal] = useState<number>(0);

  // Filter collections by selectedDate
  const dateCollections = collectionHistory.filter(c => c.collectionDate === selectedDate);

  // Compute reconciliation row per salesman
  const reconciliationData = salesmen.map(s => {
    const sCollections = dateCollections.filter(c => c.salesmanId === s.salesmanId);
    const systemTotal = sCollections.reduce((acc, c) => acc + c.amountCollected, 0);

    // Existing saved handover record for this salesman on this date
    const existingHandover = cashHandovers.find(
      h => h.salesmanId === s.salesmanId && h.handoverDate === selectedDate
    );

    // Current input value in form or saved value
    const currentInputVal =
      handoverInputs[s.salesmanId] !== undefined
        ? handoverInputs[s.salesmanId]
        : existingHandover
        ? existingHandover.amountHanded.toString()
        : '';

    const parsedHandover = parseFloat(currentInputVal) || 0;
    const diff = Math.round((parsedHandover - systemTotal) * 100) / 100;
    const isMatched = Math.abs(diff) < 0.01;

    return {
      salesman: s,
      systemTotal,
      currentInputVal,
      parsedHandover,
      diff,
      isMatched,
      hasHandoverEntered: currentInputVal !== '',
      collections: sCollections,
      handoverRecord: existingHandover,
    };
  });

  const handleHandoverChange = (salesmanId: string, val: string) => {
    setHandoverInputs(prev => ({
      ...prev,
      [salesmanId]: val,
    }));
  };

  const handleOpenDenominationModal = (salesman: Salesman, existingHandover?: CashHandoverEntry) => {
    setDenominationModalSalesman(salesman);
    if (existingHandover && existingHandover.denominations) {
      setModalDenominations({ ...existingHandover.denominations });
      const chqs = existingHandover.cheques ? [...existingHandover.cheques] : [];
      setModalCheques(chqs);
      const cash = calculateCashTotal(existingHandover.denominations);
      const chqAmt = chqs.reduce((sum, c) => sum + (c.amount || 0), 0);
      setModalTotalCash(cash);
      setModalGrandTotal(cash + chqAmt);
    } else {
      setModalDenominations({
        d500: 0,
        d200: 0,
        d100: 0,
        d50: 0,
        d20: 0,
        d10: 0,
        coins: 0,
      });
      setModalCheques([]);
      setModalTotalCash(0);
      setModalGrandTotal(0);
    }
  };

  const handleSaveModalDenominations = () => {
    if (!denominationModalSalesman) return;
    const chqAmt = modalCheques.reduce((sum, c) => sum + (c.amount || 0), 0);
    onSaveHandover(
      denominationModalSalesman.salesmanId,
      selectedDate,
      modalGrandTotal,
      modalDenominations,
      modalCheques,
      modalTotalCash,
      chqAmt
    );

    setHandoverInputs(prev => ({
      ...prev,
      [denominationModalSalesman.salesmanId]: modalGrandTotal.toString(),
    }));

    setSaveBanner(
      `Saved Denomination Slip & Handover of ₹${modalGrandTotal.toLocaleString()} for ${denominationModalSalesman.salesmanName}!`
    );
    setDenominationModalSalesman(null);
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleQuickSaveHandover = (salesmanId: string, salesmanName: string) => {
    const inputVal = handoverInputs[salesmanId];
    const amount = parseFloat(inputVal) || 0;
    onSaveHandover(salesmanId, selectedDate, amount);

    setSaveBanner(
      `Recorded ₹${amount.toLocaleString()} cash handover for ${salesmanName} (${salesmanId}) on ${selectedDate} to CashHandover sheet!`
    );
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const totalSystemCollected = reconciliationData.reduce((acc, r) => acc + r.systemTotal, 0);
  const totalCashHanded = reconciliationData.reduce(
    (acc, r) => acc + (r.hasHandoverEntered ? r.parsedHandover : 0),
    0
  );
  const overallDiff = Math.round((totalCashHanded - totalSystemCollected) * 100) / 100;

  // Aggregate denominations across all salesmen on selected date for Office Vault
  const aggregateDenominations = {
    d500: 0,
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    coins: 0,
  };
  let totalChequesInOffice = 0;
  let totalChequeAmtInOffice = 0;

  cashHandovers
    .filter(h => h.handoverDate === selectedDate)
    .forEach(h => {
      if (h.denominations) {
        aggregateDenominations.d500 += h.denominations.d500 || 0;
        aggregateDenominations.d200 += h.denominations.d200 || 0;
        aggregateDenominations.d100 += h.denominations.d100 || 0;
        aggregateDenominations.d50 += h.denominations.d50 || 0;
        aggregateDenominations.d20 += h.denominations.d20 || 0;
        aggregateDenominations.d10 += h.denominations.d10 || 0;
        aggregateDenominations.coins += h.denominations.coins || 0;
      }
      if (h.cheques && h.cheques.length > 0) {
        totalChequesInOffice += h.cheques.length;
        totalChequeAmtInOffice += h.cheques.reduce((sum, c) => sum + (c.amount || 0), 0);
      }
    });

  const totalNotesInVault =
    aggregateDenominations.d500 +
    aggregateDenominations.d200 +
    aggregateDenominations.d100 +
    aggregateDenominations.d50 +
    aggregateDenominations.d20 +
    aggregateDenominations.d10;

  return (
    <div className="space-y-6">
      {/* Top Controls & Overall Summary */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Daily Cash &amp; Collection Reconciliation
              </h2>
              <p className="text-xs text-slate-500">
                Compare system recorded collections against physical cash notes and cheques handed over in the evening.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Settlement Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                setHandoverInputs({});
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Overall Day Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total System Collections
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              ₹{totalSystemCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Physical Handed Over
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              ₹{totalCashHanded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Net Discrepancy
            </div>
            <div
              className={`text-lg font-black mt-0.5 ${
                Math.abs(overallDiff) < 0.01
                  ? 'text-emerald-600'
                  : overallDiff < 0
                  ? 'text-red-600'
                  : 'text-amber-600'
              }`}
            >
              {overallDiff > 0 ? '+' : ''}₹{overallDiff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {saveBanner && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          {saveBanner}
        </div>
      )}

      {/* Aggregate Vault Cash Denominations Box */}
      {totalNotesInVault > 0 && (
        <div className="bg-emerald-950 text-emerald-100 rounded-lg p-4 shadow-sm border border-emerald-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/80 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Office Cash Drawer &amp; Vault Count ({selectedDate})
                </h3>
                <span className="text-[11px] text-emerald-300">
                  Aggregated currency notes &amp; cheques collected from all salesmen today
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-300">Total Notes Count:</span>{' '}
              <strong className="text-sm text-white font-mono">{totalNotesInVault} notes</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center">
            <div className="bg-emerald-900/60 p-2 rounded border border-emerald-700/50">
              <span className="text-[10px] text-emerald-300 block font-bold">₹500 Notes</span>
              <span className="text-sm font-black text-white">{aggregateDenominations.d500}</span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                = ₹{(aggregateDenominations.d500 * 500).toLocaleString()}
              </span>
            </div>
            <div className="bg-emerald-900/60 p-2 rounded border border-emerald-700/50">
              <span className="text-[10px] text-emerald-300 block font-bold">₹200 Notes</span>
              <span className="text-sm font-black text-white">{aggregateDenominations.d200}</span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                = ₹{(aggregateDenominations.d200 * 200).toLocaleString()}
              </span>
            </div>
            <div className="bg-emerald-900/60 p-2 rounded border border-emerald-700/50">
              <span className="text-[10px] text-emerald-300 block font-bold">₹100 Notes</span>
              <span className="text-sm font-black text-white">{aggregateDenominations.d100}</span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                = ₹{(aggregateDenominations.d100 * 100).toLocaleString()}
              </span>
            </div>
            <div className="bg-emerald-900/60 p-2 rounded border border-emerald-700/50">
              <span className="text-[10px] text-emerald-300 block font-bold">₹50 Notes</span>
              <span className="text-sm font-black text-white">{aggregateDenominations.d50}</span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                = ₹{(aggregateDenominations.d50 * 50).toLocaleString()}
              </span>
            </div>
            <div className="bg-emerald-900/60 p-2 rounded border border-emerald-700/50">
              <span className="text-[10px] text-emerald-300 block font-bold">₹20 Notes</span>
              <span className="text-sm font-black text-white">{aggregateDenominations.d20}</span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                = ₹{(aggregateDenominations.d20 * 20).toLocaleString()}
              </span>
            </div>
            <div className="bg-emerald-900/60 p-2 rounded border border-emerald-700/50">
              <span className="text-[10px] text-emerald-300 block font-bold">₹10 Notes</span>
              <span className="text-sm font-black text-white">{aggregateDenominations.d10}</span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                = ₹{(aggregateDenominations.d10 * 10).toLocaleString()}
              </span>
            </div>
            <div className="bg-emerald-900/60 p-2 rounded border border-emerald-700/50">
              <span className="text-[10px] text-emerald-300 block font-bold">Cheques ({totalChequesInOffice})</span>
              <span className="text-sm font-black text-blue-200">{totalChequesInOffice}</span>
              <span className="text-[10px] text-blue-300 block font-mono">
                = ₹{totalChequeAmtInOffice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Salesmen Reconciliation Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Salesmen Evening Cash &amp; Denomination Audit ({selectedDate})
          </h3>
          <span className="text-xs text-slate-400">Sheet: CashHandover</span>
        </div>

        <div className="divide-y divide-slate-100">
          {reconciliationData.map(row => {
            const isExpanded = expandedSalesmanId === row.salesman.salesmanId;
            const hasCollections = row.collections.length > 0;
            const h = row.handoverRecord;
            const d = h?.denominations;

            return (
              <div key={row.salesman.salesmanId} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Salesman Info */}
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                        {row.salesman.salesmanId}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{row.salesman.salesmanName}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {row.collections.length} bill collection{row.collections.length === 1 ? '' : 's'} logged today
                    </div>
                  </div>

                  {/* System Logged Amount */}
                  <div className="text-center min-w-[130px]">
                    <div className="text-[11px] text-slate-500 font-medium">System Total Logged</div>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      ₹{row.systemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Cash Handed Over Input & Denomination Button */}
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium mb-1">Handed Over (₹)</div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="₹ 0.00"
                        value={row.currentInputVal}
                        onChange={e => handleHandoverChange(row.salesman.salesmanId, e.target.value)}
                        className="w-28 px-2.5 py-1.5 text-xs font-bold rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white"
                      />
                    </div>
                    
                    <button
                      onClick={() => handleOpenDenominationModal(row.salesman, h)}
                      className="mt-4 px-2.5 py-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                      title="Open full currency denomination counter"
                    >
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Denominations
                    </button>

                    <button
                      onClick={() => handleQuickSaveHandover(row.salesman.salesmanId, row.salesman.salesmanName)}
                      className="mt-4 px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                      title="Save handover to CashHandover sheet"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>

                  {/* Match / Mismatch Indicator */}
                  <div className="min-w-[150px] text-right">
                    <div className="text-[11px] text-slate-500 font-medium mb-1">Audit Status</div>
                    {!row.hasHandoverEntered ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Awaiting Handover
                      </span>
                    ) : row.isMatched ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Matches
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        Mismatch: {row.diff > 0 ? '+' : ''}₹{Math.abs(row.diff).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  {/* Drill-down toggle */}
                  <div>
                    <button
                      onClick={() => setExpandedSalesmanId(isExpanded ? null : row.salesman.salesmanId)}
                      disabled={!hasCollections}
                      className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Hide
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Details
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Denomination summary badge under row if available */}
                {d && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-600">
                    <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
                      <Banknote className="w-3 h-3 text-emerald-600" /> Notes:
                    </span>
                    {d.d500 ? <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">500×{d.d500}</span> : null}
                    {d.d200 ? <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">200×{d.d200}</span> : null}
                    {d.d100 ? <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">100×{d.d100}</span> : null}
                    {d.d50 ? <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">50×{d.d50}</span> : null}
                    {d.d20 ? <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">20×{d.d20}</span> : null}
                    {d.coins ? <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Coins:{d.coins}</span> : null}
                    {h?.cheques && h.cheques.length > 0 && (
                      <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-bold border border-blue-200">
                        {h.cheques.length} Cheque(s) (₹{h.chequeAmount?.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}

                {/* Drill-down bill-by-bill breakdown */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-slate-800 mb-2">
                      Bill-by-Bill Collection Ledger for {row.salesman.salesmanName} on {selectedDate}:
                    </h4>
                    {row.collections.length === 0 ? (
                      <p className="text-xs text-slate-400">No collections recorded on this date.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs bg-white rounded border border-slate-200">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="px-3 py-2">Invoice Num</th>
                              <th className="px-3 py-2">Outlet Name</th>
                              <th className="px-3 py-2 text-right">Amount Value (₹)</th>
                              <th className="px-3 py-2 text-right">Balance Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {row.collections.map(c => (
                              <tr key={c.collectionId} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-mono font-bold text-blue-700">
                                  {c.billNumber}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-slate-900">{c.shopName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">ID: {c.collectionId} • Mode: {c.paymentMode || 'cash'}</div>
                                </td>
                                <td className="px-3 py-2 text-right font-black text-emerald-600 font-mono">
                                  ₹{c.amountCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-semibold text-slate-700">
                                  ₹{c.runningBalanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Denomination Counter Input */}
      {denominationModalSalesman && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">
                    Currency Denomination Counter — {denominationModalSalesman.salesmanName}
                  </h3>
                  <span className="text-xs text-slate-300">
                    Handover Date: {selectedDate} • Salesman ID: {denominationModalSalesman.salesmanId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDenominationModalSalesman(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <DenominationCounter
                value={modalDenominations}
                cheques={modalCheques}
                onChange={(denoms, cash, chqs, total) => {
                  setModalDenominations(denoms);
                  setModalTotalCash(cash);
                  setModalCheques(chqs);
                  setModalGrandTotal(total);
                }}
                expectedAmount={
                  reconciliationData.find(
                    r => r.salesman.salesmanId === denominationModalSalesman.salesmanId
                  )?.systemTotal || 0
                }
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Grand Total: <strong className="text-sm text-emerald-700 font-mono">₹{modalGrandTotal.toLocaleString()}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDenominationModalSalesman(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalDenominations}
                  className="px-4 py-1.5 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Handover &amp; Denominations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
