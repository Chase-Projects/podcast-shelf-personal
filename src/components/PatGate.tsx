'use client';

import { useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import { setStoredPat, verifyPat, GITHUB_OWNER, GITHUB_REPO } from '@/lib/github';

interface Props {
  onAuthed: (pat: string) => void;
}

export default function PatGate({ onAuthed }: Props) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await verifyPat(token.trim());
      if (!ok) {
        setError('Token rejected. Check it has Contents: Read and write on this repo.');
        return;
      }
      setStoredPat(token.trim());
      onAuthed(token.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-background-secondary rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={20} className="text-accent" />
        <h2 className="text-lg font-semibold text-foreground-bright">Admin sign in</h2>
      </div>
      <p className="text-sm text-foreground mb-4">
        Paste a GitHub fine-grained personal access token with{' '}
        <span className="text-foreground-bright">Contents: Read and write</span> on{' '}
        <code className="text-xs">
          {GITHUB_OWNER}/{GITHUB_REPO}
        </code>
        . Stored in your browser only.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="github_pat_..."
          className="w-full text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="w-full flex items-center justify-center gap-2 py-2 bg-accent text-background text-sm rounded disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Unlock admin
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>
      <p className="text-xs text-foreground mt-4">
        Create one at{' '}
        <a
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover"
        >
          github.com/settings/personal-access-tokens/new
        </a>
      </p>
    </div>
  );
}
