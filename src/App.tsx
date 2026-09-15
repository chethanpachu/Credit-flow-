import React, { useState, useEffect } from 'react';
import {
  Area,
  Salesman,
  Driver,
  SalesmanArea,
  Bill,
  CollectionHistoryEntry,
  CashHandoverEntry,
  DriverAssignment,
  UserRole,
  DenominationBreakdown,
  ChequeEntry,
  OnlinePaymentEntry,
} from './types';
import { loadInitialData, saveAllData, resetToDefaults } from './services/storage';
import { exportWorkbook } from './services/excelService';
import { getTodayDateStr } from './data/initialData';
import { Header } from './components/Header';
import { SetupTab } from './components/SetupTab';
import { AddBillsTab } from './components/AddBillsTab';
import { EveningCollectionTab } from './components/EveningCollectionTab';
import { SimpleSalesmanCollectionTab } from './components/SimpleSalesmanCollectionTab';
import { ReconciliationTab } from './components/ReconciliationTab';
import { HistoryTab } from './components/HistoryTab';
import { DriverManifestTab } from './components/DriverManifestTab';
import { AdminVerificationTab } from './components/AdminVerificationTab';
import { AdminCollectionDashboard } from './components/AdminCollectionDashboard';
import { SalesmanAssignmentsTab } from './components/SalesmanAssignmentsTab';
import { SalesmanHandoverTab } from './components/SalesmanHandoverTab';
import { NotebookLedgerView } from './components/NotebookLedgerView';
import { LoginModal } from './components/LoginModal';
import { PythonSourceModal } from './components/PythonSourceModal';
import { EXCEL_MANAGER_PY, MAIN_PY } from './data/pythonCode';
import {
  Sliders,
  PlusSquare,
  Wallet,
  Calculator,
  History,
  Truck,
  ShieldCheck,
  Banknote,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  User,
  Shield,
  LayoutDashboard,
  BookOpen,
} from 'lucide-react';

