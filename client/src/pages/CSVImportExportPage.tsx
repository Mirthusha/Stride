import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { api } from '../lib/api';
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export const CSVImportExportPage: React.FC = () => {
  const { currentProject } = useProject();

  const [rawCsvText, setRawCsvText] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleCsv = `Title,Type,Status,Priority,Story Points,Description
Implement OAuth2 login provider,story,todo,high,5,Support GitHub and Google OAuth2 authentication
Fix session expiration token refresh,bug,in_progress,critical,3,Token was refreshing 10 seconds late
Deploy production database read-replica,task,todo,medium,8,AWS RDS Aurora PostgreSQL read-replica deployment`;

  const handleExport = () => {
    if (!currentProject) return;
    const url = api.customization.getExportCsvUrl(currentProject.id);
    window.open(url, '_blank');
  };

  const parseCsvToRows = (text: string) => {
    const lines = text.trim().split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  };

  const handlePreview = async () => {
    if (!currentProject || !rawCsvText.trim()) {
      setError('Please provide CSV data to preview.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const rows = parseCsvToRows(rawCsvText);
      const res = await api.customization.importWorkItems(currentProject.id, rows, true);
      setPreviewResult(res);
      setImportResult(null);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV preview');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!currentProject || !rawCsvText.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const rows = parseCsvToRows(rawCsvText);
      const res = await api.customization.importWorkItems(currentProject.id, rows, false);
      setImportResult(res);
      setPreviewResult(null);
      setRawCsvText('');
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Data Portability
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              CSV Export & Import Studio
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Export work items with formula injection security protection, or import backlogs with row-level validation.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="btn-pill-primary text-xs flex items-center gap-1.5"
          title="Export current project work items to CSV"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Work Items CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Import Form & Sample Data */}
        <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <h3 className="font-bold text-sm text-zinc-900">Import Work Items</h3>
            <button
              onClick={() => setRawCsvText(sampleCsv)}
              className="text-[11px] font-bold text-emerald-800 hover:underline"
            >
              Load Sample CSV Data
            </button>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-zinc-600 block text-xs">
              Paste Raw CSV Text (or headers: Title, Type, Status, Priority, Story Points, Description)
            </label>
            <textarea
              rows={8}
              value={rawCsvText}
              onChange={(e) => setRawCsvText(e.target.value)}
              placeholder="Title,Type,Status,Priority,Story Points,Description&#10;Implement feature X,story,todo,high,5,Feature details..."
              className="w-full font-mono text-xs border border-zinc-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handlePreview}
              disabled={loading || !rawCsvText.trim()}
              className="px-5 py-2.5 rounded-full border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-semibold text-xs transition-all"
            >
              Preview & Validate Rows
            </button>

            {previewResult && previewResult.valid_count > 0 && (
              <button
                onClick={handleCommitImport}
                disabled={loading}
                className="btn-pill-primary text-xs flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Commit Import ({previewResult.valid_count} Items)</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Preview & Validation Results */}
        <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4">
          <h3 className="font-bold text-sm text-zinc-900">Validation & Preview Output</h3>

          {importResult ? (
            <div className="p-5 rounded-2xl bg-mint-50 border border-emerald-200 text-xs space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <span>Import Succeeded!</span>
              </div>
              <p className="text-zinc-700">
                Successfully created and persisted <strong className="text-emerald-950 font-mono">{importResult.imported_count}</strong> work items in project "{currentProject?.name}".
              </p>
            </div>
          ) : previewResult ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <div className="font-bold text-zinc-500 uppercase text-[10px]">Total Rows</div>
                  <div className="text-xl font-bold font-mono text-zinc-900 mt-0.5">{previewResult.total_rows}</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="font-bold text-emerald-800 uppercase text-[10px]">Valid Items</div>
                  <div className="text-xl font-bold font-mono text-emerald-950 mt-0.5">{previewResult.valid_count}</div>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="font-bold text-rose-800 uppercase text-[10px]">Errors</div>
                  <div className="text-xl font-bold font-mono text-rose-950 mt-0.5">{previewResult.error_count}</div>
                </div>
              </div>

              {previewResult.sample_valid && (
                <div className="space-y-2">
                  <div className="font-bold text-zinc-700 text-xs">Valid Items Sample:</div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {previewResult.sample_valid.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-zinc-200 flex items-center justify-between">
                        <span className="font-bold text-zinc-900 truncate max-w-xs">{item.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 font-bold uppercase">{item.type}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-mint-100 text-emerald-900 font-bold uppercase">{item.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewResult.errors && previewResult.errors.length > 0 && (
                <div className="space-y-1 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <div className="font-bold">Row Errors Detected:</div>
                  {previewResult.errors.map((e: any, idx: number) => (
                    <div key={idx}>Row {e.row}: {e.reason}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-zinc-400">
              Paste or load CSV data on the left and click "Preview & Validate Rows" to verify records before persisting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
