'use client';

import { useState } from 'react';
import { Loader2, CloudUpload, Check, AlertCircle } from 'lucide-react';
import { useLibrary } from '@/lib/library';
import { saveLibraryToGitHub } from '@/lib/github';

interface Props {
  pat: string;
  sha: string;
  onSaved: (newSha: string) => void;
}

type Status = 'idle' | 'saving' | 'saved' | 'error';

export default function SaveButton({ pat, sha, onSaved }: Props) {
  const { library, dirty, resetDirty } = useLibrary();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setStatus('saving');
    setError(null);
    try {
      const newSha = await saveLibraryToGitHub(
        pat,
        library,
        sha,
        `Update library.json (${new Date().toISOString()})`
      );
      onSaved(newSha);
      resetDirty();
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {status === 'saved' && (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <Check size={14} />
          Saved
        </span>
      )}
      {status === 'error' && (
        <span
          className="flex items-center gap-1 text-xs text-red-400"
          title={error ?? ''}
        >
          <AlertCircle size={14} />
          Save failed
        </span>
      )}
      <button
        onClick={handleSave}
        disabled={!dirty || status === 'saving'}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-background text-sm rounded disabled:opacity-50"
      >
        {status === 'saving' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <CloudUpload size={14} />
        )}
        {dirty ? 'Save & Publish' : 'No changes'}
      </button>
    </div>
  );
}
