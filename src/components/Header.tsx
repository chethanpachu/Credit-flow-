import React from 'react';
import { FileSpreadsheet, Download, Terminal, RefreshCw, ShieldCheck, UserCheck, Shield, User, RefreshCcw } from 'lucide-react';
import { UserRole, Salesman } from '../types';

interface HeaderProps {
  onExportExcel: () => void;
  onOpenPythonModal: () => void;
  onResetData: () => void;
  onOpenRoleModal: () => void;
  currentRole: UserRole;
  currentSalesman: Salesman | undefined;
  billCount: number;
  breachCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onExportExcel,
  onOpenPythonModal,
  onResetData,
  onOpenRoleModal,
  currentRole,
  currentSalesman,
  billCount,
  breachCount,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xl tracking-tight shadow">
            GRB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">GRB Collection Tracker</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Excel Local Storage
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Distributorship Daily Cash & Credit Management • <span className="text-slate-300 font-mono">grb_data.xlsx</span>
            </p>
          </div>
        </div>

        {/* Current Active Interface Badge & Switcher */}
        <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg">
          {currentRole === 'admin' ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
              <div>
                <div className="text-xs font-bold text-purple-300 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-purple-400" /> Admin Portal
                </div>
                <div className="text-[10px] text-slate-400">Verifies entries & reconciles cash</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
              <div>
                <div className="text-xs font-bold text-blue-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-400" /> Salesman: {currentSalesman?.salesmanName}
                </div>
                <div className="text-[10px] text-slate-400">Strict territory isolation</div>
              </div>
            </div>
          )}

          <button
            onClick={onOpenRoleModal}
            className="ml-2 px-2.5 py-1 text-[11px] font-bold rounded bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 transition-colors flex items-center gap-1"
            title="Switch between Admin and Salesman roles"
          >
            <RefreshCcw className="w-3 h-3" /> Switch Interface
          </button>
        </div>

        {/* Quick Stats & Top Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {breachCount > 0 && currentRole === 'admin' && (
            <div className="text-xs px-2.5 py-1 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 font-semibold">
              🚨 {breachCount} Overdue (&gt;30d)
            </div>
          )}

          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            title="Download the active Excel workbook grb_data.xlsx with all 8 sheets"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel (.xlsx)
          </button>

          <button
            onClick={onOpenPythonModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
            title="View or download Python Tkinter source code and .EXE build instructions"
          >
            <Terminal className="w-4 h-4" />
            Python Desktop (.EXE) Kit
          </button>

          <button
            onClick={onResetData}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            title="Reset to initial sample data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
