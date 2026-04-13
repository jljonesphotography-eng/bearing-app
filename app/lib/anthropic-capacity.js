function deepHasOverloadedShape(obj, depth = 0) {
  if (depth > 6 || obj == null || typeof obj !== 'object') return false;
  if (obj.type === 'overloaded_error') return true;
  if (obj.error?.type === 'overloaded_error') return true;
  for (const v of Object.values(obj)) {
    if (v != null && typeof v === 'object' && deepHasOverloadedShape(v, depth + 1)) {
      return true;
    }
  }
  return false;
}

/**
 * True when Anthropic returned overload / capacity / 5xx — safe to show a retry message to users.
 */
export function isAnthropicOverloadOrServerError(err) {
  if (!err || typeof err !== 'object') return false;
  if (typeof err.status === 'number' && err.status >= 500) {
    return true;
  }
  if (deepHasOverloadedShape(err)) return true;
  const nested =
    err.error && typeof err.error === 'object' ? err.error.type : undefined;
  if (nested === 'overloaded_error') return true;
  const msg = String(err.message || '');
  if (/\boverloaded_error\b/i.test(msg)) return true;
  if (/\b529\b/.test(msg)) return true;
  if (/\boverloaded\b/i.test(msg)) return true;
  try {
    const j = JSON.parse(msg);
    if (deepHasOverloadedShape(j)) return true;
  } catch {
    /* ignore */
  }
  const body = err.body ?? err.response;
  if (body != null && typeof body === 'object' && deepHasOverloadedShape(body)) {
    return true;
  }
  return false;
}
