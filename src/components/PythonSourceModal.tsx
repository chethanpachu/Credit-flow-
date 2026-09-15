import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal, FileCode, BookOpen, Layers, ShieldCheck } from 'lucide-react';
import { downloadPythonProjectZip, pythonSourceFiles } from '../services/zipExport';

interface PythonSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainPyCode: string;
  excelManagerPyCode: string;
}

export const PythonSourceModal: React.FC<PythonSourceModalProps> = ({
  isOpen,
  onClose,
  mainPyCode,
  excelManagerPyCode,
}) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'main' | 'excel' | 'bat' | 'iss' | 'req'>('instructions');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const getActiveCode = () => {
    switch (activeTab) {
      case 'main':
        return mainPyCode;
      case 'excel':
        return excelManagerPyCode;
      case 'bat':
        return pythonSourceFiles['build_exe.bat'];
      case 'iss':
        return pythonSourceFiles['installer.iss'];
      case 'req':
        return pythonSourceFiles['requirements.txt'];
      case 'instructions':
      default:
        return pythonSourceFiles['README.md'];
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadPythonProjectZip(mainPyCode, excelManagerPyCode);
    } catch (err) {
      console.error('Failed to create zip', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-5xl w-full h-[85vh] flex flex-col border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Python + Tkinter Desktop Application Package &amp; .EXE Builder
              </h2>
              <p className="text-xs text-slate-400">
                100% Offline Windows Desktop App • Excel Storage (<code className="text-slate-200">openpyxl</code>) • PyInstaller Standalone .EXE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isZipping ? 'Packaging ZIP...' : 'Download Full Python App (.zip)'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('instructions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'instructions'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Instructions &amp; Setup Guide
            </button>
            <button
              onClick={() => setActiveTab('main')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'main'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> main.py (Tkinter GUI)
            </button>
            <button
              onClick={() => setActiveTab('excel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'excel'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> excel_manager.py (openpyxl)
            </button>
            <button
              onClick={() => setActiveTab('bat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'bat'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> build_exe.bat
            </button>
            <button
              onClick={() => setActiveTab('iss')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'iss'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> installer.iss (Inno Setup)
            </button>
            <button
              onClick={() => setActiveTab('req')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'req'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              requirements.txt
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Code
              </>
            )}
          </button>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-100">
          <pre className="whitespace-pre-wrap leading-relaxed">{getActiveCode()}</pre>
        </div>

        {/* Bottom Banner */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span className="font-semibold text-slate-700">
            Tip: Download the full ZIP archive to get all 6 files ready to build on Windows!
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
