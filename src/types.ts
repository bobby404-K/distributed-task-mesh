export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter';

export interface Task<T = any, R = any> {
  id: string;
  name: string;
  payload: T;
  priority: number; // Higher number = higher priority
  retries: number;
  maxRetries: number;
  timeoutMs: number;
  status: TaskStatus;
  createdAt: number;
  result?: R;
  error?: string;
}

export type TaskHandler<T = any, R = any> = (payload: T) => Promise<R>;
