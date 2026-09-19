# TypeScript API: Web Worker Task Pool

To prevent long-running tasks from freezing the UI, CPU-intensive calculations can execute in background Web Workers.

## 1. Registering a Worker Task
---

Register worker routines in `onload()` using `this.registerWorkerTask()`:

```typescript
this.registerWorkerTask({
  taskId: 'heavy-calculation',
  run: async (input: { numbers: number[] }, emitEvent) => {
    let sum = 0;
    for (let i = 0; i < input.numbers.length; i++) {
      sum += input.numbers[i];
      if (i % 1000 === 0) {
        emitEvent('calc:progress', { percent: (i / input.numbers.length) * 100 });
      }
    }
    return sum;
  },
});
```

## 2. Executing Off-Thread Tasks
---

Call `this.runTask(taskId, input, options)` from your views, commands, or stores:

```typescript
const total = await this.runTask(
  'heavy-calculation',
  { numbers: [1, 2, 3, 4, 5, 1000] },
  { priority: 'background', timeoutMs: 15000 }
);

console.log('Result from off-thread worker:', total);
```

