'use client';

import type { Library } from '@/types';

const PAT_KEY = 'podcast-shelf:github-pat';

export const GITHUB_OWNER = 'Chase-Projects';
export const GITHUB_REPO = 'podcast-shelf-personal';
export const LIBRARY_PATH = 'content/library.json';
export const GITHUB_BRANCH = 'main';

/** Public, no-auth URL for reading the latest library.json directly from GitHub's CDN. */
export const LIBRARY_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${LIBRARY_PATH}`;

export function getStoredPat(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PAT_KEY);
}

export function setStoredPat(token: string): void {
  localStorage.setItem(PAT_KEY, token);
}

export function clearStoredPat(): void {
  localStorage.removeItem(PAT_KEY);
}

interface LoadResult {
  library: Library;
  sha: string;
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const clean = b64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function loadLibraryFromGitHub(pat: string): Promise<LoadResult> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${LIBRARY_PATH}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub load failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { content: string; sha: string };
  const library = JSON.parse(base64ToUtf8(json.content)) as Library;
  return { library, sha: json.sha };
}

export async function saveLibraryToGitHub(
  pat: string,
  library: Library,
  sha: string,
  message: string
): Promise<string> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${LIBRARY_PATH}`;
  const body = {
    message,
    content: utf8ToBase64(JSON.stringify(library, null, 2) + '\n'),
    sha,
    branch: GITHUB_BRANCH,
  };
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GitHub save failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { content: { sha: string } };
  return json.content.sha;
}

export async function verifyPat(pat: string): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
    {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
  return res.ok;
}
