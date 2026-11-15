import { useCallback, useReducer } from 'react';

const HISTORY_LIMIT = 100;

function reducer(state, action) {
  switch (action.type) {
    case 'apply': {
      const next = action.updater(state.present);
      if (next === state.present) return state;
      // Perubahan beruntun dengan key yang sama (drag, ketik, nudge) digabung jadi satu langkah undo.
      const merge = action.key && state.key === action.key && action.now - state.time < action.ttl;
      return {
        past: merge ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
        key: action.key || null,
        time: action.now,
      };
    }
    case 'undo': {
      if (!state.past.length) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
        key: null,
        time: 0,
      };
    }
    case 'redo': {
      if (!state.future.length) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
        key: null,
        time: 0,
      };
    }
    case 'reset':
      return { past: [], present: action.layout, future: [], key: null, time: 0 };
    default:
      return state;
  }
}

export function useLayoutState(initialLayout) {
  const [state, dispatch] = useReducer(reducer, initialLayout, (layout) => ({
    past: [],
    present: layout,
    future: [],
    key: null,
    time: 0,
  }));

  const apply = useCallback(
    (updater, { key, ttl = 1000 } = {}) => dispatch({ type: 'apply', updater, key, ttl, now: Date.now() }),
    []
  );
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const reset = useCallback((layout) => dispatch({ type: 'reset', layout }), []);

  return {
    layout: state.present,
    apply,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
