import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionLockManager, UnifiedSyncManager } from '../UnifiedSyncManager';
import { LogManager } from '../../LogManager';

describe('ConnectionLockManager', () => {
  beforeEach(() => {
    ConnectionLockManager.clearLocks();
    vi.clearAllMocks();
  });

  it('acquires and releases lock cleanly for a single task', async () => {
    const connId = 'test-conn-1';
    expect(ConnectionLockManager.isLocked(connId)).toBe(false);

    let executed = false;
    const promise = ConnectionLockManager.runWithLock(
      connId,
      'Test Single Task',
      async () => {
        expect(ConnectionLockManager.isLocked(connId)).toBe(true);
        expect(ConnectionLockManager.getCurrentTask(connId)).toBe('Test Single Task');
        executed = true;
        return 'success';
      },
      { connectionLabel: 'Main Account' }
    );

    const result = await promise;
    expect(result).toBe('success');
    expect(executed).toBe(true);
    expect(ConnectionLockManager.isLocked(connId)).toBe(false);
    expect(ConnectionLockManager.getQueueDepth(connId)).toBe(0);
  });

  it('queues subsequent tasks for the same connectionId and executes them sequentially', async () => {
    const connId = 'test-conn-queue';
    const executionOrder: string[] = [];

    // Task 1: delayed
    const task1 = ConnectionLockManager.runWithLock(
      connId,
      'Task 1',
      async () => {
        await new Promise(r => setTimeout(r, 40));
        executionOrder.push('task1');
        return 'result1';
      }
    );

    expect(ConnectionLockManager.isLocked(connId)).toBe(true);

    // Task 2: queued behind Task 1
    const task2 = ConnectionLockManager.runWithLock(
      connId,
      'Task 2',
      async () => {
        executionOrder.push('task2');
        return 'result2';
      }
    );

    expect(ConnectionLockManager.getQueueDepth(connId)).toBe(1);

    const [res1, res2] = await Promise.all([task1, task2]);

    expect(res1).toBe('result1');
    expect(res2).toBe('result2');
    expect(executionOrder).toEqual(['task1', 'task2']);
    expect(ConnectionLockManager.isLocked(connId)).toBe(false);
    expect(ConnectionLockManager.getQueueDepth(connId)).toBe(0);
  });

  it('allows different connections to execute in parallel without mutual blocking', async () => {
    const connA = 'conn-bybit-main';
    const connB = 'conn-bitget-sub';
    const completedAt: Record<string, number> = {};

    const start = Date.now();

    const pA = ConnectionLockManager.runWithLock(
      connA,
      'Sync Bybit',
      async () => {
        await new Promise(r => setTimeout(r, 30));
        completedAt.connA = Date.now() - start;
        return 'A';
      }
    );

    const pB = ConnectionLockManager.runWithLock(
      connB,
      'Sync Bitget',
      async () => {
        await new Promise(r => setTimeout(r, 30));
        completedAt.connB = Date.now() - start;
        return 'B';
      }
    );

    expect(ConnectionLockManager.isLocked(connA)).toBe(true);
    expect(ConnectionLockManager.isLocked(connB)).toBe(true);

    const [resA, resB] = await Promise.all([pA, pB]);
    expect(resA).toBe('A');
    expect(resB).toBe('B');

    // Both should finish roughly at the same time (~30-60ms), not serially (60ms+)
    expect(Math.abs(completedAt.connA - completedAt.connB)).toBeLessThan(35);
  });

  it('collapses duplicate requests when strategy is collapse', async () => {
    const connId = 'conn-collapse-test';
    let executionCount = 0;

    const task1 = ConnectionLockManager.runWithLock(
      connId,
      'Slow Task',
      async () => {
        await new Promise(r => setTimeout(r, 40));
        executionCount++;
        return 'data-1';
      },
      { strategy: 'collapse' }
    );

    // Task 2 should collapse and reuse the same active promise
    const task2 = ConnectionLockManager.runWithLock(
      connId,
      'Duplicate Task',
      async () => {
        executionCount++;
        return 'data-2';
      },
      { strategy: 'collapse' }
    );

    const [res1, res2] = await Promise.all([task1, task2]);
    expect(res1).toBe('data-1');
    expect(res2).toBe('data-1'); // Reused active promise
    expect(executionCount).toBe(1);
    expect(ConnectionLockManager.isLocked(connId)).toBe(false);
  });

  it('folds/coalesces queue when maxQueue is reached', async () => {
    const connId = 'conn-fold-test';
    const executionList: string[] = [];

    const task1 = ConnectionLockManager.runWithLock(
      connId,
      'Task 1 Active',
      async () => {
        await new Promise(r => setTimeout(r, 50));
        executionList.push('task1');
        return 't1';
      },
      { maxQueue: 1 }
    );

    const task2 = ConnectionLockManager.runWithLock(
      connId,
      'Task 2 Queued',
      async () => {
        executionList.push('task2');
        return 't2';
      },
      { maxQueue: 1 }
    );

    // Task 3 replaces Task 2 in the queue because maxQueue = 1
    const task3 = ConnectionLockManager.runWithLock(
      connId,
      'Task 3 Latest',
      async () => {
        executionList.push('task3');
        return 't3';
      },
      { maxQueue: 1 }
    );

    const [r1, r2, r3] = await Promise.all([task1, task2, task3]);
    expect(r1).toBe('t1');
    expect(r2).toBe('t3'); // Folded into latest
    expect(r3).toBe('t3');
    expect(executionList).toEqual(['task1', 'task3']);
  });

  it('releases lock cleanly and passes errors when task throws', async () => {
    const connId = 'conn-error-test';

    await expect(
      ConnectionLockManager.runWithLock(
        connId,
        'Failing Task',
        async () => {
          throw new Error('API Rate Limit 429');
        }
      )
    ).rejects.toThrow('API Rate Limit 429');

    // Lock must be released despite the exception
    expect(ConnectionLockManager.isLocked(connId)).toBe(false);
    expect(ConnectionLockManager.getQueueDepth(connId)).toBe(0);
  });

  it('continues queue execution even if prior task failed', async () => {
    const connId = 'conn-continue-test';
    const executionOrder: string[] = [];

    const task1 = ConnectionLockManager.runWithLock(
      connId,
      'Task 1 Fails',
      async () => {
        await new Promise(r => setTimeout(r, 20));
        executionOrder.push('task1-fail');
        throw new Error('Task 1 Network Error');
      }
    );

    const task2 = ConnectionLockManager.runWithLock(
      connId,
      'Task 2 Succeeds',
      async () => {
        executionOrder.push('task2-success');
        return 'success2';
      }
    );

    await expect(task1).rejects.toThrow('Task 1 Network Error');
    const res2 = await task2;
    expect(res2).toBe('success2');
    expect(executionOrder).toEqual(['task1-fail', 'task2-success']);
    expect(ConnectionLockManager.isLocked(connId)).toBe(false);
  });
});
