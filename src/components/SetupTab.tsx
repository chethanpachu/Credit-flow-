import React, { useState } from 'react';
import { Area, Salesman, SalesmanArea, Driver } from '../types';
import { MapPin, Users, CheckSquare, Plus, Save, Check, Truck, Key } from 'lucide-react';

interface SetupTabProps {
  areas: Area[];
  salesmen: Salesman[];
  drivers: Driver[];
  salesmanAreas: SalesmanArea[];
  onAddArea: (areaId: string, areaName: string) => void;
  onAddSalesman: (salesmanId: string, salesmanName: string, pin?: string) => void;
  onAddDriver: (driverId: string, driverName: string, phone: string) => void;
  onSaveSalesmanAreas: (salesmanId: string, areaIds: string[]) => void;
}

export const SetupTab: React.FC<SetupTabProps> = ({
  areas,
  salesmen,
  drivers,
  salesmanAreas,
  onAddArea,
  onAddSalesman,
  onAddDriver,
  onSaveSalesmanAreas,
}) => {
  // Add Area state
  const [newAreaId, setNewAreaId] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [areaMsg, setAreaMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Add Salesman state
  const [newSalesmanId, setNewSalesmanId] = useState('');
  const [newSalesmanName, setNewSalesmanName] = useState('');
  const [newSalesmanPin, setNewSalesmanPin] = useState('1234');
  const [salesmanMsg, setSalesmanMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Add Driver state
  const [newDriverId, setNewDriverId] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [driverMsg, setDriverMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Assignment state
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>(
    salesmen.length > 0 ? salesmen[0].salesmanId : ''
  );
  const [assignedAreaIds, setAssignedAreaIds] = useState<string[]>(() => {
    const sId = salesmen.length > 0 ? salesmen[0].salesmanId : '';
    return salesmanAreas.filter(sa => sa.salesmanId === sId).map(sa => sa.areaId);
  });
  const [assignSaved, setAssignSaved] = useState(false);

  // Handle selecting different salesman in assignment panel
  const handleSelectSalesman = (sId: string) => {
    setSelectedSalesmanId(sId);
    const existing = salesmanAreas.filter(sa => sa.salesmanId === sId).map(sa => sa.areaId);
    setAssignedAreaIds(existing);
    setAssignSaved(false);
  };

  const handleToggleArea = (areaId: string) => {
    setAssignSaved(false);
    if (assignedAreaIds.includes(areaId)) {
      setAssignedAreaIds(assignedAreaIds.filter(id => id !== areaId));
    } else {
      setAssignedAreaIds([...assignedAreaIds, areaId]);
    }
  };

  const handleSaveAssignments = () => {
    if (!selectedSalesmanId) return;
    onSaveSalesmanAreas(selectedSalesmanId, assignedAreaIds);
    setAssignSaved(true);
    setTimeout(() => setAssignSaved(false), 2500);
  };

  const handleCreateArea = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newAreaId.trim().toUpperCase();
    const name = newAreaName.trim();
    if (!id || !name) {
      setAreaMsg({ text: 'Please fill both Area ID and Name.', isError: true });
      return;
    }
    if (areas.some(a => a.areaId === id)) {
      setAreaMsg({ text: `Area ID "${id}" already exists.`, isError: true });
      return;
    }
    onAddArea(id, name);
    setNewAreaId('');
    setNewAreaName('');
    setAreaMsg({ text: `Area ${id} added successfully.` });
    setTimeout(() => setAreaMsg(null), 2500);
  };

  const handleCreateSalesman = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newSalesmanId.trim().toUpperCase();
    const name = newSalesmanName.trim();
    if (!id || !name) {
      setSalesmanMsg({ text: 'Please fill both Salesman ID and Name.', isError: true });
      return;
    }
    if (salesmen.some(s => s.salesmanId === id)) {
      setSalesmanMsg({ text: `Salesman ID "${id}" already exists.`, isError: true });
      return;
    }
    onAddSalesman(id, name, newSalesmanPin.trim() || '1234');
    setNewSalesmanId('');
    setNewSalesmanName('');
    setNewSalesmanPin('1234');
    setSalesmanMsg({ text: `Salesman ${id} added successfully.` });
    setTimeout(() => setSalesmanMsg(null), 2500);
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newDriverId.trim().toUpperCase();
    const name = newDriverName.trim();
    const phone = newDriverPhone.trim();
    if (!id || !name) {
      setDriverMsg({ text: 'Please fill both Driver ID and Name.', isError: true });
      return;
    }
    if (drivers.some(d => d.driverId === id)) {
      setDriverMsg({ text: `Driver ID "${id}" already exists.`, isError: true });
      return;
    }
    onAddDriver(id, name, phone);
    setNewDriverId('');
    setNewDriverName('');
    setNewDriverPhone('');
    setDriverMsg({ text: `Driver ${id} added successfully.` });
    setTimeout(() => setDriverMsg(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          Master Setup: Areas, Salesmen, Drivers & Territory Mapping
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure distribution territories, PIN security credentials, and delivery vans. Fixed territory mappings enforce strict salesman data isolation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Areas */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Distribution Areas ({areas.length})</h3>
            </div>
            <span className="text-xs text-slate-400">Sheet: Areas</span>
          </div>

          <form onSubmit={handleCreateArea} className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="ID (A9)"
                value={newAreaId}
                onChange={e => setNewAreaId(e.target.value)}
                className="col-span-1 px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Area Name (e.g. Koramangala)"
                value={newAreaName}
                onChange={e => setNewAreaName(e.target.value)}
                className="col-span-2 px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Area
            </button>
            {areaMsg && (
              <p className={`text-xs ${areaMsg.isError ? 'text-red-600' : 'text-emerald-600'}`}>
                {areaMsg.text}
              </p>
            )}
          </form>

          <div className="flex-1 max-h-56 overflow-y-auto divide-y divide-slate-100">
            {areas.map(a => (
              <div key={a.areaId} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                <span className="font-mono font-bold text-slate-700 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                  {a.areaId}
                </span>
                <span className="font-medium text-slate-800">{a.areaName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Salesmen & PINs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Salesmen Team & PINs ({salesmen.length})</h3>
            </div>
            <span className="text-xs text-slate-400">Sheet: Salesmen</span>
          </div>

          <form onSubmit={handleCreateSalesman} className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="ID (S5)"
                value={newSalesmanId}
                onChange={e => setNewSalesmanId(e.target.value)}
                className="col-span-1 px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Salesman Full Name"
                value={newSalesmanName}
                onChange={e => setNewSalesmanName(e.target.value)}
                className="col-span-2 px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="PIN"
                value={newSalesmanPin}
                onChange={e => setNewSalesmanPin(e.target.value)}
                className="col-span-1 px-2 py-1.5 text-xs rounded border border-slate-300 font-mono text-center"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Salesman
            </button>
            {salesmanMsg && (
              <p className={`text-xs ${salesmanMsg.isError ? 'text-red-600' : 'text-emerald-600'}`}>
                {salesmanMsg.text}
              </p>
            )}
          </form>

          <div className="flex-1 max-h-56 overflow-y-auto divide-y divide-slate-100">
            {salesmen.map(s => {
              const assignedCount = salesmanAreas.filter(sa => sa.salesmanId === s.salesmanId).length;
              return (
                <div key={s.salesmanId} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                      {s.salesmanId}
                    </span>
                    <span className="font-semibold text-slate-800">{s.salesmanName}</span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                      <Key className="w-3 h-3 text-slate-300" /> PIN: {s.pin || '1234'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {assignedCount} {assignedCount === 1 ? 'area' : 'areas'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 3: Delivery Drivers */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Delivery Drivers & Vehicles ({drivers.length})</h3>
            </div>
            <span className="text-xs text-slate-400">Sheet: Drivers</span>
          </div>

          <form onSubmit={handleCreateDriver} className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="ID (D4)"
                value={newDriverId}
                onChange={e => setNewDriverId(e.target.value)}
                className="col-span-1 px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Driver Name & Van Number"
                value={newDriverName}
                onChange={e => setNewDriverName(e.target.value)}
                className="col-span-2 px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Phone"
                value={newDriverPhone}
                onChange={e => setNewDriverPhone(e.target.value)}
                className="col-span-1 px-2 py-1.5 text-xs rounded border border-slate-300 text-center"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1 py-1.5 px-3 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Delivery Driver
            </button>
            {driverMsg && (
              <p className={`text-xs ${driverMsg.isError ? 'text-red-600' : 'text-emerald-600'}`}>
                {driverMsg.text}
              </p>
            )}
          </form>

          <div className="flex-1 max-h-56 overflow-y-auto divide-y divide-slate-100">
            {drivers.map(d => (
              <div key={d.driverId} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-orange-700 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200">
                    {d.driverId}
                  </span>
                  <span className="font-semibold text-slate-800">{d.driverName}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">{d.phone}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 4: Territory Assignments */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">Assign Areas to Salesman</h3>
            <span className="text-xs text-slate-400">Sheet: SalesmanAreas</span>
          </div>

          <div className="p-4 space-y-4 flex-1 flex flex-col">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Salesman:</label>
              <select
                value={selectedSalesmanId}
                onChange={e => handleSelectSalesman(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {salesmen.map(s => (
                  <option key={s.salesmanId} value={s.salesmanId}>
                    {s.salesmanId} — {s.salesmanName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Check Assigned Areas:</label>
              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded p-2 divide-y divide-slate-100 bg-slate-50/50">
                {areas.map(a => {
                  const isChecked = assignedAreaIds.includes(a.areaId);
                  return (
                    <label
                      key={a.areaId}
                      className="flex items-center gap-2.5 py-1.5 px-2 hover:bg-slate-100 rounded cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArea(a.areaId)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-mono text-slate-600">{a.areaId}</span>
                      <span className="font-medium text-slate-800">{a.areaName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto pt-2">
              <button
                onClick={handleSaveAssignments}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
              >
                {assignSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" /> Saved Assignments!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Territory Assignments
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
