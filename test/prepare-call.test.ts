import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OpenAiCompatAdapter } from '../src/adapter.ts';
import { collect, generateOptions, providerConfig } from './helpers.ts';
import { MockProvider, finishDelta, textDelta } from './mock-server.ts';

test('new per-step prepareCall returns model metadata and an independently callable stream', async () => {
  const server = new MockProvider([{ chunks: [textDelta('prepared'), finishDelta('stop')] }]);
  await server.start();
  try {
    const config = providerConfig({ baseURL: server.url });
    const adapter = new OpenAiCompatAdapter({
      options: () => config,
      resolveApiKey: async () => '',
      resolveUserId: () => 42 as never,
    });
    const prepared = await adapter.prepareCall('mock', 'model-a');
    assert.equal(prepared.model.id, 'model-a');
    assert.equal(prepared.model.context.contextWindow, 131072);
    const stream = prepared.stream;
    const chunks = await collect(stream(generateOptions()));
    assert.ok(chunks.some(chunk => chunk.type === 'text-delta' && chunk.text === 'prepared'));
    assert.equal(chunks.at(-1)?.type, 'finish');
  } finally { await server.close(); }
});
