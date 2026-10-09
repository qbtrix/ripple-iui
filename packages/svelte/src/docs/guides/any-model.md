---
title: Any model
description: Stream a Ripple spec from any OpenAI-compatible chat completions endpoint with plain fetch, no SDK.
order: 8
---

Many providers and local servers speak the OpenAI chat completions protocol: a `POST` to `/v1/chat/completions` that, with `stream: true`, answers with server-sent events. This endpoint works with any of them using `fetch` alone. Point it at a different base URL and model to switch providers.

## Configure

Set these in your server environment:

```bash
MODEL_BASE_URL=https://api.example.com/v1
MODEL_API_KEY=...
MODEL_NAME=your-model-id
```

Never send the key to the browser.

## The endpoint

```ts
// src/routes/api/ui/+server.ts
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { SYSTEM_PROMPT } from '$lib/server/ripple-prompt';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { prompt } = await request.json();
  if (typeof prompt !== 'string' || !prompt.trim()) error(400, 'prompt is required');

  const upstream = await fetch(`${env.MODEL_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.MODEL_API_KEY}`
    },
    body: JSON.stringify({
      model: env.MODEL_NAME,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    }),
    signal: request.signal
  });
  if (!upstream.ok || !upstream.body) error(502, `Model request failed: ${upstream.status}`);

  return new Response(upstream.body.pipeThrough(new TextDecoderStream()).pipeThrough(sseToText()).pipeThrough(new TextEncoderStream()), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};

/** Turns `data: {...}` server-sent event lines into the text deltas they carry. */
function sseToText(): TransformStream<string, string> {
  let buffer = '';
  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const data = line.trim();
        if (!data.startsWith('data:')) continue;
        const payload = data.slice(5).trim();
        if (payload === '[DONE]') return;
        const text = JSON.parse(payload).choices?.[0]?.delta?.content;
        if (text) controller.enqueue(text);
      }
    }
  });
}
```

`SYSTEM_PROMPT` is the catalog prompt from [Prompting a model with the manifest](/docs/guides/prompting).

The endpoint checks the status before streaming, so a bad key or an unknown model becomes a `502` the page can show, instead of an empty stream. Passing `request.signal` to `fetch` cancels the upstream request when the user leaves.

## Notes

- Events can be split across network chunks, which is why the transform keeps the unfinished last line in `buffer` until the rest arrives.
- Some servers send extra fields or comment lines (starting with `:`). Lines that don't start with `data:` are skipped.
- Smaller local models follow "JSON only" less reliably. Run the checks from [Catalog and validation](/docs/concepts/catalog-and-validation) on the final text and retry with the error when they fail.
- For Claude or OpenAI, the provider SDKs handle the stream for you: see [Claude](/docs/guides/claude-api) and [OpenAI](/docs/guides/openai).
