import React, { useState } from 'react';
import { DriverAssignment, Driver } from '../types';
import { getTomorrowDateStr, getTodayDateStr } from '../data/initialData';
import { Truck, Search, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface SalesmanAssignmentsTabProps {
  salesmanId: string;
  salesmanName: string;
  driverAssignments: DriverAssignment[];
  onCancelAssignment?: (assignmentId: string) => void;
}

export const SalesmanAssignmentsTab: React.FC<SalesmanAssignmentsTabProps> = ({
  salesmanId,
  salesmanName,
  driverAssignments,
  onCancelAssignment,
}) => {
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Strictly filter to this salesman only!
  const myAssignments = driverAssignments.filter(da => da.salesmanId === salesmanId);

  const filtered = myAssignments.filter(da => {
    if (filterDate && da.scheduledDate !== filterDate) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchShop = da.shopName.toLowerCase().includes(q);
      const matchBill = da.billNumber.toLowerCase().includes(q);
      const matchDriver = da.driverName.toLowerCase().includes(q);
      if (!matchShop && !matchBill && !matchDriver) return false;
    }
    return true;
  });

  const totalAssignedAmount = myAssignments.reduce((sum, da) => sum + da.amountToCollect, 0);
  const totalPending = myAssignments.filter(da => da.status === 'Assigned').length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Logged In Salesman</div>
          <div className="text-base font-bold text-slate-900 mt-1">
            {salesmanName} ({salesmanId})
          </div>
          <div className="text-[11px] text-blue-600 mt-0.5">
            Strict privacy: only your assigned driver dispatches are visible
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Pending Driver Runs</div>
          <div className="text-2xl font-black text-orange-700 mt-1">
            {totalPending} Bills
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Out for driver collection tomorrow
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Cash Out with Drivers</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{totalAssignedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {myAssignments.length} total dispatches
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Filter Scheduled Date:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setFilterDate(getTomorrowDateStr())}
                  className="px-2 py-1 text-[11px] rounded bg-orange-100 hover:bg-orange-200 text-orange-800 font-semibold border border-orange-200"
                >
                  Tomorrow
                </button>
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    All Dates
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Search Shop or Bill #:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search shop, bill, driver"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 w-52"
                />
              </div>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filtered.length}</strong> dispatches
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-600" />
              Bills Assigned to Drivers for Next-Day Collection ({filtered.length})
            </h3>
            <p className="text-xs text-slate-500">
              Assigned during evening settlement to be collected on the morning delivery run.
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No driver assignments recorded by you yet. Use the "🚚 Assign Driver" button in the Evening Collection tab to send bills with delivery drivers for tomorrow.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Assignment ID</th>
                  <th className="px-4 py-3">Shop Name</th>
                  <th className="px-4 py-3 text-center">Bill #</th>
                  <th className="px-4 py-3 text-center">Area</th>
                  <th className="px-4 py-3 text-right">Amount to Collect</th>
                  <th className="px-4 py-3">Assigned Driver</th>
                  <th className="px-4 py-3 text-center">Scheduled Date</th>
                  <th className="px-4 py-3">Delivery Notes</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(da => (
                  <tr key={da.assignmentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {da.assignmentId}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {da.shopName}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-blue-700">
                      {da.billNumber}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">
                      {da.areaId}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-orange-700">
                      ₹{da.amountToCollect.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {da.driverName}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {da.scheduledDate}
                    </td>
                    <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">
                      {da.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          da.status === 'Collected'
                            ? 'bg-emerald-100 text-emerald-800'
                            : da.status === 'Returned Unpaid'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {da.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
