'use client';

import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useLibrary } from '@/lib/library';

export default function ImportExport() {
  const { exportJson, importJson } = useLibrary();
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = importJson(text);
    setError(result.ok ? null : result.error);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        className="flex items-center gap-1 text-sm text-foreground hover:text-foreground-bright px-2 py-1 rounded hover:bg-background-secondary transition-colors"
        title="Download library.json (disaster-recovery backup)"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Export</span>
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1 text-sm text-foreground hover:text-foreground-bright px-2 py-1 rounded hover:bg-background-secondary transition-colors"
        title="Upload a library.json (overwrites current draft)"
      >
        <Upload size={16} />
        <span className="hidden sm:inline">Import</span>
      </button>
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
