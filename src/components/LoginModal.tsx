import React, { useState } from 'react';
import { Salesman, UserRole } from '../types';
import { Shield, User, Key, Lock, ArrowRight, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesmen: Salesman[];
  currentRole: UserRole;
  currentSalesmanId: string;
  onSelectRole: (role: UserRole, salesmanId?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  salesmen,
  currentRole,
  currentSalesmanId,
  onSelectRole,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'salesman' | 'admin'>(currentRole);
  const [selectedSalesman, setSelectedSalesman] = useState<string>(
    currentSalesmanId || (salesmen.length > 0 ? salesmen[0].salesmanId : '')
  );
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSalesmanLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const sm = salesmen.find(s => s.salesmanId === selectedSalesman);
    const expectedPin = sm?.pin || '1234';

    if (pin && pin !== expectedPin) {
      setErrorMsg(`Invalid PIN for ${sm?.salesmanName}. Default is 1234.`);
      return;
    }

    onSelectRole('salesman', selectedSalesman);
    onClose();
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (pin && pin !== '9999') {
      setErrorMsg('Invalid Admin PIN. Default is 9999.');
      return;
    }

    onSelectRole('admin');
    onClose();
  };

  const quickSwitchSalesman = (sId: string) => {
    onSelectRole('salesman', sId);
    onClose();
  };

  const quickSwitchAdmin = () => {
    onSelectRole('admin');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xl">
              GRB
            </div>
            <div>
              <h3 className="font-bold text-base">Select Portal Interface</h3>
              <p className="text-xs text-slate-400">
                Choose role for dual-interface access & isolation
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('salesman');
              setErrorMsg(null);
              setPin('');
            }}
            className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'salesman'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            Salesman Interface
          </button>
          <button
            onClick={() => {
              setActiveTab('admin');
              setErrorMsg(null);
              setPin('');
            }}
            className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'admin'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Admin Interface
          </button>
        </div>

        {errorMsg && (
          <div className="mx-5 mt-4 p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Salesman Login View */}
        {activeTab === 'salesman' && (
          <div className="p-5 space-y-4 text-xs">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900 leading-relaxed">
              <strong className="block mb-0.5">Strict Privacy Isolation:</strong>
              Salesmen only have access to bills, areas, and collections in their assigned territories. They cannot view any other salesman's records.
            </div>

            <form onSubmit={handleSalesmanLogin} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Salesman Account: *
                </label>
                <select
                  value={selectedSalesman}
                  onChange={e => setSelectedSalesman(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  {salesmen.map(s => (
                    <option key={s.salesmanId} value={s.salesmanId}>
                      {s.salesmanId} — {s.salesmanName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Salesman PIN (Default: 1234):
                </label>
                <input
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => quickSwitchSalesman(selectedSalesman)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Quick Demo Login
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  Enter Salesman Portal <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            <div className="border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                1-Click Salesman Switch:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {salesmen.map(s => (
                  <button
                    key={s.salesmanId}
                    type="button"
                    onClick={() => quickSwitchSalesman(s.salesmanId)}
                    className="p-2 text-left rounded border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="font-bold text-slate-900">{s.salesmanName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">ID: {s.salesmanId}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Admin Login View */}
        {activeTab === 'admin' && (
          <div className="p-5 space-y-4 text-xs">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-purple-900 leading-relaxed">
              <strong className="block mb-0.5">Full Verification & Audit Control:</strong>
              Admin verifies entries per salesman, manages next-day driver collection manifests, audits 30-day credit breaches, and reconciles cash handovers.
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Admin PIN (Default: 9999):
                </label>
                <input
                  type="password"
                  placeholder="Enter Admin PIN"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={quickSwitchAdmin}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Quick Demo Login (PIN: 9999)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  Enter Admin Portal <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
