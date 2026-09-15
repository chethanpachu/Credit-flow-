import * as XLSX from 'xlsx';
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

export function exportWorkbook(
  areas: Area[],
  salesmen: Salesman[],
  drivers: Driver[],
  salesmanAreas: SalesmanArea[],
  bills: Bill[],
  collectionHistory: CollectionHistoryEntry[],
  cashHandovers: CashHandoverEntry[],
  driverAssignments: DriverAssignment[]
): void {
  const wb = XLSX.utils.book_new();

  // 1. Areas
  const wsAreas = XLSX.utils.json_to_sheet(
    areas.map(a => ({ AreaID: a.areaId, AreaName: a.areaName })),
    { header: ['AreaID', 'AreaName'] }
  );
  XLSX.utils.book_append_sheet(wb, wsAreas, 'Areas');

  // 2. Salesmen
  const wsSalesmen = XLSX.utils.json_to_sheet(
    salesmen.map(s => ({ SalesmanID: s.salesmanId, SalesmanName: s.salesmanName, PIN: s.pin || '1234' })),
    { header: ['SalesmanID', 'SalesmanName', 'PIN'] }
  );
  XLSX.utils.book_append_sheet(wb, wsSalesmen, 'Salesmen');

  // 3. Drivers
  const wsDrivers = XLSX.utils.json_to_sheet(
    drivers.map(d => ({ DriverID: d.driverId, DriverName: d.driverName, Phone: d.phone })),
    { header: ['DriverID', 'DriverName', 'Phone'] }
  );
  XLSX.utils.book_append_sheet(wb, wsDrivers, 'Drivers');

  // 4. SalesmanAreas
  const wsSalesmanAreas = XLSX.utils.json_to_sheet(
    salesmanAreas.map(sa => ({ SalesmanID: sa.salesmanId, AreaID: sa.areaId })),
    { header: ['SalesmanID', 'AreaID'] }
  );
  XLSX.utils.book_append_sheet(wb, wsSalesmanAreas, 'SalesmanAreas');

  // 5. Bills
  const wsBills = XLSX.utils.json_to_sheet(
    bills.map(b => ({
      BillID: b.billId,
      BillNumber: b.billNumber,
      ShopName: b.shopName,
      AreaID: b.areaId,
      Amount: b.amount,
      Balance: b.balance,
      DateIssued: b.dateIssued,
      Status: b.status,
    })),
    { header: ['BillID', 'BillNumber', 'ShopName', 'AreaID', 'Amount', 'Balance', 'DateIssued', 'Status'] }
  );
  XLSX.utils.book_append_sheet(wb, wsBills, 'Bills');

  // 6. CollectionHistory
  const wsHistory = XLSX.utils.json_to_sheet(
    collectionHistory.map(c => ({
      CollectionID: c.collectionId,
      BillID: c.billId,
      BillNumber: c.billNumber,
      ShopName: c.shopName,
      AreaID: c.areaId || '',
      SalesmanID: c.salesmanId,
      SalesmanName: c.salesmanName,
      AmountCollected: c.amountCollected,
      CollectionDate: c.collectionDate,
      RunningBalanceAfter: c.runningBalanceAfter,
      VerificationStatus: c.verificationStatus || 'Pending Review',
      AdminNotes: c.adminNotes || '',
    })),
    {
      header: [
        'CollectionID',
        'BillID',
        'BillNumber',
        'ShopName',
        'AreaID',
        'SalesmanID',
        'SalesmanName',
        'AmountCollected',
        'CollectionDate',
        'RunningBalanceAfter',
        'VerificationStatus',
        'AdminNotes',
      ],
    }
  );
  XLSX.utils.book_append_sheet(wb, wsHistory, 'CollectionHistory');

  // 7. CashHandover
  const wsHandover = XLSX.utils.json_to_sheet(
    cashHandovers.map(h => ({
      SalesmanID: h.salesmanId,
      SalesmanName: h.salesmanName,
      HandoverDate: h.handoverDate,
      AmountHanded: h.amountHanded,
      VerificationStatus: h.verificationStatus || 'Pending Review',
      AdminNotes: h.adminNotes || '',
    })),
    { header: ['SalesmanID', 'SalesmanName', 'HandoverDate', 'AmountHanded', 'VerificationStatus', 'AdminNotes'] }
  );
  XLSX.utils.book_append_sheet(wb, wsHandover, 'CashHandover');

  // 8. DriverAssignments
  const wsDriverAssign = XLSX.utils.json_to_sheet(
    driverAssignments.map(da => ({
      AssignmentID: da.assignmentId,
      BillID: da.billId,
      BillNumber: da.billNumber,
      ShopName: da.shopName,
      AreaID: da.areaId,
      SalesmanID: da.salesmanId,
      SalesmanName: da.salesmanName,
      DriverID: da.driverId,
      DriverName: da.driverName,
      AmountToCollect: da.amountToCollect,
      AssignedDate: da.assignedDate,
      ScheduledDate: da.scheduledDate,
      Status: da.status,
      CollectedAmount: da.collectedAmount,
      Notes: da.notes || '',
    })),
    {
      header: [
        'AssignmentID',
        'BillID',
        'BillNumber',
        'ShopName',
        'AreaID',
        'SalesmanID',
        'SalesmanName',
        'DriverID',
        'DriverName',
        'AmountToCollect',
        'AssignedDate',
        'ScheduledDate',
        'Status',
        'CollectedAmount',
        'Notes',
      ],
    }
  );
  XLSX.utils.book_append_sheet(wb, wsDriverAssign, 'DriverAssignments');

  // Write file
  XLSX.writeFile(wb, 'grb_data.xlsx');
}
