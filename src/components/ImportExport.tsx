'use client';

import { useRef, useState } from 'react';
import { Download, Upload, AlertCircle } from 'lucide-react';
import { useLibrary } from '@/lib/library';

export default function ImportExport() {
  const { dirty, exportJson, importJson, discardLocalChanges } = useLibrary();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    const text = exportJson();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = importJson(text);
    if (!result.ok) setError(result.error);
    else setError(null);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      {dirty && (
        <span
          className="flex items-center gap-1 text-xs text-accent-orange"
          title="You have unsaved local changes. Export and commit content/library.json to persist them."
        >
          <AlertCircle size={14} />
          Unsaved
        </span>
      )}
      <button
        onClick={handleExport}
        className="flex items-center gap-1 text-sm text-foreground hover:text-foreground-bright px-2 py-1 rounded hover:bg-background-secondary transition-colors"
        title="Download library.json"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Export</span>
      </button>
      <button
        onClick={handleImportClick}
        className="flex items-center gap-1 text-sm text-foreground hover:text-foreground-bright px-2 py-1 rounded hover:bg-background-secondary transition-colors"
        title="Upload a library.json"
      >
        <Upload size={16} />
        <span className="hidden sm:inline">Import</span>
      </button>
      {dirty && (
        <button
          onClick={() => {
            if (confirm('Discard local changes and revert to the bundled library.json?')) {
              discardLocalChanges();
            }
          }}
          className="text-xs text-foreground hover:text-red-400"
          title="Discard local changes"
        >
          Revert
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && (
        <span className="text-xs text-red-400" title={error}>
          Import failed
        </span>
      )}
    </div>
  );
}
