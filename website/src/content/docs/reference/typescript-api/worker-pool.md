# TypeScript API: Web Worker Task Pool

To preserve sub-8ms typing latency on massive documents, CPU-intensive algorithms (syntax clustering, geometry triangulation, AST parsing) can execute in background Web Workers.


## 1. Registering a Worker Task

---

```typescript
this.registerWorkerTask('heavy-calculation', (input: { numbers: number[] }, emitEvent) => {
  let sum = 0;
  for (let i = 0; i < input.numbers.length; i++) {
    sum += input.numbers[i];
    if (i % 1000 === 0) {
      emitEvent('calc:progress', { percent: (i / input.numbers.length) * 100 });
    }
  }
  return sum;
});
```


## 2. Executing Off-Thread Tasks

---

```typescript
const total = await this.runTask('heavy-calculation', {
  numbers: [1, 2, 3, 4, 5, 1000],
});

console.log('Result from off-thread worker:', total);
```
