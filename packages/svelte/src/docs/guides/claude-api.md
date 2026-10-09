---
title: Claude
description: A SvelteKit endpoint that streams a Ripple spec from Claude with the Anthropic TypeScript SDK.
order: 6
---

This endpoint sends the user's request to Claude with the Ripple system prompt and streams the text back as it is written. The page feeds the stream to `streamSpec`, as in [SvelteKit end to end](/docs/guides/sveltekit).

## Install and configure

```bash
bun add @anthropic-ai/sdk
```

Put the key in your server environment as `ANTHROPIC_API_KEY`. The SDK reads it from there. Never send it to the browser or import the SDK in client code.

## The endpoint

```ts
// src/routes/api/ui/+server.ts
import Anthropic from '@anthropic-ai/sdk';
import { error } from '@sveltejs/kit';
import { SYSTEM_PROMPT } from '$lib/server/ripple-prompt';
import type { RequestHandler } from './$types';

const client = new Anthropic();

export const POST: RequestHandler = async ({ request }) => {
  const { prompt } = await request.json();
  if (typeof prompt !== 'string' || !prompt.trim()) error(400, 'prompt is required');

  const stream = client.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 64000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const body = new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(event.delta.text);
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      stream.abort();
    }
  });

  return new Response(body.pipeThrough(new TextEncoderStream()), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};
```

`SYSTEM_PROMPT` is the catalog prompt from [Prompting a model with the manifest](/docs/guides/prompting).

Only `text_delta` events are forwarded, so the page receives the spec text and nothing else. If the user leaves the page, the browser cancels the response body, and `cancel()` aborts the request to Claude.

## Choosing a model

`claude-opus-5-5` is a good default. For faster, cheaper generation of simple UIs, try `claude-sonnet-5-5` or `claude-haiku-5-5` with the same code. Check the current list in [Anthropic's model docs](https://platform.claude.com/docs/en/about-claude/models/overview).

## Errors

If the API call fails before any text arrives (a bad key, a rate limit), the stream errors and the page's `streamSpec` store reports a `malformed` error with no spec. Log the real error on the server; the SDK throws typed errors such as `Anthropic.RateLimitError` that you can catch around the loop if you want to answer with a status code instead.

A response can also end early because Claude declined the request. That shows up as text that stops before the JSON is complete, which `streamSpec` reports as an `incomplete` error or a partial spec. To tell the cases apart on the server, read `stop_reason` from `await stream.finalMessage()` after the loop.
