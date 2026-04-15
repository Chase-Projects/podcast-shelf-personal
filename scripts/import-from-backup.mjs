#!/usr/bin/env node
// One-time (re-runnable) importer: parses a Supabase pg_dump .backup file
// and emits content/library.json in the shape the site expects.
//
// Usage:
//   node scripts/import-from-backup.mjs /path/to/db_cluster-XX.backup [username]
//
// If username is omitted, all user_podcasts are imported (fine for single-user dumps).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const [, , backupPathArg, usernameFilter] = process.argv;
if (!backupPathArg) {
  console.error('Usage: node scripts/import-from-backup.mjs <backup-file> [username]');
  process.exit(1);
}

const backupPath = resolve(backupPathArg);
const raw = readFileSync(backupPath, 'utf8');

// Parse a `COPY public.<table> (<cols>) FROM stdin;` block into rows of objects.
function parseCopyBlock(tableName) {
  const header = new RegExp(`^COPY public\\.${tableName} \\(([^)]+)\\) FROM stdin;$`, 'm');
  const match = raw.match(header);
  if (!match) return [];

  const columns = match[1].split(',').map((s) => s.trim());
  const startIdx = match.index + match[0].length + 1; // skip header + newline
  const endIdx = raw.indexOf('\n\\.\n', startIdx);
  if (endIdx === -1) return [];

  const body = raw.slice(startIdx, endIdx);
  if (!body.trim()) return [];

  return body.split('\n').map((line) => {
    const fields = line.split('\t');
    const row = {};
    columns.forEach((col, i) => {
      const v = fields[i];
      row[col] = v === '\\N' ? null : v;
    });
    return row;
  });
}

const profiles = parseCopyBlock('profiles');
const podcasts = parseCopyBlock('podcasts');
const userPodcasts = parseCopyBlock('user_podcasts');
const customRatings = parseCopyBlock('custom_ratings');
const favoriteEpisodes = parseCopyBlock('favorite_episodes');

// Resolve target user
let userId = null;
let displayName = 'My';
if (usernameFilter) {
  const p = profiles.find((p) => p.username === usernameFilter);
  if (!p) {
    console.error(`No profile with username "${usernameFilter}". Available: ${profiles.map((p) => p.username).join(', ')}`);
    process.exit(1);
  }
  userId = p.id;
  displayName = (p.display_name || p.username).trim();
} else if (profiles.length === 1) {
  userId = profiles[0].id;
  displayName = (profiles[0].display_name || profiles[0].username).trim();
}

const podcastById = new Map(podcasts.map((p) => [p.id, p]));
const crByUserPodcast = new Map();
for (const cr of customRatings) {
  if (!crByUserPodcast.has(cr.user_podcast_id)) crByUserPodcast.set(cr.user_podcast_id, []);
  crByUserPodcast.get(cr.user_podcast_id).push({
    category: cr.category_name,
    rating: parseFloat(cr.rating),
  });
}
const feByUserPodcast = new Map();
for (const fe of favoriteEpisodes) {
  if (!feByUserPodcast.has(fe.user_podcast_id)) feByUserPodcast.set(fe.user_podcast_id, []);
  feByUserPodcast.get(fe.user_podcast_id).push({
    title: fe.episode_title,
    number: fe.episode_number,
    notes: fe.notes,
    addedAt: toIso(fe.created_at),
  });
}

function toIso(pgTimestamp) {
  if (!pgTimestamp) return null;
  // pg_dump format: "2025-12-17 00:37:57.274739+00" → ISO 8601
  const normalized = pgTimestamp
    .replace(' ', 'T')
    .replace(/(\.\d{1,6})\d*(?=[+-])/, '$1') // trim sub-millisecond precision
    .replace(/([+-]\d{2})$/, '$1:00'); // +00 → +00:00
  return new Date(normalized).toISOString();
}

const filtered = userId ? userPodcasts.filter((up) => up.user_id === userId) : userPodcasts;

const libraryPodcasts = filtered
  .map((up) => {
    const p = podcastById.get(up.podcast_id);
    if (!p) return null;
    return {
      itunesId: p.itunes_id,
      title: p.title,
      author: p.author,
      artworkUrl: p.artwork_url,
      feedUrl: p.feed_url,
      itunesUrl: p.itunes_url,
      artistUrl: p.artist_url,
      overallRating: up.overall_rating === null ? null : parseFloat(up.overall_rating),
      reviewText: up.review_text || null,
      isFavorite: up.is_favorite === 't',
      addedAt: toIso(up.created_at),
      updatedAt: toIso(up.updated_at),
      customRatings: crByUserPodcast.get(up.id) || [],
      favoriteEpisodes: feByUserPodcast.get(up.id) || [],
    };
  })
  .filter(Boolean)
  .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

const library = {
  version: 1,
  displayName,
  podcasts: libraryPodcasts,
};

const outDir = resolve(repoRoot, 'content');
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, 'library.json');
writeFileSync(outFile, JSON.stringify(library, null, 2) + '\n');

console.log(`Imported ${libraryPodcasts.length} podcasts → ${outFile}`);
console.log(`  custom ratings: ${customRatings.length}`);
console.log(`  favorite episodes: ${favoriteEpisodes.length}`);
