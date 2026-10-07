// c4-elk-worker.test.ts — runElk, the path every C4 layout takes: in a worker when one starts
// (registering ELK's algorithms first), on the main thread when none can (jsdom, SSR) or the worker
// dies, and an ELK error from the worker rejects without a main-thread retry. jsdom has no Worker,
// so a fake stands in through setElkWorkerFactory.

import { afterEach, describe, expect, it } from 'vitest';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import { runElk, setElkWorkerFactory } from '../elk-layout.js';

type Msg = { id: number; cmd: string; graph?: ElkNode };

/** A worker that answers like elkjs's, by running ELK in-process, or as `mode` says. */
class FakeWorker extends EventTarget {
  posted: Msg[] = [];
  constructor(private mode: 'reply' | 'die' | 'fail' = 'reply') {
    super();
  }
  postMessage(msg: Msg) {
    this.posted.push(msg);
    queueMicrotask(async () => {
      const reply = (data: object) => this.dispatchEvent(new MessageEvent('message', { data: { id: msg.id, ...data } }));
      if (this.mode === 'die') this.dispatchEvent(new Event('error'));
      else if (msg.cmd !== 'layout') reply({});
      else if (this.mode === 'fail') reply({ error: 'boom' });
      else reply({ data: await new ELK().layout(structuredClone(msg.graph!)) });
    });
  }
}

const graph = (): ElkNode => ({
  id: 'root',
  layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN' },
  children: [
    { id: 'a', width: 200, height: 110 },
    { id: 'b', width: 200, height: 110 },
    { id: 'c', width: 160, height: 140 },
  ],
  edges: [
    { id: 'e1', sources: ['a'], targets: ['b'] },
    { id: 'e2', sources: ['a'], targets: ['c'] },
  ],
});

const boxes = (laid: ElkNode) => laid.children?.map(({ id, x, y }) => ({ id, x, y }));

// Runs ELK; on a loaded machine that outlasts vitest's 5s default.
describe('runElk', { timeout: 30000 }, () => {
  afterEach(() => setElkWorkerFactory(() => null));

  it('lays out on the main thread where no worker can start', async () => {
    setElkWorkerFactory(() => null);
    expect(boxes(await runElk(graph()))).toEqual(boxes(await new ELK().layout(graph())));
  });

  it('registers the algorithms, then lays out in the worker with the main-thread result', async () => {
    const fake = new FakeWorker();
    setElkWorkerFactory(() => fake);
    const laid = await runElk(graph());
    expect(fake.posted.map((m) => m.cmd)).toEqual(['register', 'layout']);
    expect(boxes(laid)).toEqual(boxes(await new ELK().layout(graph())));
  });

  it('falls back to the main thread when the worker dies, and stops using it', async () => {
    const fake = new FakeWorker('die');
    setElkWorkerFactory(() => fake);
    expect(boxes(await runElk(graph()))).toEqual(boxes(await new ELK().layout(graph())));
    const posts = fake.posted.length;
    await runElk(graph());
    expect(fake.posted.length).toBe(posts);
  });

  it("rejects with the worker's ELK error, without a main-thread retry", async () => {
    setElkWorkerFactory(() => new FakeWorker('fail'));
    await expect(runElk(graph())).rejects.toBe('boom');
  });

  it('falls back when making the worker throws', async () => {
    setElkWorkerFactory(() => {
      throw new Error('no workers here');
    });
    expect(boxes(await runElk(graph()))).toEqual(boxes(await new ELK().layout(graph())));
  });
});
