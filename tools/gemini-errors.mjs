// What a Gemini 429 means, from its error details (google.rpc.QuotaFailure / RetryInfo):
//   noaccess: the quota is 0 (free tier with no image quota, so billing is needed)
//   daily:    a per-day quota is used up (stop; resume tomorrow)
//   minute:   a per-minute rate limit, or Vertex AI's shared-capacity "Resource exhausted,
//             try again later" (wait retryMs, then retry)
//   other:    anything else, such as a spend cap (stop)
export function classify429(json) {
  const err = json?.error ?? {};
  const msg = err.message ?? '';
  const details = err.details ?? [];
  const violations = details.flatMap((d) => d.violations ?? []);
  const retry = details.find((d) => d.retryDelay)?.retryDelay;
  const retryMs = retry ? Math.round(parseFloat(retry) * 1000) : null;
  if (/limit: 0\b/.test(msg) || violations.some((v) => v.quotaValue === '0')) return { kind: 'noaccess', retryMs };
  const ids = violations.map((v) => v.quotaId ?? '');
  if (ids.some((id) => /PerDay/i.test(id))) return { kind: 'daily', retryMs };
  if (ids.some((id) => /PerMinute/i.test(id)) || err.status === 'RESOURCE_EXHAUSTED' || /per.?minute|rate limit|try again later|resource.{0,20}exhausted/i.test(msg))
    return { kind: 'minute', retryMs: retryMs ?? 20000 };
  return { kind: 'other', retryMs };
}
