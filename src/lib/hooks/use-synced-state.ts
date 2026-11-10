import { useState, type Dispatch, type SetStateAction } from "react";

// Local, mutable (optimistic-update-friendly) state that re-syncs to a new
// external value whenever that value's reference changes — e.g. after
// router.refresh() re-runs the Server Component and passes fresh
// `initialX` props down. A plain `useState(initialX)` only reads that
// value once on mount, so without this a refresh would silently do
// nothing visible.
//
// Deliberately NOT a useEffect: comparing-and-resetting during render
// (React's own documented pattern for "adjusting state when a prop
// changes") applies the reset in the same render/commit as the prop
// change, with no stale-content flash and no extra effect round trip.
export function useSyncedState<T>(value: T): [T, Dispatch<SetStateAction<T>>] {
  const [prevValue, setPrevValue] = useState(value);
  const [state, setState] = useState(value);

  if (prevValue !== value) {
    setPrevValue(value);
    setState(value);
  }

  return [state, setState];
}
