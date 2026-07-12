// Minimum gap between live DE profile fetches. Enforced server-side (the only
// real cap — see api sync route) and mirrored by the client button cooldown so
// the UI matches. Profile XP barely moves between sessions; syncing more often
// just risks another IP ban. Tune down only if you sync heavily.
export const MIN_SYNC_INTERVAL_MS = 30 * 60 * 1000
