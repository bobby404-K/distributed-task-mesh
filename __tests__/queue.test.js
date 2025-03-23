import assert from 'node:assert';
import test from 'node:test';
import { TaskMeshQueue } from '../dist/queue.js';

test('TaskMeshQueue prioritizes higher priority tasks and processes concurrently', async () => {
  const mesh = new TaskMeshQueue(2);
  const log = [];

  mesh.register('job', async (num) => {
    log.push(num);
    return num * 2;
  });

  mesh.enqueue('job', 1, 0);
  mesh.enqueue('job', 99, 10); // Higher priority

  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(log[0], 99);
});
