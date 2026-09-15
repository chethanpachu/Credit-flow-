import {
  Area,
  Salesman,
  Driver,
  SalesmanArea,
  Bill,
  CollectionHistoryEntry,
  CashHandoverEntry,
  DriverAssignment,
} from '../types';
import {
  initialAreas,
  initialSalesmen,
  initialDrivers,
  initialSalesmanAreas,
  initialBills,
  initialCollectionHistory,
  initialCashHandovers,
  initialDriverAssignments,
} from '../data/initialData';

const STORAGE_KEYS = {
  AREAS: 'grb_areas',
  SALESMEN: 'grb_salesmen',
  DRIVERS: 'grb_drivers',
  SALESMAN_AREAS: 'grb_salesman_areas',
  BILLS: 'grb_bills',
  COLLECTION_HISTORY: 'grb_collection_history',
  CASH_HANDOVER: 'grb_cash_handover',
  DRIVER_ASSIGNMENTS: 'grb_driver_assignments',
};

export function loadInitialData() {
  const getStored = <T>(key: string, fallback: T): T => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  };

  const storedBills = getStored<Bill[]>(STORAGE_KEYS.BILLS, initialBills);
  // Ensure newly added demo bills (such as Gandhi Bazar 20 outlets) are merged in
  const existingBillIds = new Set(storedBills.map(b => b.billId));
  const missingBills = initialBills.filter(b => !existingBillIds.has(b.billId));
  const bills = missingBills.length > 0 ? [...storedBills, ...missingBills] : storedBills;

  const storedSalesmanAreas = getStored<SalesmanArea[]>(STORAGE_KEYS.SALESMAN_AREAS, initialSalesmanAreas);
  const existingSAKeys = new Set(storedSalesmanAreas.map(sa => `${sa.salesmanId}_${sa.areaId}`));
  const missingSA = initialSalesmanAreas.filter(sa => !existingSAKeys.has(`${sa.salesmanId}_${sa.areaId}`));
  const salesmanAreas = missingSA.length > 0 ? [...storedSalesmanAreas, ...missingSA] : storedSalesmanAreas;

  return {
    areas: getStored<Area[]>(STORAGE_KEYS.AREAS, initialAreas),
    salesmen: getStored<Salesman[]>(STORAGE_KEYS.SALESMEN, initialSalesmen),
    drivers: getStored<Driver[]>(STORAGE_KEYS.DRIVERS, initialDrivers),
    salesmanAreas,
    bills,
    collectionHistory: getStored<CollectionHistoryEntry[]>(
      STORAGE_KEYS.COLLECTION_HISTORY,
      initialCollectionHistory
    ),
    cashHandovers: getStored<CashHandoverEntry[]>(
      STORAGE_KEYS.CASH_HANDOVER,
      initialCashHandovers
    ),
    driverAssignments: getStored<DriverAssignment[]>(
      STORAGE_KEYS.DRIVER_ASSIGNMENTS,
      initialDriverAssignments
    ),
  };
}

export function saveAllData(
  areas: Area[],
  salesmen: Salesman[],
  drivers: Driver[],
  salesmanAreas: SalesmanArea[],
  bills: Bill[],
  collectionHistory: CollectionHistoryEntry[],
  cashHandovers: CashHandoverEntry[],
  driverAssignments: DriverAssignment[]
) {
  try {
    localStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(areas));
    localStorage.setItem(STORAGE_KEYS.SALESMEN, JSON.stringify(salesmen));
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
    localStorage.setItem(STORAGE_KEYS.SALESMAN_AREAS, JSON.stringify(salesmanAreas));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
    localStorage.setItem(STORAGE_KEYS.COLLECTION_HISTORY, JSON.stringify(collectionHistory));
    localStorage.setItem(STORAGE_KEYS.CASH_HANDOVER, JSON.stringify(cashHandovers));
    localStorage.setItem(STORAGE_KEYS.DRIVER_ASSIGNMENTS, JSON.stringify(driverAssignments));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export function resetToDefaults() {
  localStorage.removeItem(STORAGE_KEYS.AREAS);
  localStorage.removeItem(STORAGE_KEYS.SALESMEN);
  localStorage.removeItem(STORAGE_KEYS.DRIVERS);
  localStorage.removeItem(STORAGE_KEYS.SALESMAN_AREAS);
  localStorage.removeItem(STORAGE_KEYS.BILLS);
  localStorage.removeItem(STORAGE_KEYS.COLLECTION_HISTORY);
  localStorage.removeItem(STORAGE_KEYS.CASH_HANDOVER);
  localStorage.removeItem(STORAGE_KEYS.DRIVER_ASSIGNMENTS);
}
