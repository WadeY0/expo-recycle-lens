// Serialize storage writes/deletes so a slow write from an old session cannot
// finish after the credentials of a newer login. A failure does not block the queue.
let pending: Promise<void> = Promise.resolve();
export function sessionStorageOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const next = pending.then(operation, operation);
  pending = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
