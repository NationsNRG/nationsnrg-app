import { useState } from "react";

export function useSafeAction() {
  const [locked, setLocked] = useState(false);

  async function run(fn: () => Promise<void>) {
    if (locked) return;

    try {
      setLocked(true);
      await fn();
    } finally {
      setLocked(false);
    }
  }

  return {
    locked,
    run,
  };
}