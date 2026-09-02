/**
 * In-process concurrency limiter for AI extraction (Track 3).
 *
 * Gemini 2.5 Flash extractions can take up to 10 minutes each. Without a cap,
 * N simultaneous uploads fire N concurrent Gemini calls, which can hit rate
 * limits and pile up. This is a tiny async semaphore — no external deps, no
 * Redis. Concurrency is bounded to MAX_CONCURRENCY (default 3).
 *
 * NOTE: This keeps the request/response synchronous (the client still waits
 * for its own job), it just prevents unbounded concurrent upstream calls.
 * For true background processing + multi-replica scaling, we'd need an
 * external queue AND a shared DB (Postgres/D1) — out of scope for now.
 */

const MAX_CONCURRENCY = Number(process.env.EXTRACTION_CONCURRENCY) || 3;

let active = 0;
const waiting = [];

async function acquire() {
  if (active < MAX_CONCURRENCY) {
    active += 1;
    return () => {
      active -= 1;
      const next = waiting.shift();
      if (next) next();
    };
  }
  return new Promise((resolve) => {
    waiting.push(() => {
      active += 1;
      resolve(() => {
        active -= 1;
        const nxt = waiting.shift();
        if (nxt) nxt();
      });
    });
  });
}

/**
 * Run `fn` under the extraction concurrency limit. Returns fn's result.
 */
async function withExtractionConcurrency(fn) {
  const release = await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

module.exports = { withExtractionConcurrency, MAX_CONCURRENCY };