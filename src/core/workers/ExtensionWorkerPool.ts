/**
 * @module ExtensionWorkerPool
 * @description
 * Off-thread Web Worker pipeline for CPU-intensive extension operations.
 * Isolates AST tokenization, indexing, geometry computations, and simulations
 * from the main thread, guaranteeing active typing latency remains sub-8ms.
 *
 * Technical Rationale:
 * - Thread Boundary Isolation: Prevents heavy JavaScript workloads from blocking
 *   the ProseMirror transaction dispatch loop or frame paint cycles.
 * - Bidirectional EventBus Bridge: Workers can emit domain events directly into
 *   Flint's central EventBus via structured postMessage multiplexing.
 * - Clean Lifecycle Guarantee: Tracks active workers and pending tasks per extension ID,
 *   terminating workers immediately when an extension is disabled or unloaded.
 *
 * @since 0.4.0
 */

import type { FlintApp } from '../app/FlintApp';
import type {
  WorkerTaskDefinition,
  RunTaskOptions,
  Disposable,
} from '../extensions/types';

interface PendingJob {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: any;
}

export class ExtensionWorkerPool {
  private app: FlintApp;
  /** Active Web Worker instances mapped by extensionId */
  private workers: Map<string, Worker> = new Map();
  /** Object URLs generated for blob workers, tracked for revocation */
  private blobUrls: Map<string, string> = new Map();
  /** Registered task source codes mapped by extensionId -> taskId */
  private taskDefinitions: Map<string, Map<string, WorkerTaskDefinition>> = new Map();
  /** Pending job promises waiting for worker results */
  private pendingJobs: Map<string, PendingJob> = new Map();
  private jobCounter = 0;

  constructor(app: FlintApp) {
    this.app = app;
  }

  /**
   * Registers a CPU-bound worker task for an extension.
   *
   * @param extensionId - Owning extension identifier.
   * @param task - Task definition containing taskId and run function.
   * @returns Disposable to unregister the task.
   */
  public registerTask<TInput = any, TOutput = any>(
    extensionId: string,
    task: WorkerTaskDefinition<TInput, TOutput>
  ): Disposable {
    let extTasks = this.taskDefinitions.get(extensionId);
    if (!extTasks) {
      extTasks = new Map();
      this.taskDefinitions.set(extensionId, extTasks);
    }

    extTasks.set(task.taskId, task);
    this.restartWorker(extensionId);

    return {
      dispose: () => {
        const currentTasks = this.taskDefinitions.get(extensionId);
        if (currentTasks) {
          currentTasks.delete(task.taskId);
          if (currentTasks.size === 0) {
            this.terminateExtension(extensionId);
          } else {
            this.restartWorker(extensionId);
          }
        }
      },
    };
  }