export default function App() {
  const initial = loadInitialData();

  const [areas, setAreas] = useState<Area[]>(initial.areas);
  const [salesmen, setSalesmen] = useState<Salesman[]>(initial.salesmen);
  const [drivers, setDrivers] = useState<Driver[]>(initial.drivers || []);
  const [salesmanAreas, setSalesmanAreas] = useState<SalesmanArea[]>(initial.salesmanAreas);
  const [bills, setBills] = useState<Bill[]>(initial.bills);
  const [collectionHistory, setCollectionHistory] = useState<CollectionHistoryEntry[]>(initial.collectionHistory);
  const [cashHandovers, setCashHandovers] = useState<CashHandoverEntry[]>(initial.cashHandovers);
  const [driverAssignments, setDriverAssignments] = useState<DriverAssignment[]>(initial.driverAssignments || []);

  // Dual-Role Interface State
  const [currentRole, setCurrentRole] = useState<UserRole>('salesman');
  const [currentSalesmanId, setCurrentSalesmanId] = useState<string>(
    initial.salesmen.length > 0 ? initial.salesmen[0].salesmanId : 'S1'
  );
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Active Tabs for Salesman vs Admin (Salesman cannot add bills per Requirement 1)
  const [salesmanTab, setSalesmanTab] = useState<'collection' | 'handover_history' | 'ledger'>('collection');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'ledger' | 'verification' | 'driver_manifest' | 'reconciliation' | 'master_bills' | 'add_bill' | 'setup'>('dashboard');

  // Selected Area for rapid next-bill entry
  const [addBillInitialArea, setAddBillInitialArea] = useState<string>('');

  // Session added bills
  const [sessionBills, setSessionBills] = useState<Bill[]>([]);

  // Python Code Modal
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' } | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    saveAllData(
      areas,
      salesmen,
      drivers,
      salesmanAreas,
      bills,
      collectionHistory,
      cashHandovers,
      driverAssignments
    );
  }, [areas, salesmen, drivers, salesmanAreas, bills, collectionHistory, cashHandovers, driverAssignments]);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Find active salesman object
  const activeSalesmanObj = salesmen.find(s => s.salesmanId === currentSalesmanId);

  // Areas assigned to currently logged in salesman
  const myAssignedAreaIds = salesmanAreas
    .filter(sa => sa.salesmanId === currentSalesmanId)
    .map(sa => sa.areaId);

  // --- Handlers ---
  const handleAddArea = (areaId: string, areaName: string) => {
    const updated = [...areas, { areaId, areaName }];
    setAreas(updated);
    showToast(`Added area ${areaId}: ${areaName}`);
  };

  const handleAddSalesman = (salesmanId: string, salesmanName: string, pin: string = '1234') => {
    const updated = [...salesmen, { salesmanId, salesmanName, pin }];
    setSalesmen(updated);
    showToast(`Added salesman ${salesmanId}: ${salesmanName}`);
  };

  const handleAddDriver = (driverId: string, driverName: string, phone: string) => {
    const updated = [...drivers, { driverId, driverName, phone }];
    setDrivers(updated);
    showToast(`Added delivery driver ${driverId}: ${driverName}`);
  };

  const handleSaveSalesmanAreas = (salesmanId: string, areaIds: string[]) => {
    const withoutCurrent = salesmanAreas.filter(sa => sa.salesmanId !== salesmanId);
    const newMappings: SalesmanArea[] = areaIds.map(aId => ({
      salesmanId,
      areaId: aId,
    }));
    setSalesmanAreas([...withoutCurrent, ...newMappings]);
    showToast(`Updated territory assignments for ${salesmanId}!`);
  };

  const handleAddBill = (newBillData: Omit<Bill, 'billId' | 'balance' | 'status'>) => {
    const billId = `B-${bills.length + 1001}`;
    const newBill: Bill = {
      ...newBillData,
      billId,
      balance: newBillData.amount,
      status: 'pending',
    };

    setBills(prev => [newBill, ...prev]);
    setSessionBills(prev => [newBill, ...prev]);
    showToast(`Saved Bill #${newBill.billNumber} for ${newBill.shopName}`);
  };

  const handleRecordCollection = (
    billId: string,
    salesmanId: string,
    amountCollected: number,
    collectionDate: string,
    paymentMode: 'cash' | 'cheque' | 'online' | 'nil' | 'other' = 'cash',
    chequeOrUtrNumber?: string,
    isOldBill?: boolean,
    notes?: string,
    isNilPayment?: boolean,
    nilReason?: string
  ) => {
    const targetBill = bills.find(b => b.billId === billId);
    if (!targetBill) return;

    // If Nil payment, balance remains unchanged
    const newBalance = isNilPayment
      ? targetBill.balance
      : Math.max(0, Math.round((targetBill.balance - amountCollected) * 100) / 100);
    const newStatus = newBalance <= 0 ? 'paid' : 'pending';

    // 1. Update bill in bills array if not NIL
    if (!isNilPayment) {
      setBills(prev =>
        prev.map(b =>
          b.billId === billId ? { ...b, balance: newBalance, status: newStatus } : b
        )
      );

      // 2. Also update in session bills if present
      setSessionBills(prev =>
        prev.map(b =>
          b.billId === billId ? { ...b, balance: newBalance, status: newStatus } : b
        )
      );
    }

    // 3. Append to CollectionHistory (append-only log)
    const salesmanObj = salesmen.find(s => s.salesmanId === salesmanId);
    const collId = `COL-${collectionHistory.length + 501}`;

    const newEntry: CollectionHistoryEntry = {
      collectionId: collId,
      billId: targetBill.billId,
      billNumber: targetBill.billNumber,
      shopName: targetBill.shopName,
      areaId: targetBill.areaId,
      salesmanId,
      salesmanName: salesmanObj ? salesmanObj.salesmanName : 'Unknown',
      amountCollected: isNilPayment ? 0 : amountCollected,
      collectionDate,
      runningBalanceAfter: newBalance,
      paymentMode: isNilPayment ? 'nil' : paymentMode,
      chequeOrUtrNumber,
      isOldBill,
      notes: isNilPayment ? `NIL: ${nilReason || notes}` : notes,
      isNilPayment: !!isNilPayment,
      nilReason,
      verificationStatus: 'Pending Review',
    };

    setCollectionHistory(prev => [newEntry, ...prev]);
    if (isNilPayment) {
      showToast(`Recorded NIL visit for ${targetBill.shopName}: ${nilReason || 'No payment'}`, 'warning');
    } else {
      showToast(`Recorded ₹${amountCollected.toLocaleString()} collection for Bill #${targetBill.billNumber}`);
    }
  };

  const handleAssignToDriver = (
    data: Omit<DriverAssignment, 'assignmentId' | 'status' | 'collectedAmount'>
  ) => {
    const assignmentId = `DRV-${driverAssignments.length + 101}`;
    const newAssignment: DriverAssignment = {
      ...data,
      assignmentId,
      status: 'Assigned',
      collectedAmount: 0,
    };

    setDriverAssignments(prev => [newAssignment, ...prev]);
    showToast(`Assigned Bill #${data.billNumber} to driver ${data.driverName} for ${data.scheduledDate}!`);
  };

  const handleMarkDriverCollection = (
    assignmentId: string,
    collectedAmount: number,
    status: 'Collected' | 'Returned Unpaid'
  ) => {
    const target = driverAssignments.find(da => da.assignmentId === assignmentId);
    if (!target) return;

    setDriverAssignments(prev =>
      prev.map(da =>
        da.assignmentId === assignmentId
          ? { ...da, status, collectedAmount }
          : da
      )
    );

    // If collected, automatically update bill balance and append to collection history!
    if (status === 'Collected' && collectedAmount > 0) {
      handleRecordCollection(
        target.billId,
        target.salesmanId,
        collectedAmount,
        target.scheduledDate
      );
    }

    showToast(`Marked driver dispatch as ${status}!`);
  };

  const handleVerifyCollection = (
    collectionId: string,
    status: 'Verified' | 'Flagged',
    adminNotes: string
  ) => {
    setCollectionHistory(prev =>
      prev.map(c =>
        c.collectionId === collectionId
          ? { ...c, verificationStatus: status, adminNotes }
          : c
      )
    );
    showToast(`Collection ${collectionId} marked as ${status}`);
  };

  // Requirement 5: "once the entry made by salesman cannot be edit anything they edit should be reflected in the admin thing this is the crucial thing"
  const handleAdminEditCollection = (
    collectionId: string,
    newAmount: number,
    adminReason: string
  ) => {
    const targetEntry = collectionHistory.find(c => c.collectionId === collectionId);
    if (!targetEntry) return;

    const originalAmount = targetEntry.originalSalesmanAmount ?? targetEntry.amountCollected;
    const diff = newAmount - targetEntry.amountCollected;

    // 1. Update the bill balance accordingly
    const targetBill = bills.find(b => b.billId === targetEntry.billId);
    if (targetBill) {
      const updatedBalance = Math.max(0, Math.round((targetBill.balance - diff) * 100) / 100);
      const updatedStatus = updatedBalance <= 0 ? 'paid' : 'pending';

      setBills(prev =>
        prev.map(b =>
          b.billId === targetBill.billId
            ? { ...b, balance: updatedBalance, status: updatedStatus }
            : b
        )
      );

      setSessionBills(prev =>
        prev.map(b =>
          b.billId === targetBill.billId
            ? { ...b, balance: updatedBalance, status: updatedStatus }
            : b
        )
      );
    }

    // 2. Update collection history entry with audit trail
    setCollectionHistory(prev =>
      prev.map(c =>
        c.collectionId === collectionId
          ? {
              ...c,
              amountCollected: newAmount,
              originalSalesmanAmount: originalAmount,
              adminAdjusted: true,
              adminAdjustedAt: getTodayDateStr(),
              adminAdjustedBy: 'Admin (Audited)',
              adminNotes: adminReason
                ? `Admin adjusted amount from ₹${originalAmount} to ₹${newAmount}: ${adminReason}`
                : `Admin adjusted amount from ₹${originalAmount} to ₹${newAmount}`,
              verificationStatus: 'Verified',
            }
          : c
      )
    );

    showToast(
      `Admin adjusted collection ${collectionId}: ₹${originalAmount} → ₹${newAmount} (Audit trail preserved)`
    );
  };

  const handleVerifyHandover = (
    salesmanId: string,
    handoverDate: string,
    status: 'Verified' | 'Flagged',
    adminNotes: string
  ) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCashHandovers(prev =>
      prev.map(h =>
        h.salesmanId === salesmanId && h.handoverDate === handoverDate
          ? { ...h, verificationStatus: status, adminNotes, verifiedAt: timestamp, verifiedBy: 'Office Admin' }
          : h
      )
    );
    showToast(`Handover proof for ${salesmanId} marked as ${status} by Admin`);
  };

  const handleSaveHandover = (
    salesmanId: string,
    handoverDate: string,
    amount: number,
    denominations?: DenominationBreakdown,
    cheques?: ChequeEntry[],
    onlinePayments?: OnlinePaymentEntry[],
    cashAmount?: number,
    chequeAmount?: number,
    onlineAmount?: number
  ) => {
    const salesmanObj = salesmen.find(s => s.salesmanId === salesmanId);
    const sName = salesmanObj ? salesmanObj.salesmanName : 'Unknown';

    // Count NIL visits logged by salesman today
    const nilCount = collectionHistory.filter(
      c => c.salesmanId === salesmanId && c.collectionDate === handoverDate && c.isNilPayment
    ).length;

    setCashHandovers(prev => {
      const idx = prev.findIndex(
        h => h.salesmanId === salesmanId && h.handoverDate === handoverDate
      );
      const newEntry: CashHandoverEntry = {
        salesmanId,
        salesmanName: sName,
        handoverDate,
        amountHanded: amount,
        cashAmount: cashAmount !== undefined ? cashAmount : amount,
        chequeAmount: chequeAmount || 0,
        onlineAmount: onlineAmount || 0,
        denominations,
        cheques,
        onlinePayments,
        nilVisitsCount: nilCount,
        verificationStatus: 'Pending Review',
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newEntry;
        return copy;
      } else {
        return [...prev, newEntry];
      }
    });
    showToast(`Submitted ₹${amount.toLocaleString()} handover proof (Cash, Online, Cheques) for ${sName} to Admin for Confirmation`);
  };

  const handleBatchRecordCollectionsAndHandover = (
    entries: Array<{
      billId: string;
      amount: number;
      isNil: boolean;
      nilReason?: string;
      returnAmount?: number;
      returnReason?: string;
      travelSequence?: number;
    }>,
    handoverTotal: number,
    denominations: DenominationBreakdown,
    cheques: ChequeEntry[],
    onlinePayments: OnlinePaymentEntry[],
    handoverDate: string,
    totalCash: number,
    totalCheques: number,
    totalOnline: number
  ) => {
    const salesmanObj = salesmen.find(s => s.salesmanId === currentSalesmanId);
    const sName = salesmanObj ? salesmanObj.salesmanName : 'Salesman';

    const newCollections: CollectionHistoryEntry[] = [];
    const updatedBillsMap = new Map<string, { balance: number; status: 'pending' | 'paid' }>();

    entries.forEach((entry, idx) => {
      const targetBill = bills.find(b => b.billId === entry.billId);
      if (!targetBill) return;

      const isNil = entry.isNil || (entry.amount === 0 && (!entry.returnAmount || entry.returnAmount === 0));
      const amountCollected = isNil ? 0 : entry.amount;
      const retAmt = entry.returnAmount || 0;
      const totalDeduction = amountCollected + retAmt;

      // Automated balance deduction: bill balance reduced by cash collected + expired/damaged returns
      const newBalance = isNil
        ? targetBill.balance
        : Math.max(0, Math.round((targetBill.balance - totalDeduction) * 100) / 100);
      const newStatus = newBalance <= 0 ? 'paid' : 'pending';

      if (!isNil || retAmt > 0) {
        updatedBillsMap.set(entry.billId, { balance: newBalance, status: newStatus });
      }

      newCollections.push({
        collectionId: 'COL-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        billId: targetBill.billId,
        billNumber: targetBill.billNumber,
        shopName: targetBill.shopName,
        areaId: targetBill.areaId,
        salesmanId: currentSalesmanId,
        salesmanName: sName,
        amountCollected,
        returnAmount: retAmt,
        returnReason: entry.returnReason,
        travelSequence: entry.travelSequence ?? (idx + 1),
        collectionDate: handoverDate,
        runningBalanceAfter: newBalance,
        paymentMode: isNil ? 'nil' : 'cash',
        isOldBill: targetBill.isOldBill,
        notes: isNil
          ? `NIL: ${entry.nilReason || 'No payment (0 entered)'}`
          : retAmt > 0
          ? `Collected ₹${amountCollected} + ₹${retAmt} return deduction (${entry.returnReason || 'Expiry/Damage'})`
          : 'Collection verified against cash',
        isNilPayment: isNil,
        nilReason: isNil ? (entry.nilReason || 'No payment made') : undefined,
        verificationStatus: 'Pending Review',
      });
    });

    // 1. Update bills balance
    if (updatedBillsMap.size > 0) {
      setBills(prev =>
        prev.map(b => {
          const u = updatedBillsMap.get(b.billId);
          return u ? { ...b, balance: u.balance, status: u.status } : b;
        })
      );
      setSessionBills(prev =>
        prev.map(b => {
          const u = updatedBillsMap.get(b.billId);
          return u ? { ...b, balance: u.balance, status: u.status } : b;
        })
      );
    }

    // 2. Append collection history
    setCollectionHistory(prev => [...newCollections, ...prev]);

    // 3. Register cash handover entry with auto-calculated denominations
    const nilCount = newCollections.filter(c => c.isNilPayment).length;
    setCashHandovers(prev => {
      const idx = prev.findIndex(
        h => h.salesmanId === currentSalesmanId && h.handoverDate === handoverDate
      );
      const newEntry: CashHandoverEntry = {
        salesmanId: currentSalesmanId,
        salesmanName: sName,
        handoverDate,
        amountHanded: handoverTotal,
        cashAmount: totalCash,
        chequeAmount: totalCheques,
        onlineAmount: totalOnline,
        denominations,
        cheques,
        onlinePayments,
        nilVisitsCount: nilCount,
        verificationStatus: 'Pending Review',
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newEntry;
        return copy;
      } else {
        return [...prev, newEntry];
      }
    });

    showToast(`Saved ${entries.length} outlet entries and submitted ₹${handoverTotal.toLocaleString()} cash handover proof to Admin!`, 'success');
  };

  const handleNavigateToAddBillWithArea = (areaId: string) => {
    setAddBillInitialArea(areaId);
    if (currentRole === 'salesman') {
      showToast('Only Admin can create bills. Please switch to Office Admin role to add bills.', 'warning');
    } else {
      setAdminTab('add_bill');
    }
  };

  const handleExportExcel = () => {
    exportWorkbook(
      areas,
      salesmen,
      drivers,
      salesmanAreas,
      bills,
      collectionHistory,
      cashHandovers,
      driverAssignments
    );
    showToast('Downloaded grb_data.xlsx with all 8 sheets!', 'success');
  };

  const handleResetData = () => {
    if (window.confirm('Reset all data back to initial demo dataset?')) {
      resetToDefaults();
      const fresh = loadInitialData();
      setAreas(fresh.areas);
      setSalesmen(fresh.salesmen);
      setDrivers(fresh.drivers);
      setSalesmanAreas(fresh.salesmanAreas);
      setBills(fresh.bills);
      setCollectionHistory(fresh.collectionHistory);
      setCashHandovers(fresh.cashHandovers);
      setDriverAssignments(fresh.driverAssignments);
      setSessionBills([]);
      showToast('Reset data back to initial state.', 'info');
    }
  };

  // Compute overdue count (> 30 days old and pending)
  const todayDate = new Date();
  const breachCount = bills.filter(b => {
    if (b.status === 'paid' && b.balance <= 0) return false;
    try {
      const issued = new Date(b.dateIssued);
      const diffDays = Math.floor((todayDate.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    } catch {
      return false;
    }
  }).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Application Bar */}
      <Header
        onExportExcel={handleExportExcel}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        onResetData={handleResetData}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        currentRole={currentRole}
        currentSalesman={activeSalesmanObj}
        billCount={bills.length}
        breachCount={breachCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* =========================================================================
            ROLE INTERFACE 1: SALESMAN PORTAL (Strict Data Isolation)
        ========================================================================= */}
        {currentRole === 'salesman' && (
          <div className="space-y-4">
            {/* Salesman Isolation Banner */}
            <div className="bg-blue-600 text-white p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-blue-200" />
                <div>
                  <div className="font-bold text-xs">
                    Salesman Portal: {activeSalesmanObj?.salesmanName} ({activeSalesmanObj?.salesmanId})
                  </div>
                  <div className="text-[11px] text-blue-100">
                    Strict Territory Isolation Active • Assigned Areas:{' '}
                    <strong>{myAssignedAreaIds.join(', ') || 'None assigned'}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-blue-700 text-blue-100 px-2 py-0.5 rounded">
                  No access to other salesmen entries
                </span>
                <button
                  onClick={() => setIsRoleModalOpen(true)}
                  className="px-2.5 py-1 text-xs bg-white text-blue-700 font-bold rounded hover:bg-blue-50 transition-colors shadow-2xs"
                >
                  Switch User
                </button>
              </div>
            </div>

            {/* Salesman Clean Navigation (Minimal, quiet design without noisy moving icons) */}
            <div className="bg-white rounded-lg border border-slate-200 p-1 shadow-xs flex items-center gap-1">
              <button
                onClick={() => setSalesmanTab('collection')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  salesmanTab === 'collection'
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Daily Collections &amp; Cash Confirmation
              </button>

              <button
                onClick={() => setSalesmanTab('handover_history')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  salesmanTab === 'handover_history'
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Handover Verification Status
              </button>

              <button
                onClick={() => setSalesmanTab('ledger')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  salesmanTab === 'ledger'
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Notebook Route Sheet
              </button>
            </div>

            {/* Salesman Tab Contents */}
            {salesmanTab === 'collection' && (
              <SimpleSalesmanCollectionTab
                salesmanId={currentSalesmanId}
                salesmanName={activeSalesmanObj?.salesmanName || ''}
                areas={areas}
                salesmanAreas={salesmanAreas}
                bills={bills}
                collectionHistory={collectionHistory}
                cashHandovers={cashHandovers}
                onBatchSubmit={handleBatchRecordCollectionsAndHandover}
              />
            )}

            {salesmanTab === 'handover_history' && (
              <SalesmanHandoverTab
                salesmanId={currentSalesmanId}
                salesmanName={activeSalesmanObj?.salesmanName || ''}
                collectionHistory={collectionHistory}
                cashHandovers={cashHandovers}
                onSubmitHandover={(amt, dt, denoms, chqs, online, cash, chqAmt, onlineAmt) =>
                  handleSaveHandover(currentSalesmanId, dt, amt, denoms, chqs, online, cash, chqAmt, onlineAmt)
                }
              />
            )}

            {salesmanTab === 'ledger' && (
              <NotebookLedgerView
                areas={areas.filter(a => myAssignedAreaIds.length === 0 || myAssignedAreaIds.includes(a.areaId))}
                bills={bills}
                collectionHistory={collectionHistory}
                cashHandovers={cashHandovers}
                salesmen={salesmen}
                onRecordCollection={(billId, sId, amt, dt, isOld) =>
                  handleRecordCollection(billId, sId, amt, dt, 'cash', undefined, isOld)
                }
                currentRole="salesman"
                currentSalesmanId={currentSalesmanId}
              />
            )}
          </div>
        )}

        {/* =========================================================================
            ROLE INTERFACE 2: ADMIN PORTAL (Verification, Reconciliation & Driver Manifest)
        ========================================================================= */}
        {currentRole === 'admin' && (
          <div className="space-y-4">
            {/* Admin Banner */}
            <div className="bg-purple-900 text-white p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-purple-300" />
                <div>
                  <div className="font-bold text-xs">
                    Administrator Audit &amp; Verification Interface
                  </div>
                  <div className="text-[11px] text-purple-200">
                    Verify salesman entries • Generate driver manifests • Reconcile cash &amp; credit breaches
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-purple-800 text-purple-200 px-2 py-0.5 rounded">
                  Full Manager Clearance
                </span>
                <button
                  onClick={() => setIsRoleModalOpen(true)}
                  className="px-2.5 py-1 text-xs bg-white text-purple-900 font-bold rounded hover:bg-purple-50 transition-colors shadow-2xs"
                >
                  Switch to Salesman
                </button>
              </div>
            </div>

            {/* Admin Navigation Tabs */}
            <div className="bg-white rounded-lg border border-slate-200 p-1.5 shadow-xs flex flex-wrap items-center gap-1">
              <button
                onClick={() => setAdminTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                  adminTab === 'dashboard'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                1. Collection Dashboard (Areawise)
              </button>

              <button
                onClick={() => setAdminTab('ledger')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                  adminTab === 'ledger'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                2. Notebook Ledger (Manual Flow)
              </button>

              <button
                onClick={() => setAdminTab('verification')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                  adminTab === 'verification'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                3. Verify Salesman Entries
              </button>

              <button
                onClick={() => setAdminTab('driver_manifest')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                  adminTab === 'driver_manifest'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Truck className="w-4 h-4" />
                4. Driver Manifests ({driverAssignments.length})
              </button>

              <button
                onClick={() => setAdminTab('reconciliation')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                  adminTab === 'reconciliation'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calculator className="w-4 h-4" />
                5. Cash Reconciliation &amp; Vault
              </button>

              <button
                onClick={() => setAdminTab('master_bills')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                  adminTab === 'master_bills'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                6. Master Bills &amp; Credit Breaches
                {breachCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-black animate-pulse">
                    {breachCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminTab('add_bill')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                  adminTab === 'add_bill'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <PlusSquare className="w-4 h-4" />
                7. Add Bill
              </button>

              <button
                onClick={() => setAdminTab('setup')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                  adminTab === 'setup'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-4 h-4" />
                8. Setup &amp; Excel
              </button>
            </div>

            {/* Admin Tab Contents */}
            {adminTab === 'dashboard' && (
              <AdminCollectionDashboard
                bills={bills}
                collectionHistory={collectionHistory}
                areas={areas}
                salesmen={salesmen}
                onNavigateToAddBillWithArea={handleNavigateToAddBillWithArea}
                onSwitchToLedger={(areaId) => {
                  if (areaId) setAddBillInitialArea(areaId);
                  setAdminTab('ledger');
                }}
              />
            )}

            {adminTab === 'ledger' && (
              <NotebookLedgerView
                areas={areas}
                bills={bills}
                collectionHistory={collectionHistory}
                cashHandovers={cashHandovers}
                salesmen={salesmen}
                onRecordCollection={(billId, sId, amt, dt, isOld) =>
                  handleRecordCollection(billId, sId, amt, dt, 'cash', undefined, isOld)
                }
                onNavigateToAddBillWithArea={handleNavigateToAddBillWithArea}
                currentRole="admin"
              />
            )}

            {adminTab === 'verification' && (
              <AdminVerificationTab
                salesmen={salesmen}
                collectionHistory={collectionHistory}
                cashHandovers={cashHandovers}
                bills={bills}
                areas={areas}
                onVerifyCollection={handleVerifyCollection}
                onVerifyHandover={handleVerifyHandover}
                onAdminEditCollection={handleAdminEditCollection}
              />
            )}

            {adminTab === 'driver_manifest' && (
              <DriverManifestTab
                drivers={drivers}
                driverAssignments={driverAssignments}
                onMarkDriverCollection={handleMarkDriverCollection}
                isAdmin={true}
              />
            )}

            {adminTab === 'reconciliation' && (
              <ReconciliationTab
                salesmen={salesmen}
                collectionHistory={collectionHistory}
                cashHandovers={cashHandovers}
                onSaveHandover={handleSaveHandover}
              />
            )}

            {adminTab === 'master_bills' && (
              <HistoryTab
                bills={bills}
                collectionHistory={collectionHistory}
                areas={areas}
              />
            )}

            {adminTab === 'add_bill' && (
              <AddBillsTab
                areas={areas}
                bills={bills}
                onAddBill={handleAddBill}
                sessionBills={sessionBills}
                initialAreaId={addBillInitialArea}
              />
            )}

            {adminTab === 'setup' && (
              <SetupTab
                areas={areas}
                salesmen={salesmen}
                drivers={drivers}
                salesmanAreas={salesmanAreas}
                onAddArea={handleAddArea}
                onAddSalesman={handleAddSalesman}
                onAddDriver={handleAddDriver}
                onSaveSalesmanAreas={handleSaveSalesmanAreas}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-10 right-6 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Footer / Status Bar - Clean and Simple */}
      <footer className="bg-white border-t border-slate-200 py-2 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="text-slate-400 text-[11px]">
            GRB Collection Tracker
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsPythonModalOpen(true)}
              className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 cursor-pointer"
            >
              Get Python Desktop Source &amp; Windows .EXE
            </button>
            <button
              onClick={handleExportExcel}
              className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        </div>
      </footer>

      {/* Role Login / Switcher Modal */}
      <LoginModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        salesmen={salesmen}
        currentRole={currentRole}
        currentSalesmanId={currentSalesmanId}
        onSelectRole={(role, smId) => {
          setCurrentRole(role);
          if (smId) setCurrentSalesmanId(smId);
          showToast(`Switched to ${role === 'admin' ? 'Admin Portal' : `Salesman Portal (${smId})`}`);
        }}
      />

      {/* Python Source & Instructions Modal */}
      <PythonSourceModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
        mainPyCode={MAIN_PY}
        excelManagerPyCode={EXCEL_MANAGER_PY}
      />
    </div>
  );
}
