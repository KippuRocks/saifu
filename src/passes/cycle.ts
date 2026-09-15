// The pass on the ticket's screen, kept fresh (T-030-07; NFR-5): a pass is
// produced when the screen opens, and replaced before its window closes, for as
// long as the screen is open and the app is in the foreground. Every
// replacement is a new pass, so a new passkey assertion.
//
// When the holder dismisses a prompt, or a pass cannot be produced, the cycle
// stops rather than prompting again; the holder starts it again by asking for a
// new pass.

import type { ProducedPass } from "./produce.ts";
import { refreshAt } from "./produce.ts";

export type PassState =
  | { readonly kind: "signing"; readonly previous: ProducedPass | null }
  | { readonly kind: "showing"; readonly pass: ProducedPass }
  | { readonly kind: "stopped"; readonly previous: ProducedPass | null; readonly failed: boolean };

export interface Timers {
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface PassCycleOptions {
  readonly produce: () => Promise<ProducedPass>;
  readonly onState: (state: PassState) => void;
  readonly now?: () => number;
  readonly timers?: Timers;
}

export interface PassCycle {
  /** Produces a pass now, and keeps replacing it. */
  start(): void;
  /** Stops replacing the pass: the screen closed, or the app left the foreground. */
  stop(): void;
}

export function passCycle(options: PassCycleOptions): PassCycle {
  const now = options.now ?? Date.now;
  const timers: Timers = options.timers ?? {
    setTimeout: (run, ms) => setTimeout(run, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
  let running = false;
  let generation = 0;
  let timer: unknown = null;
  let current: ProducedPass | null = null;

  const clear = () => {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
  };

  const produce = async (mine: number) => {
    options.onState({ kind: "signing", previous: current });
    let pass: ProducedPass;
    try {
      pass = await options.produce();
    } catch {
      if (mine !== generation) return;
      running = false;
      options.onState({ kind: "stopped", previous: current, failed: true });
      return;
    }
    if (mine !== generation) return;
    current = pass;
    options.onState({ kind: "showing", pass });
    timer = timers.setTimeout(
      () => {
        timer = null;
        if (running && mine === generation) produce(mine);
      },
      Math.max(0, refreshAt(pass.signed) - now()),
    );
  };

  return {
    start() {
      clear();
      running = true;
      generation++;
      produce(generation);
    },
    stop() {
      if (!running) return;
      running = false;
      generation++;
      clear();
      options.onState({ kind: "stopped", previous: current, failed: false });
    },
  };
}
