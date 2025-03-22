import { Task, TaskHandler, TaskStatus } from './types.js';

export class TaskMeshQueue {
  private queue: Task[] = [];
  private handlers = new Map<string, TaskHandler>();
  private runningCount = 0;
  private deadLetter: Task[] = [];

  constructor(public concurrency = 4) {}

  register(name: string, handler: TaskHandler): void {
    this.handlers.set(name, handler);
  }

  enqueue<T>(name: string, payload: T, priority = 0, maxRetries = 3, timeoutMs = 5000): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const task: Task<T> = {
      id,
      name,
      payload,
      priority,
      retries: 0,
      maxRetries,
      timeoutMs,
      status: 'pending',
      createdAt: Date.now()
    };
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.tick();
    return id;
  }

  private async tick(): Promise<void> {
    if (this.runningCount >= this.concurrency) return;
    const task = this.queue.find(t => t.status === 'pending');
    if (!task) return;

    task.status = 'running';
    this.runningCount++;

    const handler = this.handlers.get(task.name);
    if (!handler) {
      task.status = 'failed';
      task.error = `No handler for ${task.name}`;
      this.runningCount--;
      this.tick();
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Task timeout')), task.timeoutMs));
      const res = await Promise.race([handler(task.payload), timeoutPromise]);
      task.result = res;
      task.status = 'completed';
    } catch (err: any) {
      task.retries++;
      if (task.retries <= task.maxRetries) {
        task.status = 'pending'; // retry
      } else {
        task.status = 'dead_letter';
        task.error = err?.message || String(err);
        this.deadLetter.push(task);
      }
    } finally {
      this.runningCount--;
      this.tick();
    }
  }

  getMetrics() {
    return {
      pending: this.queue.filter(t => t.status === 'pending').length,
      running: this.runningCount,
      completed: this.queue.filter(t => t.status === 'completed').length,
      deadLetter: this.deadLetter.length
    };
  }
}
