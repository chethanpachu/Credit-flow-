import React, { useState } from 'react';
import { Driver, DriverAssignment } from '../types';
import { getTodayDateStr, getTomorrowDateStr } from '../data/initialData';
import { Truck, Printer, CheckCircle, XCircle, Search, Filter, Calendar, FileText } from 'lucide-react';

interface DriverManifestTabProps {
  drivers: Driver[];
  driverAssignments: DriverAssignment[];
  onMarkDriverCollection: (assignmentId: string, collectedAmount: number, status: 'Collected' | 'Returned Unpaid') => void;
  isAdmin?: boolean;
}

export const DriverManifestTab: React.FC<DriverManifestTabProps> = ({
  drivers,
  driverAssignments,
  onMarkDriverCollection,
  isAdmin = true,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>(getTomorrowDateStr());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [printPreview, setPrintPreview] = useState<boolean>(false);

  // Filtered assignments
  const filtered = driverAssignments.filter(da => {
    if (selectedDriverId !== 'all' && da.driverId !== selectedDriverId) return false;
    if (filterDate && da.scheduledDate !== filterDate) return false;
    if (statusFilter !== 'all' && da.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchShop = da.shopName.toLowerCase().includes(q);
      const matchBill = da.billNumber.toLowerCase().includes(q);
      const matchSalesman = da.salesmanName.toLowerCase().includes(q);
      if (!matchShop && !matchBill && !matchSalesman) return false;
    }
    return true;
  });

  const totalAssignedAmount = filtered.reduce((sum, da) => sum + da.amountToCollect, 0);
  const totalCollectedAmount = filtered.reduce((sum, da) => sum + da.collectedAmount, 0);

  const selectedDriverObj = drivers.find(d => d.driverId === selectedDriverId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Driver Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Filter by Driver:
              </label>
              <select
                value={selectedDriverId}
                onChange={e => setSelectedDriverId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 focus:ring-2 focus:ring-orange-500 bg-white min-w-[180px]"
              >
                <option value="all">All Drivers ({drivers.length})</option>
                {drivers.map(d => (
                  <option key={d.driverId} value={d.driverId}>
                    {d.driverName}
                  </option>
                ))}
              </select>
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Scheduled Run Date:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={() => setFilterDate(getTodayDateStr())}
                  className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200"
                >
                  Today
                </button>
                <button
                  onClick={() => setFilterDate(getTomorrowDateStr())}
                  className="px-2 py-1 text-[11px] rounded bg-orange-100 hover:bg-orange-200 text-orange-800 font-semibold border border-orange-200"
                >
                  Tomorrow
                </button>
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="px-1.5 py-1 text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status:
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="Assigned">Pending Collection</option>
                <option value="Collected">Collected</option>
                <option value="Returned Unpaid">Returned Unpaid</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Search:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Shop or Bill #"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-orange-500 w-44"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> Print / Export Driver Sheet
            </button>
          </div>
        </div>
      </div>

      {/* Manifest Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Driver Run Schedule</div>
          <div className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-orange-600" />
            {selectedDriverObj ? selectedDriverObj.driverName : 'All Delivery Vans'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Date: {filterDate || 'All Scheduled Dates'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Assigned Bills</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {filtered.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Pending to collect on delivery route
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Cash to Collect</div>
          <div className="text-2xl font-black text-orange-700 mt-1">
            ₹{totalAssignedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            Collected so far: ₹{totalCollectedAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Printable Run Sheet & Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* Printable Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 print:bg-white flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              GRB Distributorship — Driver Next-Day Collection Manifest
            </h2>
            <p className="text-xs text-slate-500">
              Handover sheet for delivery driver to collect pending credit dues along route.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-orange-100 text-orange-800 font-bold border border-orange-200">
              Run Date: {filterDate || getTomorrowDateStr()}
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No bills assigned to drivers matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-2.5">Invoice Num</th>
                  <th className="px-3 py-2.5">Outlet Name</th>
                  <th className="px-3 py-2.5 text-right">Amount Value (₹)</th>
                  <th className="px-3 py-2.5 text-right">Balance Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => {
                  const remaining = Math.max(0, item.amountToCollect - item.collectedAmount);
                  return (
                    <tr key={item.assignmentId} className="hover:bg-slate-50/70">
                      {/* 1. Invoice Num */}
                      <td className="px-3 py-2.5 font-mono font-bold text-blue-700">
                        {item.billNumber}
                      </td>

                      {/* 2. Outlet Name */}
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900">{item.shopName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Driver: {item.driverName} • Area: {item.areaId} • Sls: {item.salesmanName}
                        </div>
                      </td>

                      {/* 3. Amount Value */}
                      <td className="px-3 py-2.5 text-right font-black text-orange-700 font-mono">
                        ₹{item.amountToCollect.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 4. Balance Amount */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`font-mono font-bold ${
                              item.status === 'Collected' ? 'text-emerald-700' : 'text-slate-800'
                            }`}
                          >
                            {item.status === 'Collected'
                              ? 'PAID'
                              : `₹${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                          </span>
                          {isAdmin && item.status === 'Assigned' && (
                            <div className="inline-flex items-center gap-1 print:hidden">
                              <button
                                onClick={() => onMarkDriverCollection(item.assignmentId, item.amountToCollect, 'Collected')}
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-2xs"
                                title="Mark cash received from driver"
                              >
                                <CheckCircle className="w-2.5 h-2.5" /> ✔
                              </button>
                              <button
                                onClick={() => onMarkDriverCollection(item.assignmentId, 0, 'Returned Unpaid')}
                                className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 hover:bg-red-200 text-red-800"
                                title="Shop did not pay"
                              >
                                <XCircle className="w-2.5 h-2.5" /> ✕
                              </button>
                            </div>
                          )}
                          {item.status !== 'Assigned' && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                item.status === 'Collected'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {item.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="px-3 py-2.5 text-right text-slate-700">
                    Grand Total to Collect ({filtered.length} Bills):
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-orange-700 font-mono">
                    ₹{totalAssignedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-700 text-xs">
                    Collected: ₹{totalCollectedAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
