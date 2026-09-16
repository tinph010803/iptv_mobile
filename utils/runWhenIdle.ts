type IdleCallback = (callback: () => void, options?: { timeout?: number }) => number;
type CancelIdleCallback = (handle: number) => void;

const idleApi = globalThis as typeof globalThis & {
  requestIdleCallback?: IdleCallback;
  cancelIdleCallback?: CancelIdleCallback;
};

export function runWhenIdle(task: () => void): { cancel: () => void } {
  let cancelled = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let idleHandle: number | undefined;

  const run = () => {
    if (!cancelled) task();
  };

  if (idleApi.requestIdleCallback) {
    idleHandle = idleApi.requestIdleCallback(run, { timeout: 1000 });
  } else {
    timeoutHandle = setTimeout(run, 0);
  }

  return {
    cancel: () => {
      cancelled = true;
      if (idleHandle !== undefined && idleApi.cancelIdleCallback) {
        idleApi.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    },
  };
}