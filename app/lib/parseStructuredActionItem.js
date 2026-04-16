/** Matches extraction format: four lines WHAT — / WHY NOW — / THIS WEEK — / WHAT CHANGES — */
export function parseStructuredActionItem(raw) {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return null;
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const parts = {
    what: null,
    whyNow: null,
    thisWeek: null,
    whatChanges: null
  };
  const splitAfterLabel = (line, label) => {
    const upper = line.toUpperCase();
    const labelUpper = label.toUpperCase();
    if (!upper.startsWith(labelUpper)) return null;
    const rest = line.slice(label.length).trim();
    // Prefer long dash, then colon, then standard/en dash. Use only the first delimiter
    // after the label so colons/hyphens inside the sentence are not treated as split points.
    const separators = ['—', ':', '-', '–'];
    for (const sep of separators) {
      const idx = rest.indexOf(sep);
      if (idx === -1) continue;
      if (rest.slice(0, idx).trim().length > 0) continue;
      const value = rest.slice(idx + sep.length).trim();
      if (value) return value;
    }
    if (/^[—:–-]\s*/.test(rest)) {
      const v = rest.replace(/^[—:–-]\s*/, '').trim();
      return v || null;
    }
    return null;
  };
  for (const line of lines) {
    if (!line) continue;
    const what = splitAfterLabel(line, 'WHAT');
    if (what) {
      parts.what = what;
      continue;
    }
    const whyNow = splitAfterLabel(line, 'WHY NOW');
    if (whyNow) {
      parts.whyNow = whyNow;
      continue;
    }
    const thisWeek = splitAfterLabel(line, 'THIS WEEK');
    if (thisWeek) {
      parts.thisWeek = thisWeek;
      continue;
    }
    const whatChanges = splitAfterLabel(line, 'WHAT CHANGES');
    if (whatChanges) {
      parts.whatChanges = whatChanges;
      continue;
    }
  }
  if (parts.what && parts.whyNow && parts.thisWeek && parts.whatChanges) {
    return { ...parts, matchedAllLabels: true };
  }
  // Last-resort fallback: split into 4 roughly equal segments so structured UI stays populated.
  const compact = s.replace(/\s+/g, ' ').trim();
  if (!compact) return null;
  const tokens = compact.split(' ').filter(Boolean);
  if (tokens.length === 0) return null;
  const chunkSize = Math.ceil(tokens.length / 4);
  const segs = [];
  for (let i = 0; i < 4; i++) {
    const start = i * chunkSize;
    const end = Math.min(tokens.length, (i + 1) * chunkSize);
    const seg = tokens.slice(start, end).join(' ').trim();
    segs.push(seg);
  }
  const fallback = {
    what: segs[0] || compact,
    whyNow: segs[1] || segs[0] || compact,
    thisWeek: segs[2] || segs[1] || segs[0] || compact,
    whatChanges: segs[3] || segs[2] || segs[1] || segs[0] || compact
  };
  return { ...fallback, matchedAllLabels: false };
}
