export interface Area {
  areaId: string;
  areaName: string;
}

export interface Salesman {
  salesmanId: string;
  salesmanName: string;
  pin: string;
}

export interface Driver {
  driverId: string;
  driverName: string;
  phone: string;
}

export interface SalesmanArea {
  salesmanId: string;
  areaId: string;
}

export type BillStatus = 'pending' | 'paid';

export interface DenominationBreakdown {
  d500?: number;
  d200?: number;
  d100?: number;
  d50?: number;
  d20?: number;
  d10?: number;
  coins?: number;
}

export interface ChequeEntry {
  id: string;
  shopName: string;
  chequeNumber: string;
  bankName?: string;
  amount: number;
}

export interface OnlinePaymentEntry {
  id: string;
  shopName: string;
  utrNumber: string;
  appOrMethod?: string; // GPay, PhonePe, Paytm, UPI, Bank Transfer
  amount: number;
  paymentDate?: string;
}

export interface Bill {
  billId: string;
  billNumber: string;
  shopName: string;
  areaId: string;
  amount: number;
  balance: number;
  dateIssued: string; // YYYY-MM-DD
  status: BillStatus;
  isOldBill?: boolean;
  returnAmount?: number;
  returnReason?: string;
  travelSequence?: number;
}

export interface CollectionHistoryEntry {
  collectionId: string;
  billId: string;
  billNumber: string;
  shopName: string;
  areaId?: string;
  salesmanId: string;
  salesmanName: string;
  amountCollected: number;
  collectionDate: string; // YYYY-MM-DD
  runningBalanceAfter: number;
  paymentMode?: 'cash' | 'cheque' | 'online' | 'nil' | 'other';
  chequeOrUtrNumber?: string;
  isOldBill?: boolean;
  returnAmount?: number; // Expired / damaged goods return deduction
  returnReason?: string; // Reason for return/expiry
  travelSequence?: number; // Sequence in salesman's travel order
  notes?: string;
  verificationStatus?: 'Pending Review' | 'Verified' | 'Flagged';
  adminNotes?: string;
  originalSalesmanAmount?: number;
  adminAdjusted?: boolean;
  adminAdjustedAt?: string;
  adminAdjustedBy?: string;
  isNilPayment?: boolean;
  nilReason?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
}

export interface CashHandoverEntry {
  salesmanId: string;
  salesmanName: string;
  handoverDate: string; // YYYY-MM-DD
  amountHanded: number;
  cashAmount?: number;
  chequeAmount?: number;
  onlineAmount?: number;
  denominations?: DenominationBreakdown;
  cheques?: ChequeEntry[];
  onlinePayments?: OnlinePaymentEntry[];
  verificationStatus?: 'Pending Review' | 'Verified' | 'Flagged';
  adminNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  nilVisitsCount?: number;
}

export interface DriverAssignment {
  assignmentId: string;
  billId: string;
  billNumber: string;
  shopName: string;
  areaId: string;
  salesmanId: string;
  salesmanName: string;
  driverId: string;
  driverName: string;
  amountToCollect: number;
  assignedDate: string;
  scheduledDate: string;
  status: 'Assigned' | 'Collected' | 'Returned Unpaid';
  collectedAmount: number;
  notes?: string;
}

export interface ReconciliationRow {
  salesmanId: string;
  salesmanName: string;
  systemTotal: number;
  amountHanded: number;
  diff: number;
  isMatched: boolean;
  verificationStatus?: 'Pending Review' | 'Verified' | 'Flagged';
  collections: CollectionHistoryEntry[];
}

export type UserRole = 'admin' | 'salesman';
