import { HttpError } from './errors';

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(createAbortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function createAbortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

function isRateLimited(e: unknown): boolean {
  return e instanceof HttpError && e.status === 429;
}

/**
 * Serializes requests and enforces a minimum spacing (Nominatim ~1/s).
 */
export class ThrottledQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private lastFinish = 0;

  constructor(
    private minIntervalMs: number,
    private maxRetries: number,
    private retryBackoffBaseMs: number,
  ) {}

  run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const runOne = async (): Promise<T> => {
      const wait = Math.max(0, this.minIntervalMs - (Date.now() - this.lastFinish));
      if (wait > 0) {
        await sleep(wait, signal);
      }
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const result = await task();
          this.lastFinish = Date.now();
          return result;
        } catch (e) {
          if (signal?.aborted || isAbortError(e)) {
            throw e;
          }
          if (isRateLimited(e) && attempt < this.maxRetries) {
            const backoff = this.retryBackoffBaseMs * 2 ** attempt;
            attempt += 1;
            await sleep(backoff, signal);
            continue;
          }
          this.lastFinish = Date.now();
          throw e;
        }
      }
    };

    const chained = this.tail.then(() => runOne(), () => runOne());
    this.tail = chained.then(
      () => undefined,
      () => undefined,
    );
    return chained;
  }
}
