import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Area, SalesmanArea, Bill, CollectionHistoryEntry, CashHandoverEntry, DenominationBreakdown, ChequeEntry, OnlinePaymentEntry } from '../types';
import { getTodayDateStr } from '../data/initialData';
import { DenominationCounter, autoCalculateDenominations, calculateCashTotal } from './DenominationCounter';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  FlaskConical,
  Zap,
  Check,
  Lock,
  Calculator,
  Store,
  HelpCircle,
  Printer,
  Banknote,
  FileText,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  PackageX,
  BadgeAlert,
  ListOrdered,
  Truck,
  FileCheck
} from 'lucide-react';

interface SimpleSalesmanCollectionTabProps {
  salesmanId: string;
  salesmanName: string;
  areas: Area[];
  salesmanAreas: SalesmanArea[];
  bills: Bill[];
  collectionHistory: CollectionHistoryEntry[];
  cashHandovers?: CashHandoverEntry[];
  onBatchSubmit: (
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
  ) => void;
}

export const SimpleSalesmanCollectionTab: React.FC<SimpleSalesmanCollectionTabProps> = ({
  salesmanId,
  salesmanName,
  areas,
  salesmanAreas,
  bills,
  collectionHistory,
  cashHandovers = [],
  onBatchSubmit,
}) => {
  const [collectionDate, setCollectionDate] = useState<string>(getTodayDateStr());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assigned areas for this salesman
  const myAssignedAreaIds = useMemo(() => {
    const assigned = salesmanAreas
      .filter(sa => sa.salesmanId === salesmanId)
      .map(sa => sa.areaId);
    return assigned.length > 0 ? assigned : areas.map(a => a.areaId);
  }, [salesmanAreas, salesmanId, areas]);

  const assignedAreasList = useMemo(() => {
    return areas.filter(a => myAssignedAreaIds.includes(a.areaId));
  }, [areas, myAssignedAreaIds]);

  // Dropdown-based Route / Area Selection
  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    return assignedAreasList.length > 0 ? assignedAreasList[0].areaId : 'A1';
  });

  // Numeric amount entered per bill
  const [enteredAmounts, setEnteredAmounts] = useState<Record<string, string>>({});
  const [nilReasons, setNilReasons] = useState<Record<string, string>>({});

  // Expired / Damaged product return deductions & reasons per bill
  const [returnDeductions, setReturnDeductions] = useState<Record<string, string>>({});
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [editingReturnBill, setEditingReturnBill] = useState<Bill | null>(null);
  const [tempReturnReason, setTempReturnReason] = useState<string>('');

  // Salesman Re-verification Workflow (Cash denomination only opens after successful re-verification)
  const [isReverifiedBySalesman, setIsReverifiedBySalesman] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [overpaymentWarning, setOverpaymentWarning] = useState<string | null>(null);

  // Route Travel Sequencing order: maps areaId to array of billIds
  const [travelOrderMap, setTravelOrderMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('grb_travel_route_order');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sort / Arranged Mode: 'travel' (default, matches physical travel stop order) | 'invoice' | 'name'
  const [sortMode, setSortMode] = useState<'travel' | 'invoice' | 'name'>('travel');
  const [quickSequenceInput, setQuickSequenceInput] = useState<string>('');

  // Active highlighted row for progressive focus highlights
  const [activeBillId, setActiveBillId] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'name' | 'balance' | 'amount' | 'return' | null>(null);

  // Testing Environment Drawer / Panel State
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);
  const [testScenarioFilter, setTestScenarioFilter] = useState<'all' | 'high' | 'old' | 'small'>('all');

  // Print Statement modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);

  // Cash Denominations and Handover state
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
  const [grandTotalHandover, setGrandTotalHandover] = useState<number>(0);

  // Active Area Name memo
  const activeAreaName = useMemo(() => {
    if (selectedAreaId === 'all') return 'All Assigned Routes';
    return areas.find(a => a.areaId === selectedAreaId)?.areaName || 'Selected Route';
  }, [areas, selectedAreaId]);

  // Today's Handover Verification Record for this salesman
  const todayHandover = useMemo(() => {
    if (!cashHandovers) return undefined;
    return cashHandovers.find(
      h => h.salesmanId === salesmanId && h.handoverDate === collectionDate
    );
  }, [cashHandovers, salesmanId, collectionDate]);

  // Ref map to auto-focus amount inputs when selected from search or test list
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Filter bills for active route/area
  const areaBills = useMemo(() => {
    return bills.filter(b => {
      if (selectedAreaId !== 'all') {
        return b.areaId === selectedAreaId;
      }
      return myAssignedAreaIds.includes(b.areaId);
    });
  }, [bills, myAssignedAreaIds, selectedAreaId]);

  // Outstanding bills: bills that have balance > 0 stay under that route until cleared!
  const outstandingBills = useMemo(() => {
    return areaBills.filter(b => b.balance > 0);
  }, [areaBills]);

  // Cleared bills for this route
  const clearedBills = useMemo(() => {
    return areaBills.filter(b => b.balance <= 0);
  }, [areaBills]);

  // Ordered bills based on sortMode (Travel sequence, Invoice #, or Shop name)
  const orderedBills = useMemo(() => {
    const list = [...outstandingBills];
    if (sortMode === 'invoice') {
      return list.sort((a, b) => {
        const numA = parseInt(a.billNumber.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.billNumber.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    }
    if (sortMode === 'name') {
      return list.sort((a, b) => a.shopName.localeCompare(b.shopName));
    }

    // Default: 'travel' sequence
    const areaOrder = travelOrderMap[selectedAreaId] || [];
    if (areaOrder.length > 0) {
      return list.sort((a, b) => {
        const indexA = areaOrder.indexOf(a.billId);
        const indexB = areaOrder.indexOf(b.billId);
        const posA = indexA === -1 ? 9999 : indexA;
        const posB = indexB === -1 ? 9999 : indexB;
        return posA - posB;
      });
    }
    return list;
  }, [outstandingBills, sortMode, travelOrderMap, selectedAreaId]);

  // SEARCH WITH INVOICE NUMBER AND NAME POPS RESULTS DIRECTLY TO THE TOP!
  const filteredAndSortedBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) {
      return orderedBills;
    }

    // Calculate match score to rank matched results right on top
    const scored = orderedBills.map(b => {
      const bNum = b.billNumber.toLowerCase();
      const sName = b.shopName.toLowerCase();
      let score = 0;
      let isMatch = false;

      // Exact invoice number match has highest priority
      if (bNum === q) {
        score = 1000;
        isMatch = true;
      } else if (bNum.startsWith(q)) {
        score = 500;
        isMatch = true;
      } else if (sName === q) {
        score = 400;
        isMatch = true;
      } else if (sName.startsWith(q)) {
        score = 300;
        isMatch = true;
      } else if (bNum.includes(q)) {
        score = 200;
        isMatch = true;
      } else if (sName.includes(q)) {
        score = 100;
        isMatch = true;
      }

      return { bill: b, score, isMatch };
    });

    // Matched results popped directly to the top, sorted by match relevance
    const matched = scored
      .filter(item => item.isMatch)
      .sort((a, b) => b.score - a.score)
      .map(item => item.bill);

    return matched;
  }, [orderedBills, searchQuery]);

  // Testing Environment Outlets Catalogue
  const testOutletsList = useMemo(() => {
    return bills.map(b => {
      const area = areas.find(a => a.areaId === b.areaId);
      const isHigh = b.balance >= 2500;
      const isOld = Boolean(b.isOldBill);
      const isSmall = b.balance > 0 && b.balance <= 500;
      return {
        ...b,
        areaName: area ? area.areaName : b.areaId,
        category: isOld ? 'old' : isHigh ? 'high' : isSmall ? 'small' : 'regular',
      };
    });
  }, [bills, areas]);

  const filteredTestOutlets = useMemo(() => {
    if (testScenarioFilter === 'all') return testOutletsList;
    return testOutletsList.filter(o => o.category === testScenarioFilter);
  }, [testOutletsList, testScenarioFilter]);

  // Initialize enteredAmounts and returns with existing collections
  useEffect(() => {
    const existingAmounts: Record<string, string> = {};
    const existingReturns: Record<string, string> = {};
    const existingReasons: Record<string, string> = {};

    collectionHistory
      .filter(c => c.collectionDate === collectionDate && c.salesmanId === salesmanId)
      .forEach(c => {
        if (c.isNilPayment) {
          existingAmounts[c.billId] = '0';
        } else if (c.amountCollected > 0) {
          existingAmounts[c.billId] = c.amountCollected.toString();
        }
        if (c.returnAmount && c.returnAmount > 0) {
          existingReturns[c.billId] = c.returnAmount.toString();
          if (c.returnReason) {
            existingReasons[c.billId] = c.returnReason;
          }
        }
      });
    setEnteredAmounts(prev => ({ ...existingAmounts, ...prev }));
    setReturnDeductions(prev => ({ ...existingReturns, ...prev }));
    setReturnReasons(prev => ({ ...existingReasons, ...prev }));
  }, [collectionDate, salesmanId, collectionHistory]);

  // Strict overpayment prevention: "a store bill is 500 amount should not accept over that even 501"
  const handleAmountChange = (billId: string, val: string) => {
    // Reset re-verification if salesman changes any amount
    if (isReverifiedBySalesman) {
      setIsReverifiedBySalesman(false);
    }

    const cleanVal = val.replace(/[^0-9.]/g, '');
    const parts = cleanVal.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleanVal;

    const targetBill = bills.find(b => b.billId === billId);
    if (!targetBill) {
      setEnteredAmounts(prev => ({ ...prev, [billId]: sanitized }));
      return;
    }

    const retAmt = parseFloat(returnDeductions[billId]) || 0;
    const maxPayable = Math.max(0, Math.round((targetBill.balance - retAmt) * 100) / 100);

    if (sanitized !== '') {
      const parsed = parseFloat(sanitized);
      if (!isNaN(parsed) && parsed > maxPayable) {
        // STRICT OVERPAYMENT REJECTION: Do not accept over bill balance (even by ₹1)
        setEnteredAmounts(prev => ({ ...prev, [billId]: maxPayable.toString() }));
        const invoiceNum = targetBill.billNumber.replace(/\D/g, '') || targetBill.billNumber;
        setOverpaymentWarning(
          `⚠️ Overpayment Rejected: Bill #${invoiceNum} (${targetBill.shopName}) net balance is ₹${maxPayable.toLocaleString()}. Amount capped to ₹${maxPayable.toLocaleString()} (overpayment not accepted).`
        );
        setTimeout(() => setOverpaymentWarning(null), 6000);
        return;
      }
    }

    setEnteredAmounts(prev => ({ ...prev, [billId]: sanitized }));
  };

  // Return/Expiry Product Deduction Change
  const handleReturnChange = (billId: string, val: string) => {
    if (isReverifiedBySalesman) {
      setIsReverifiedBySalesman(false);
    }
    const cleanVal = val.replace(/[^0-9.]/g, '');
    const parts = cleanVal.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleanVal;

    const targetBill = bills.find(b => b.billId === billId);
    if (targetBill && sanitized !== '') {
      const parsed = parseFloat(sanitized);
      if (!isNaN(parsed) && parsed > targetBill.balance) {
        setReturnDeductions(prev => ({ ...prev, [billId]: targetBill.balance.toString() }));
        return;
      }
    }

    setReturnDeductions(prev => ({ ...prev, [billId]: sanitized }));

    // If entered collection amount now exceeds the new net payable, clamp it
    if (targetBill) {
      const retAmt = parseFloat(sanitized) || 0;
      const netPayable = Math.max(0, targetBill.balance - retAmt);
      const curAmount = parseFloat(enteredAmounts[billId]);
      if (!isNaN(curAmount) && curAmount > netPayable) {
        setEnteredAmounts(prev => ({ ...prev, [billId]: netPayable.toString() }));
      }
    }
  };

  // Move outlet up or down in travel sequence order
  const moveOutlet = (billId: string, direction: 'up' | 'down') => {
    const currentOrder = orderedBills.map(b => b.billId);
    const idx = currentOrder.indexOf(billId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;

    const newOrder = [...currentOrder];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, moved);

    setTravelOrderMap(prev => {
      const updated = { ...prev, [selectedAreaId]: newOrder };
      try {
        localStorage.setItem('grb_travel_route_order', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSortMode('travel');
  };

  // Fast keyboard navigation between amount inputs in the sheet
  const handleKeyDownAmount = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextBill = filteredAndSortedBills[currentIndex + 1];
      if (nextBill && inputRefs.current[nextBill.billId]) {
        inputRefs.current[nextBill.billId]?.focus();
        inputRefs.current[nextBill.billId]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevBill = filteredAndSortedBills[currentIndex - 1];
      if (prevBill && inputRefs.current[prevBill.billId]) {
        inputRefs.current[prevBill.billId]?.focus();
        inputRefs.current[prevBill.billId]?.select();
      }
    }
  };

  // Quick Travel Entry jump: typing invoice # jumps straight into that bill's amount field
  const handleQuickTravelJump = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickSequenceInput.trim().toLowerCase();
    if (!q) return;

    const matched = orderedBills.find(
      b => b.billNumber.replace(/\D/g, '') === q || b.billNumber.toLowerCase() === q || b.shopName.toLowerCase().includes(q)
    );

    if (matched) {
      setActiveBillId(matched.billId);
      setFocusedField('amount');
      if (inputRefs.current[matched.billId]) {
        inputRefs.current[matched.billId]?.focus();
        inputRefs.current[matched.billId]?.select();
      }
      setQuickSequenceInput('');
    } else {
      alert(`Outlet or invoice "${q}" not found in ${activeAreaName}.`);
    }
  };

  // Row calculation helper including Expired / Damaged goods deduction
  const getRowCalculation = (bill: Bill) => {
    const rawVal = enteredAmounts[bill.billId];
    const retAmt = parseFloat(returnDeductions[bill.billId]) || 0;
    const netBillPayable = Math.max(0, Math.round((bill.balance - retAmt) * 100) / 100);

    if (rawVal === undefined || rawVal.trim() === '') {
      return {
        hasEntry: retAmt > 0,
        amount: 0,
        isNil: false,
        returnAmount: retAmt,
        netBillPayable,
        remainingBalance: netBillPayable,
        isValid: true,
        statusText: retAmt > 0 ? `₹${retAmt} Return` : 'Unentered',
      };
    }

    const parsed = parseFloat(rawVal);
    if (isNaN(parsed) || parsed < 0) {
      return {
        hasEntry: true,
        amount: 0,
        isNil: false,
        returnAmount: retAmt,
        netBillPayable,
        remainingBalance: netBillPayable,
        isValid: false,
        statusText: 'Invalid',
      };
    }

    if (parsed === 0 && retAmt === 0) {
      return {
        hasEntry: true,
        amount: 0,
        isNil: true,
        returnAmount: 0,
        netBillPayable: bill.balance,
        remainingBalance: bill.balance,
        isValid: true,
        statusText: 'NIL Visit',
      };
    }

    // Strict validation: amount cannot exceed net payable
    const isValid = parsed <= netBillPayable;
    const remaining = Math.max(0, Math.round((netBillPayable - parsed) * 100) / 100);

    return {
      hasEntry: true,
      amount: parsed,
      isNil: parsed === 0 && retAmt > 0 ? false : parsed === 0,
      returnAmount: retAmt,
      netBillPayable,
      remainingBalance: remaining,
      isValid,
      statusText: remaining === 0 ? 'Cleared' : `₹${remaining}`,
    };
  };

  // Totals calculation
  const {
    totalOriginalBalance,
    totalReturnDeductions,
    totalNetPayable,
    totalEnteredCollection,
    totalRemainingBalance,
    filledCount,
    nilCount,
  } = useMemo(() => {
    let originalSum = 0;
    let returnSum = 0;
    let netSum = 0;
    let collectionSum = 0;
    let remainingSum = 0;
    let filled = 0;
    let nil = 0;

    filteredAndSortedBills.forEach(b => {
      originalSum += b.balance;
      const calc = getRowCalculation(b);
      returnSum += calc.returnAmount;
      netSum += calc.netBillPayable;

      if (calc.hasEntry && calc.isValid) {
        filled++;
        if (calc.isNil) {
          nil++;
          remainingSum += calc.remainingBalance;
        } else {
          collectionSum += calc.amount;
          remainingSum += calc.remainingBalance;
        }
      } else {
        remainingSum += calc.netBillPayable;
      }
    });

    return {
      totalOriginalBalance: originalSum,
      totalReturnDeductions: returnSum,
      totalNetPayable: netSum,
      totalEnteredCollection: collectionSum,
      totalRemainingBalance: remainingSum,
      filledCount: filled,
      nilCount: nil,
    };
  }, [filteredAndSortedBills, enteredAmounts, returnDeductions]);

  // Quick Action: Mark all unentered outlets as 0 (NIL)
  const handleMarkUnenteredAsNil = () => {
    if (isReverifiedBySalesman) {
      setIsReverifiedBySalesman(false);
    }
    const next = { ...enteredAmounts };
    filteredAndSortedBills.forEach(b => {
      if (next[b.billId] === undefined || next[b.billId].trim() === '') {
        next[b.billId] = '0';
      }
    });
    setEnteredAmounts(next);
  };

  // Quick Action from Test Environment Drawer: Fill 20 Outlets Test Run
  const handleFillTestDemoRun = () => {
    if (isReverifiedBySalesman) {
      setIsReverifiedBySalesman(false);
    }
    const next = { ...enteredAmounts };
    const nextReturns = { ...returnDeductions };
    const nextReasons = { ...returnReasons };

    const candidates = areaBills.filter(b => b.balance > 0).slice(0, 20);
    candidates.forEach((b, i) => {
      if (i === 0) {
        // Outlet 1: Pays ₹1 (Testing exact 1 rupee deduction in automated balance section!)
        next[b.billId] = '1';
      } else if (i === 1) {
        // Outlet 2: Cleared in Full (Shows ₹0 Cleared)
        next[b.billId] = b.balance.toString();
      } else if (i === 2) {
        // Outlet 3: NIL visit (0 entered)
        next[b.billId] = '0';
      } else if (i === 3) {
        // Outlet 4: Expired return of ₹150 + balance paid
        nextReturns[b.billId] = Math.min(150, Math.round(b.balance / 4)).toString();
        nextReasons[b.billId] = 'Expired Ghee 500g returned';
        const net = b.balance - (parseFloat(nextReturns[b.billId]) || 0);
        next[b.billId] = net.toString();
      } else if (i === 4) {
        // Outlet 5: Half payment
        next[b.billId] = Math.round(b.balance / 2).toString();
      } else if (i % 5 === 0) {
        next[b.billId] = Math.min(500, b.balance).toString();
      } else if (i % 4 === 0) {
        next[b.billId] = Math.min(1000, b.balance).toString();
      } else if (i % 3 === 0) {
        next[b.billId] = Math.min(250, b.balance).toString();
      } else if (i % 2 === 0) {
        next[b.billId] = b.balance.toString();
      } else {
        next[b.billId] = Math.min(100, b.balance).toString();
      }
    });
    setEnteredAmounts(next);
    setReturnDeductions(nextReturns);
    setReturnReasons(nextReasons);
    setIsTestDrawerOpen(false);
  };

  // Quick Action: Target a specific test outlet
  const handleJumpToTestOutlet = (outlet: Bill, presetAmount?: 'full' | 'partial' | 'nil' | '1') => {
    if (isReverifiedBySalesman) {
      setIsReverifiedBySalesman(false);
    }
    setSelectedAreaId(outlet.areaId);
    setSearchQuery(outlet.billNumber);
    setActiveBillId(outlet.billId);

    if (presetAmount === '1') {
      setEnteredAmounts(prev => ({ ...prev, [outlet.billId]: '1' }));
    } else if (presetAmount === 'full') {
      setEnteredAmounts(prev => ({ ...prev, [outlet.billId]: outlet.balance.toString() }));
    } else if (presetAmount === 'partial') {
      const half = Math.max(1, Math.round(outlet.balance / 2));
      setEnteredAmounts(prev => ({ ...prev, [outlet.billId]: half.toString() }));
    } else if (presetAmount === 'nil') {
      setEnteredAmounts(prev => ({ ...prev, [outlet.billId]: '0' }));
    }

    setIsTestDrawerOpen(false);
    setTimeout(() => {
      inputRefs.current[outlet.billId]?.focus();
    }, 150);
  };

  // Salesman Re-verification Step: unlocks cash denominations upon successful verification
  const handleReverifyBySalesman = () => {
    if (filledCount === 0 && totalEnteredCollection === 0 && totalReturnDeductions === 0) {
      setValidationError('Please enter collection amounts or NIL visits for your route before verifying.');
      return;
    }

    let hasExceed = false;
    filteredAndSortedBills.forEach(b => {
      const calc = getRowCalculation(b);
      if (calc.hasEntry && !calc.isValid) {
        hasExceed = true;
      }
    });

    if (hasExceed) {
      setValidationError('One or more outlets have invalid amounts exceeding the net bill balance. Please correct before re-verifying.');
      return;
    }

    setValidationError(null);
    setIsReverifiedBySalesman(true);

    // Auto-calculate denominations matching totalEnteredCollection
    const autoDenoms = autoCalculateDenominations(totalEnteredCollection);
    setDenominations(autoDenoms);
    const cash = calculateCashTotal(autoDenoms);
    setTotalCash(cash);
    setGrandTotalHandover(cash);

    setTimeout(() => {
      const el = document.getElementById('cash-denomination-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Re-verify collection statement before unlocking physical cash denomination form
  const handleSalesmanReverify = () => {
    // 1. Check for any overpayment or invalid entries
    for (const b of filteredAndSortedBills) {
      const calc = getRowCalculation(b);
      if (calc.hasEntry && !calc.isValid) {
        setValidationError(`Outlet ${b.shopName} (Inv #${b.billNumber}) has an invalid or overpayment amount. Net payable is ₹${calc.netBillPayable}.`);
        return;
      }
    }

    if (filledCount === 0 && totalEnteredCollection === 0) {
      setValidationError('Please enter collections or NIL visits for your route outlets before re-verifying.');
      return;
    }

    setValidationError(null);
    setOverpaymentWarning(null);

    // Auto calculate denominations if not yet filled
    if (totalCash === 0 && totalEnteredCollection > 0) {
      const autoDenoms = autoCalculateDenominations(totalEnteredCollection);
      setDenominations(autoDenoms);
      setTotalCash(calculateCashTotal(autoDenoms));
    }

    setIsReverifiedBySalesman(true);
  };

  // Submit collections and cash handover to office admin / cashier
  const handleFinalSubmit = () => {
    if (!isReverifiedBySalesman) {
      alert('Please review and re-verify the collection list first before submitting cash handover.');
      return;
    }

    if (filledCount === 0 && totalEnteredCollection === 0) {
      alert('Please enter collection amounts for at least one outlet before submitting.');
      return;
    }

    const entriesToSubmit: Array<{
      billId: string;
      amount: number;
      isNil: boolean;
      nilReason?: string;
      returnAmount?: number;
      returnReason?: string;
      travelSequence?: number;
    }> = [];

    filteredAndSortedBills.forEach((b, index) => {
      const calc = getRowCalculation(b);
      if (calc.hasEntry && calc.isValid) {
        entriesToSubmit.push({
          billId: b.billId,
          amount: calc.amount,
          isNil: calc.isNil,
          nilReason: calc.isNil ? (nilReasons[b.billId] || 'No payment made (0 entered)') : undefined,
          returnAmount: calc.returnAmount,
          returnReason: returnReasons[b.billId],
          travelSequence: index + 1,
        });
      }
    });

    const chqTotal = cheques.reduce((s, c) => s + (c.amount || 0), 0);
    const onlineTotal = onlinePayments.reduce((s, o) => s + (o.amount || 0), 0);
    const totalHandover = totalCash + chqTotal + onlineTotal;

    onBatchSubmit(
      entriesToSubmit,
      totalHandover,
      denominations,
      cheques,
      onlinePayments,
      collectionDate,
      totalCash,
      chqTotal,
      onlineTotal
    );

    setSubmissionSuccessMsg(
      `✔ Submitted ₹${totalHandover.toLocaleString()} Handover (Cash: ₹${totalCash.toLocaleString()}) for ${collectionDate} to Cashier for Confirmation!`
    );
    setTimeout(() => setSubmissionSuccessMsg(null), 8000);
  };

  return (
    <div className="space-y-3 w-full max-w-full overflow-hidden">
      {/* Top Filter & Tools Bar: Dropdown Route Selection + Instant Top-Search + Test Environment Outlets */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 1. DROPDOWN-WISE ROUTE AND AREA SELECTION */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="route-area-select" className="text-xs font-bold text-slate-800 whitespace-nowrap">
              Route / Area:
            </label>
            <select
              id="route-area-select"
              value={selectedAreaId}
              onChange={e => {
                setSelectedAreaId(e.target.value);
                setIsReverifiedBySalesman(false);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              <optgroup label="Assigned Territory Routes">
                {assignedAreasList.map(area => {
                  const count = bills.filter(b => b.areaId === area.areaId && b.balance > 0).length;
                  return (
                    <option key={area.areaId} value={area.areaId}>
                      {area.areaName} ({count} pending outlets)
                    </option>
                  );
                })}
              </optgroup>
              {areas.filter(a => !myAssignedAreaIds.includes(a.areaId)).length > 0 && (
                <optgroup label="Other Territory Routes">
                  {areas
                    .filter(a => !myAssignedAreaIds.includes(a.areaId))
                    .map(area => {
                      const count = bills.filter(b => b.areaId === area.areaId && b.balance > 0).length;
                      return (
                        <option key={area.areaId} value={area.areaId}>
                          {area.areaName} ({count} pending outlets)
                        </option>
                      );
                    })}
                </optgroup>
              )}
              <option value="all">
                All Assigned Routes ({bills.filter(b => myAssignedAreaIds.includes(b.areaId) && b.balance > 0).length} Outlets)
              </option>
            </select>

            {/* Route Persistence Rule: Outlets with balance > 0 stay under this route until cleared */}
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1" title="Bills stay under this route until balance is ₹0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{outstandingBills.length} Active Bills (Remain in route until cleared)</span>
              {clearedBills.length > 0 && (
                <span className="text-slate-400 font-normal">| {clearedBills.length} Cleared</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 2. TEST ENVIRONMENT OUTLETS BUTTON */}
            <button
              type="button"
              onClick={() => setIsTestDrawerOpen(!isTestDrawerOpen)}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
              <span>Testing Outlets (20 in Route)</span>
            </button>

            {/* Date Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Date:</span>
              <input
                type="date"
                value={collectionDate}
                onChange={e => {
                  setCollectionDate(e.target.value);
                  setIsReverifiedBySalesman(false);
                }}
                className="px-2 py-1 text-xs font-mono font-semibold rounded border border-slate-300 bg-white"
              />
            </div>
          </div>
        </div>

        {/* TRAVEL SEQUENCE / TRAVEL ROUTE FLOW CONTROLS */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-bold flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Travel Flow:</span>
            </span>
            <div className="inline-flex rounded-md shadow-2xs">
              <button
                type="button"
                onClick={() => setSortMode('travel')}
                className={`px-2.5 py-1 rounded-l-md font-bold text-[11px] border transition-colors ${
                  sortMode === 'travel'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Bills arranged in exact travel stop sequence"
              >
                🛵 Travel Route Sequence (Stop 1, 2, 3...)
              </button>
              <button
                type="button"
                onClick={() => setSortMode('invoice')}
                className={`px-2.5 py-1 font-bold text-[11px] border-y border-r transition-colors ${
                  sortMode === 'invoice'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                🔢 Invoice # Order
              </button>
              <button
                type="button"
                onClick={() => setSortMode('name')}
                className={`px-2.5 py-1 rounded-r-md font-bold text-[11px] border-y border-r transition-colors ${
                  sortMode === 'name'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                🏬 Outlet Name (A-Z)
              </button>
            </div>
          </div>

          {/* RAPID TRAVEL ENTRY: JUMP DIRECTLY TO INVOICE WITHOUT SEARCHING MANUALLY */}
          <form onSubmit={handleQuickTravelJump} className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">⚡ Travel Fast-Entry:</span>
            <input
              type="text"
              placeholder="Invoice # (e.g. 7004)"
              value={quickSequenceInput}
              onChange={e => setQuickSequenceInput(e.target.value)}
              className="px-2 py-1 text-xs font-mono rounded border border-slate-300 bg-white w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] rounded flex items-center gap-1 cursor-pointer"
            >
              <span>Jump &amp; Enter</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>
        </div>

        {/* 3. INSTANT TOP-POP SEARCH INPUT */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice number (e.g. 7001, 7015) or outlet name — match pops instantly to top of travel list!"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-md border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-700 p-0.5"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Overpayment Warning Toast Banner */}
        {overpaymentWarning && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-300 rounded-md text-xs font-bold text-rose-900 animate-in fade-in">
            <BadgeAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{overpaymentWarning}</span>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-md text-xs font-bold text-amber-900 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Search match banner if searching */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-50/80 border border-blue-200 rounded text-xs text-blue-900">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Found <strong>{filteredAndSortedBills.length}</strong> matching outlets — popped directly to the top of the route list!
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-semibold text-blue-700 hover:underline"
            >
              Reset Search
            </button>
          </div>
        )}
      </div>

      {/* TESTING ENVIRONMENT OUTLETS EXPANDABLE CATALOGUE */}
      <AnimatePresence>
        {isTestDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-slate-900 text-white rounded-lg border border-slate-800 shadow-md p-3.5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold tracking-wide">Testing Environment Outlets Directory (20+ Outlets)</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                  Mock Retail Outlets across Routes
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFillTestDemoRun}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  <span>Auto-Fill 20 Outlets Test Run</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTestDrawerOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Route buttons & Filter pills for test scenarios */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] font-medium">Quick Route:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedAreaId('A4');
                  setSearchQuery('');
                  setIsTestDrawerOpen(false);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  selectedAreaId === 'A4'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900'
                }`}
              >
                📍 Switch to Gandhi Bazar (20 Outlets)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAreaId('A1');
                  setSearchQuery('');
                  setIsTestDrawerOpen(false);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedAreaId === 'A1'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Janapriya Layout (20 Outlets)
              </button>

              <span className="text-slate-600 mx-1">|</span>

              <span className="text-slate-400 text-[11px] font-medium">Scenario Filter:</span>
              {(['all', 'high', 'old', 'small'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTestScenarioFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    testScenarioFilter === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {cat === 'all'
                    ? 'All (20+)'
                    : cat === 'high'
                    ? 'High Balance (≥₹2,500)'
                    : cat === 'old'
                    ? 'Old Bills (>30 Days)'
                    : 'Small Dues (≤₹500)'}
                </button>
              ))}
            </div>

            {/* List of test outlets with 1-click test actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredTestOutlets.map((outlet, idx) => (
                <div
                  key={outlet.billId}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-md p-2 flex flex-col justify-between gap-1.5 text-xs transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-700/60 px-1 rounded">
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-bold text-cyan-400">{outlet.billNumber.replace(/\D/g, '') || outlet.billNumber}</span>
                      </div>
                      <span className="font-semibold text-slate-200 mt-0.5 block">{outlet.shopName}</span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {outlet.areaName} {outlet.isOldBill && <span className="text-amber-400 font-bold ml-1">[OLD BILL]</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-amber-300">₹{outlet.balance.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">due</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-700/50 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleJumpToTestOutlet(outlet, '1')}
                      title="Test entry of ₹1 to check automated balance deduction"
                      className="px-1.5 py-0.5 bg-cyan-700/80 hover:bg-cyan-600 text-white rounded text-[10px] font-bold"
                    >
                      Pay ₹1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToTestOutlet(outlet, 'partial')}
                      className="px-1.5 py-0.5 bg-blue-700/80 hover:bg-blue-600 text-white rounded text-[10px] font-bold"
                    >
                      Pay Half
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToTestOutlet(outlet, 'full')}
                      className="px-1.5 py-0.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded text-[10px] font-bold"
                    >
                      Pay Full
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToTestOutlet(outlet, 'nil')}
                      className="px-1.5 py-0.5 bg-amber-700/80 hover:bg-amber-600 text-white rounded text-[10px] font-bold"
                    >
                      Mark 0 (NIL)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToTestOutlet(outlet)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px] font-medium"
                    >
                      Focus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ONE SPECIFIC SPOT: TOTAL VALUE OF ALL BILLS BASED ON AREA */}
      <div className="bg-slate-900 text-white rounded-lg p-3.5 border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-inner shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-blue-200">
              Selected Route Territory
            </div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              <span>{activeAreaName}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-800 text-blue-200 font-mono">
                {filteredAndSortedBills.length} Outlets
              </span>
            </div>
          </div>
        </div>

        {/* The specific spot for area bill values */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
          <div className="bg-slate-800/90 px-3 py-1.5 rounded-md border border-slate-700">
            <div className="text-[10px] text-slate-400 font-sans">Total Area Bills Value</div>
            <div className="text-sm font-black text-amber-300">
              ₹{totalOriginalBalance.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-800/90 px-3 py-1.5 rounded-md border border-slate-700">
            <div className="text-[10px] text-slate-400 font-sans">Total Collected</div>
            <div className="text-sm font-black text-emerald-400">
              ₹{totalEnteredCollection.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-800/90 px-3 py-1.5 rounded-md border border-slate-700">
            <div className="text-[10px] text-slate-400 font-sans">Area Balance Due</div>
            <div className="text-sm font-bold text-slate-200">
              ₹{totalRemainingBalance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Salesman Keyboard Entry Navigation Tip */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="text-slate-700 font-semibold">{filteredAndSortedBills.length} Pending Outlets</span>
          <span>•</span>
          <span>Fill Amount (₹) to automatically compute real-time bill balance</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <span>Salesman Rapid Fill:</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-800 shadow-2xs">Enter ↵</kbd>
          <span>or</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-800 shadow-2xs">↓</kbd>
          <span>to jump to next outlet</span>
        </div>
      </div>

      {/* MAIN SINGLE-ROW OUTLET COLLECTION SHEET */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-x-auto w-full">
        {/* Table Header */}
        {/* Table Header: Exactly 4 User-Requested Columns */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-4 w-full">
          {/* Column 1: Invoice Num */}
          <div className="w-32 shrink-0 flex items-center gap-1.5 font-black text-blue-900">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Invoice Num</span>
          </div>

          {/* Column 2: Outlet Name */}
          <div className="flex-1 min-w-[200px]">Outlet Name</div>

          {/* Column 3: Amount Value */}
          <div className="w-40 shrink-0 text-center font-black text-emerald-900">
            Amount Value (₹)
          </div>

          {/* Column 4: Balance Amount */}
          <div className="w-40 shrink-0 text-right">
            <div className="flex items-center justify-end gap-1 text-slate-900 font-black">
              <Calculator className="w-3.5 h-3.5 text-slate-600" />
              <span>Balance Amount</span>
            </div>
          </div>
        </div>

        {/* Outlet Rows */}
        <div className="divide-y divide-slate-100 w-full">
          {filteredAndSortedBills.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              {searchQuery ? (
                <div>
                  No outlets matching &quot;{searchQuery}&quot;.
                  <button
                    onClick={() => setSearchQuery('')}
                    className="block mx-auto mt-1 text-blue-600 font-semibold underline cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                'No outstanding credit bills found in this route/area.'
              )}
            </div>
          ) : (
            filteredAndSortedBills.map((bill, index) => {
              const calc = getRowCalculation(bill);
              const inputVal = enteredAmounts[bill.billId] ?? '';
              const returnVal = returnDeductions[bill.billId] ?? '';
              const isFirstMatch = searchQuery.trim().length > 0 && index === 0;
              const isRowActive = activeBillId === bill.billId;

              return (
                <motion.div
                  key={bill.billId}
                  layout
                  transition={{ duration: 0.15 }}
                  onMouseEnter={() => setActiveBillId(bill.billId)}
                  className={`px-3 py-2.5 flex items-center gap-4 w-full transition-colors ${
                    isFirstMatch
                      ? 'bg-blue-50/40 ring-1 ring-blue-300'
                      : calc.isNil
                      ? 'bg-amber-50/40'
                      : calc.hasEntry && calc.amount > 0
                      ? 'bg-blue-50/15'
                      : isRowActive
                      ? 'bg-slate-50/80'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* Column 1: Invoice Num */}
                  <div className="w-32 shrink-0 flex items-center gap-1.5">
                    {sortMode === 'travel' && !searchQuery.trim() ? (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className="text-[10px] font-mono font-extrabold text-blue-800 bg-blue-100 px-1 py-0.5 rounded">
                          #{index + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveOutlet(bill.billId, 'up')}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-200 rounded cursor-pointer leading-none"
                            title="Move earlier in travel route"
                          >
                            <ArrowUp className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === filteredAndSortedBills.length - 1}
                            onClick={() => moveOutlet(bill.billId, 'down')}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-200 rounded cursor-pointer leading-none"
                            title="Move later in travel route"
                          >
                            <ArrowDown className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-slate-400 w-5 shrink-0">
                        {index + 1}.
                      </span>
                    )}

                    <div className="font-mono font-black text-blue-900 text-xs">
                      {bill.billNumber.replace(/\D/g, '') || bill.billNumber}
                    </div>
                    {bill.isOldBill && (
                      <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1 py-0.2 rounded shrink-0">
                        OLD
                      </span>
                    )}
                  </div>

                  {/* Column 2: Outlet Name */}
                  <div className="flex-1 min-w-[200px]">
                    <div
                      tabIndex={0}
                      onFocus={() => {
                        setActiveBillId(bill.billId);
                        setFocusedField('name');
                      }}
                      className="text-xs font-bold text-slate-900 outline-none"
                    >
                      <div className="truncate">{bill.shopName}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-normal text-slate-500">
                        <span>Original: ₹{bill.balance.toLocaleString()}</span>
                        {calc.returnAmount > 0 && (
                          <span className="text-rose-700 font-bold bg-rose-50 px-1 rounded">
                            Return Ded: -₹{calc.returnAmount}
                          </span>
                        )}
                        {calc.isNil && (
                          <span className="text-amber-800 font-bold bg-amber-100 px-1 rounded">
                            🛑 NIL Visit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Amount Value (Amount Collection Input) */}
                  <div className="w-40 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono font-semibold">
                        ₹
                      </span>
                      <input
                        ref={el => {
                          inputRefs.current[bill.billId] = el;
                        }}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0 for NIL"
                        value={inputVal}
                        onFocus={() => {
                          setActiveBillId(bill.billId);
                          setFocusedField('amount');
                        }}
                        onKeyDown={e => handleKeyDownAmount(e, index)}
                        onChange={e => handleAmountChange(bill.billId, e.target.value)}
                        className={`w-full pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold text-right rounded-md border focus:outline-none transition-all shadow-2xs ${
                          /* Clean stepper-free styling */
                          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                        } ${
                          calc.isNil
                            ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/50'
                            : isRowActive && focusedField === 'amount'
                            ? 'bg-emerald-50/40 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/40'
                            : calc.hasEntry && calc.amount > 0
                            ? 'bg-white border-blue-400 text-blue-950'
                            : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Column 4: Balance Amount (Dynamic Balance) */}
                  <div className="w-40 shrink-0 flex items-center justify-end">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs font-black select-none border transition-all ${
                        !calc.isValid
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : calc.remainingBalance === 0 && calc.hasEntry
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : calc.hasEntry && calc.amount > 0
                          ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-2xs'
                          : 'bg-slate-100/90 border-slate-200 text-slate-700'
                      }`}
                      title={`Remaining balance ₹${calc.remainingBalance.toLocaleString()}. Stays in route until cleared.`}
                    >
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>₹{calc.remainingBalance.toLocaleString()}</span>
                      {calc.hasEntry && calc.amount > 0 && calc.isValid && calc.remainingBalance > 0 && (
                        <span className="text-[9px] font-sans font-semibold text-blue-700 bg-blue-100 px-1 py-0.2 rounded shrink-0">
                          -₹{calc.amount}
                        </span>
                      )}
                      {calc.isNil && (
                        <span className="text-[9px] font-sans font-semibold text-amber-800 bg-amber-100 px-1 py-0.2 rounded shrink-0">
                          NIL
                        </span>
                      )}
                      {calc.remainingBalance === 0 && calc.hasEntry && (
                        <span className="text-[9px] font-sans font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded shrink-0">
                          CLEARED
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Table Footer: Aligned strictly with the 4 columns */}
        <div className="bg-slate-100 border-t-2 border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-800 flex items-center gap-4 w-full">
          {/* Column 1: Invoice Num */}
          <div className="w-32 shrink-0 font-mono font-black text-slate-700 text-xs tracking-wider">
            TOTAL
          </div>

          {/* Column 2: Outlet Name */}
          <div className="flex-1 min-w-[200px] text-slate-700 font-bold text-xs">
            {filteredAndSortedBills.length} Outlets ({filledCount} entered{nilCount > 0 ? `, ${nilCount} NIL` : ''})
          </div>

          {/* Column 3: Amount Value Total */}
          <div className="w-40 shrink-0 text-center">
            <div className="font-mono font-black text-emerald-800 text-sm bg-emerald-100/90 border border-emerald-300 rounded px-2.5 py-1 inline-block shadow-2xs">
              ₹{totalEnteredCollection.toLocaleString()}
            </div>
          </div>

          {/* Column 4: Balance Amount Total */}
          <div className="w-40 shrink-0 text-right font-mono font-black text-slate-900 text-xs">
            ₹{totalRemainingBalance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* DAILY COLLECTION & CASH CONFIRMATION SECTION */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-4 w-full">
        {/* Header: Total Amount to be Submitted Callout */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Total Collection Amount to be Handed Over
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
                ₹{totalEnteredCollection.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500">
                {filledCount} of {filteredAndSortedBills.length} outlets collected {nilCount > 0 ? `(${nilCount} NIL)` : ''}
                {totalReturnDeductions > 0 && ` • ₹${totalReturnDeductions.toLocaleString()} Returns Deducted`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Mark Remaining NIL */}
            {filledCount < filteredAndSortedBills.length && (
              <button
                type="button"
                onClick={handleMarkUnenteredAsNil}
                className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline decoration-dotted cursor-pointer"
              >
                Mark {filteredAndSortedBills.length - filledCount} unentered as 0 (NIL)
              </button>
            )}

            {/* Print Statement Button */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        {/* Success message banner */}
        {submissionSuccessMsg && (
          <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center gap-2 text-xs font-bold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{submissionSuccessMsg}</span>
          </div>
        )}

        {/* MANDATORY SALESMAN RE-VERIFICATION GATE */}
        {!isReverifiedBySalesman ? (
          <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                    Step 1: Salesman Re-verification Required
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Carefully verify that every collected outlet amount matches your physical receipts. Cash denomination unlocks only after successful re-verification.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSalesmanReverify}
                disabled={totalEnteredCollection <= 0 && filledCount === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-black rounded-lg shadow-xs flex items-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Re-verify &amp; Unlock Cash Denomination</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-white/80 p-2.5 rounded border border-amber-200">
              <div>
                <span className="text-slate-500 font-sans">Territory Route:</span>{' '}
                <strong className="text-slate-800 font-sans">{activeAreaName}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Collected Total:</span>{' '}
                <strong className="text-emerald-700 font-bold">₹{totalEnteredCollection.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Outlets Handled:</span>{' '}
                <strong className="text-slate-800">{filledCount} of {filteredAndSortedBills.length}</strong>
              </div>
              {totalReturnDeductions > 0 && (
                <div>
                  <span className="text-slate-500 font-sans">Returns:</span>{' '}
                  <strong className="text-amber-800">₹{totalReturnDeductions.toLocaleString()}</strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Cash Denomination Form - Unlocked only after successful re-verification */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">
                  ✔ Route Collections Re-verified by Salesman: ₹{totalEnteredCollection.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsReverifiedBySalesman(false)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                Edit / Adjust Outlet Collections
              </button>
            </div>

            {/* Denomination Counter Section */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Step 2: Physical Cash Denomination &amp; Handover
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const autoDenoms = autoCalculateDenominations(totalEnteredCollection);
                    setDenominations(autoDenoms);
                    setTotalCash(calculateCashTotal(autoDenoms));
                  }}
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Auto-Fill Denominations to ₹{totalEnteredCollection.toLocaleString()}</span>
                </button>
              </div>

              <div className="bg-slate-50/60 rounded-lg border border-slate-200 p-3">
                <DenominationCounter
                  value={denominations}
                  cheques={cheques}
                  onlinePayments={onlinePayments}
                  expectedAmount={totalEnteredCollection}
                  onChange={(newDenoms, cash, newChqs, newOnline, total) => {
                    setDenominations(newDenoms);
                    setTotalCash(cash);
                    setCheques(newChqs);
                    setOnlinePayments(newOnline);
                    setGrandTotalHandover(total);
                  }}
                />
              </div>
            </div>

            {/* Final Submission to Cashier */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Once submitted, handover statement is transmitted directly to Admin &amp; Cashier for physical reverification.
              </div>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={totalEnteredCollection <= 0 && filledCount === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-black rounded-md shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Submit Final Handover (₹{totalEnteredCollection.toLocaleString()})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PRINT STATEMENT: COLUMN-WISE LIST OF ENTRIES & CASH HANDOVER FORM */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full my-6 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    Print Collection Statement &amp; Handover Slip
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Official column-wise settlement sheet for salesman and office cashier
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 overflow-y-auto max-h-[80vh] space-y-5 print:p-0 print:overflow-visible">
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    GRB Distributors
                  </h1>
                  <h2 className="text-xs font-bold text-slate-600 tracking-wide uppercase mt-0.5">
                    Daily Route Collection &amp; Cash Handover Statement
                  </h2>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-slate-800">Date: {collectionDate}</div>
                  <div className="text-slate-600">Route Area: <span className="font-bold">{activeAreaName}</span></div>
                  <div className="text-slate-600">Salesman: <span className="font-bold">{salesmanName} ({salesmanId})</span></div>
                </div>
              </div>

              {/* High-level Area Route Summary */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Total Outlets</div>
                  <div className="font-bold text-slate-800 mt-0.5">{filteredAndSortedBills.length} Outlets</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Total Bill Balance</div>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">₹{totalOriginalBalance.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Total Collected</div>
                  <div className="font-bold font-mono text-emerald-700 mt-0.5">₹{totalEnteredCollection.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Remaining Due</div>
                  <div className="font-bold font-mono text-slate-600 mt-0.5">₹{totalRemainingBalance.toLocaleString()}</div>
                </div>
              </div>

              {/* Column-wise List of Entries */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Column-Wise Outlet Entries</span>
                </h4>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        <th className="py-2 px-2.5 w-28">Invoice Num</th>
                        <th className="py-2 px-2.5">Outlet Name</th>
                        <th className="py-2 px-2.5 text-right w-36 bg-emerald-50 text-emerald-900 font-black">
                          Amount Value (₹)
                        </th>
                        <th className="py-2 px-2.5 text-right w-36">Balance Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredAndSortedBills.map((bill, index) => {
                        const calc = getRowCalculation(bill);
                        return (
                          <tr key={bill.billId} className={calc.isNil ? 'bg-amber-50/30' : calc.hasEntry && calc.amount > 0 ? 'bg-emerald-50/20' : ''}>
                            <td className="py-1.5 px-2.5 font-bold text-blue-900">{bill.billNumber.replace(/\D/g, '') || bill.billNumber}</td>
                            <td className="py-1.5 px-2.5 font-sans font-medium text-slate-800">{bill.shopName}</td>
                            <td className="py-1.5 px-2.5 text-right font-black text-emerald-700 bg-emerald-50/50">
                              {calc.hasEntry ? `₹${calc.amount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right text-slate-800 font-bold">
                              ₹{calc.remainingBalance.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Table Grand Total */}
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                        <td colSpan={2} className="py-2 px-2.5 font-sans font-black tracking-wide">
                          GRAND TOTAL ({filteredAndSortedBills.length} OUTLETS)
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-black text-emerald-800 bg-emerald-100 border-x border-emerald-300 text-sm">
                          ₹{totalEnteredCollection.toLocaleString()}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900">
                          ₹{totalRemainingBalance.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Denomination Breakdown Table */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Physical Cash Handover Breakdown</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200 p-3 rounded text-xs font-mono">
                  <div>₹500 × {denominations.d500} = ₹{(denominations.d500 * 500).toLocaleString()}</div>
                  <div>₹200 × {denominations.d200} = ₹{(denominations.d200 * 200).toLocaleString()}</div>
                  <div>₹100 × {denominations.d100} = ₹{(denominations.d100 * 100).toLocaleString()}</div>
                  <div>₹50 × {denominations.d50} = ₹{(denominations.d50 * 50).toLocaleString()}</div>
                  <div>₹20 × {denominations.d20} = ₹{(denominations.d20 * 20).toLocaleString()}</div>
                  <div>₹10 × {denominations.d10} = ₹{(denominations.d10 * 10).toLocaleString()}</div>
                  <div>Coins = ₹{denominations.coins.toLocaleString()}</div>
                  <div className="font-bold text-emerald-700">Total Cash = ₹{totalCash.toLocaleString()}</div>
                </div>
                {cheques.length > 0 && (
                  <div className="mt-1 text-[11px] text-slate-600">
                    Cheques ({cheques.length}): ₹{cheques.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString()}
                  </div>
                )}
                {onlinePayments.length > 0 && (
                  <div className="mt-0.5 text-[11px] text-slate-600">
                    Online UPI ({onlinePayments.length}): ₹{onlinePayments.reduce((s, o) => s + (o.amount || 0), 0).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Sign-Off & Verification Block */}
              <div className="pt-6 border-t-2 border-dashed border-slate-300 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-8">
                    Salesman Signature &amp; Date
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    {salesmanName} ({salesmanId})
                  </div>
                  <div className="text-[10px] text-slate-400">Date: {collectionDate}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-8">
                    Office Cashier / Admin Verification &amp; Stamp
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Status: {todayHandover?.verificationStatus || 'Pending Cashier Count'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {todayHandover?.verifiedBy ? `Verified By: ${todayHandover.verifiedBy}` : 'Pending Office Confirmation'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