  /**
   * Dispatches a task to the extension's dedicated background worker.
   *
   * @param extensionId - Owning extension identifier.
   * @param taskId - Identifier of the registered task to execute.
   * @param input - Input payload transferred to the worker.
   * @param options - Execution priority and timeout configuration.
   * @returns Promise resolving to the worker output.
   */
  public async runTask<TInput = any, TOutput = any>(
    extensionId: string,
    taskId: string,
    input: TInput,
    options?: RunTaskOptions
  ): Promise<TOutput> {
    const worker = this.ensureWorker(extensionId);
    if (!worker) {
      throw new Error(
        `[ExtensionWorkerPool] No active worker available for extension "${extensionId}" or task "${taskId}".`
      );
    }

    const jobId = `${extensionId}_job_${++this.jobCounter}_${Date.now()}`;
    const timeoutMs = options?.timeoutMs ?? 30000;

    return new Promise<TOutput>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingJobs.delete(jobId);
        reject(
          new Error(
            `[ExtensionWorkerPool] Task "${taskId}" timed out after ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);

      this.pendingJobs.set(jobId, { resolve, reject, timer });

      worker.postMessage({
        type: 'EXECUTE_TASK',
        jobId,
        taskId,
        input,
      });
    });
  }

  /**
   * Ensures an active Web Worker is running for the given extension.
   */
  private ensureWorker(extensionId: string): Worker | null {
    let worker = this.workers.get(extensionId);
    if (worker) return worker;

    const tasks = this.taskDefinitions.get(extensionId);
    if (!tasks || tasks.size === 0) return null;

    return this.createWorkerInstance(extensionId, tasks);
  }

  private restartWorker(extensionId: string): void {
    const existing = this.workers.get(extensionId);
    if (existing) {
      existing.terminate();
      this.workers.delete(extensionId);
    }
    const blobUrl = this.blobUrls.get(extensionId);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      this.blobUrls.delete(extensionId);
    }

    const tasks = this.taskDefinitions.get(extensionId);
    if (tasks && tasks.size > 0) {
      this.createWorkerInstance(extensionId, tasks);
    }
  }

  /**
   * Synthesizes an isolated Web Worker via Blob URL containing all registered task functions.
   */
  private createWorkerInstance(
    extensionId: string,
    tasks: Map<string, WorkerTaskDefinition>
  ): Worker | null {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }

    try {
      // Build inlined script mapping task functions
      const serializedTasks: string[] = [];
      for (const [taskId, taskDef] of tasks.entries()) {
        serializedTasks.push(`
          tasks["${taskId}"] = ${taskDef.run.toString()};
        `);
      }

      const workerScript = `
        const tasks = {};
        ${serializedTasks.join('\n')}

        function emitEvent(eventName, payload) {
          self.postMessage({
            type: 'EVENT_EMIT',
            eventName: eventName,
            payload: payload
          });
        }

        self.onmessage = async function(e) {
          const data = e.data;
          if (!data || data.type !== 'EXECUTE_TASK') return;

          const { jobId, taskId, input } = data;
          const fn = tasks[taskId];

          if (!fn) {
            self.postMessage({
              type: 'JOB_RESULT',
              jobId: jobId,
              error: 'Task "' + taskId + '" is not registered in worker.'
            });
            return;
          }

          try {
            const result = await fn(input, emitEvent);
            self.postMessage({
              type: 'JOB_RESULT',
              jobId: jobId,
              result: result
            });
          } catch (err) {
            self.postMessage({
              type: 'JOB_RESULT',
              jobId: jobId,
              error: err instanceof Error ? err.message : String(err)
            });
          }
        };
      `;

      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const worker = new Worker(blobUrl);

      worker.onmessage = (event: MessageEvent) => {
        const msg = event.data;
        if (!msg) return;

        if (msg.type === 'EVENT_EMIT') {
          // Bridge worker event directly into host EventBus
          this.app.events.emit(msg.eventName as any, msg.payload);
          return;
        }

        if (msg.type === 'JOB_RESULT') {
          const pending = this.pendingJobs.get(msg.jobId);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingJobs.delete(msg.jobId);

            if (msg.error) {
              pending.reject(new Error(msg.error));
            } else {
              pending.resolve(msg.result);
            }
          }
        }
      };

      worker.onerror = (err) => {
        console.error(`[ExtensionWorkerPool] Uncaught worker error in "${extensionId}":`, err);
      };

      this.workers.set(extensionId, worker);
      this.blobUrls.set(extensionId, blobUrl);
      return worker;
    } catch (err) {
      console.error(`[ExtensionWorkerPool] Failed to instantiate worker for "${extensionId}":`, err);
      return null;
    }
  }

  /**
   * Terminates all active workers and pending promises for an extension.
   * Invoked automatically when an extension unloads.
   */
  public terminateExtension(extensionId: string): void {
    const worker = this.workers.get(extensionId);
    if (worker) {
      worker.terminate();
      this.workers.delete(extensionId);
    }

    const blobUrl = this.blobUrls.get(extensionId);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      this.blobUrls.delete(extensionId);
    }

    this.taskDefinitions.delete(extensionId);

    // Reject any pending jobs associated with this extension
    for (const [jobId, job] of this.pendingJobs.entries()) {
      if (jobId.startsWith(`${extensionId}_`)) {
        clearTimeout(job.timer);
        job.reject(new Error(`[ExtensionWorkerPool] Extension "${extensionId}" was unloaded.`));
        this.pendingJobs.delete(jobId);
      }
    }
  }
}
