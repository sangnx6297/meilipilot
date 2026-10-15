import type { TaskStatus, TaskView } from './types';

export type ProgressStepView = {
  currentStep: string;
  finished: number;
  total: number;
};

export type ProgressView = {
  steps: ProgressStepView[];
  percentage: number;
};

export type BatchProgressInput = {
  progress?: ProgressView | null;
} | null;

export type TaskProgressTone = 'done' | 'fail' | 'muted' | 'active';

export type TaskProgress = {
  percent: number | null;
  indeterminate: boolean;
  label: string;
  step: string | null;
  tone: TaskProgressTone;
};

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function innermostStep(batch: BatchProgressInput): string | null {
  const steps = batch?.progress?.steps;
  if (!steps?.length) return null;
  return steps[steps.length - 1]?.currentStep ?? null;
}

export function taskProgress(task: TaskView, batch: BatchProgressInput = null): TaskProgress {
  const status: TaskStatus = task.status;
  if (status === 'succeeded') {
    return { percent: 100, indeterminate: false, label: 'Hoàn thành', step: null, tone: 'done' };
  }
  if (status === 'failed') {
    return { percent: 100, indeterminate: false, label: 'Thất bại', step: null, tone: 'fail' };
  }
  if (status === 'canceled') {
    return { percent: 100, indeterminate: false, label: 'Đã hủy', step: null, tone: 'muted' };
  }
  if (status === 'enqueued') {
    return { percent: 0, indeterminate: false, label: 'Trong hàng đợi', step: null, tone: 'muted' };
  }

  const details = task.details ?? {};
  const received = num(details.receivedDocuments);
  const indexed = num(details.indexedDocuments);
  if (received != null && received > 0 && indexed != null) {
    const percent = Math.min(100, Math.round((indexed / received) * 1000) / 10);
    return {
      percent,
      indeterminate: false,
      label: `${indexed} / ${received} documents`,
      step: innermostStep(batch),
      tone: 'active'
    };
  }

  const batchPct = batch?.progress?.percentage;
  if (typeof batchPct === 'number') {
    return {
      percent: batchPct,
      indeterminate: false,
      label: `${Math.round(batchPct)}%`,
      step: innermostStep(batch),
      tone: 'active'
    };
  }

  return { percent: null, indeterminate: true, label: 'Đang xử lý', step: innermostStep(batch), tone: 'active' };
}

export function formatDuration(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = iso.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!m) return iso;
  const hours = Number(m[1] || 0);
  const minutes = Number(m[2] || 0);
  const seconds = Number(m[3] || 0);
  const ms = Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) {
    return ms % 1000 === 0 ? `${ms / 1000}s` : `${(ms / 1000).toFixed(2)}s`;
  }
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return `${min}m ${sec}s`;
}

export function isLiveStatus(status: TaskStatus): boolean {
  return status === 'enqueued' || status === 'processing';
}
