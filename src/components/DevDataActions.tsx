import { useState } from 'react';

/** Per-record progress reported by a dev data action. */
export interface DevActionProgress {
  total: number;
  done: number;
  failed: { name: string; error: string }[];
}

export interface DevDataAction {
  label: string;
  busyLabel: string;
  doneLabel: string;
  /** When set, the action only runs after the user accepts this confirmation. */
  confirm?: string;
  run: (onProgress: (p: DevActionProgress) => void) => Promise<DevActionProgress>;
}

interface DevDataActionsProps {
  actions: DevDataAction[];
  /** Called after an action finishes so the screen can reload from Dataverse. */
  onDone: () => void;
}

/** Dev-only buttons that write/delete Dataverse test data, with live progress. */
export function DevDataActions({ actions, onDone }: DevDataActionsProps) {
  const [running, setRunning] = useState<DevDataAction | null>(null);
  const [result, setResult] = useState<{ action: DevDataAction; progress: DevActionProgress } | null>(null);

  async function run(action: DevDataAction) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    setRunning(action);
    setResult(null);
    const report = (progress: DevActionProgress) => setResult({ action, progress });
    try {
      report(await action.run(report));
      onDone();
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="dev-actions" hidden={actions.length === 0}>
      {actions.map((action) => (
        <button key={action.label} type="button" className="dev-btn" onClick={() => run(action)} disabled={running != null}>
          {running === action ? action.busyLabel : action.label}
        </button>
      ))}
      {result && (
        <p className="dev-result">
          {result.action.doneLabel} {result.progress.done}/{result.progress.total}
          {result.progress.failed.length > 0 && `, ${result.progress.failed.length} failed`}
        </p>
      )}
    </div>
  );
}
