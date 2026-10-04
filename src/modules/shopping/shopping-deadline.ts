import type { ShoppingError } from "./shopping.types";

/** Abort the underlying operation, including body reads, and bound uncooperative adapters. */
export async function boundedOperation<T>(
  parent: AbortSignal,
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutError: ShoppingError,
): Promise<T> {
  if (parent.aborted || timeoutMs <= 0) throw timeoutError;
  const controller = new AbortController();
  const abort = (): void => controller.abort(timeoutError);
  const timer = setTimeout(abort, timeoutMs);
  parent.addEventListener("abort", abort, { once: true });
  let rejectOnAbort: (() => void) | undefined;
  const cancelled = new Promise<never>((_resolve, reject) => {
    rejectOnAbort = () => reject(timeoutError);
    controller.signal.addEventListener("abort", rejectOnAbort, { once: true });
  });
  try {
    return await Promise.race([operation(controller.signal), cancelled]);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", abort);
    if (rejectOnAbort) controller.signal.removeEventListener("abort", rejectOnAbort);
    // Release any remaining resource owned by this operation on success or failure.
    controller.abort();
  }
}
