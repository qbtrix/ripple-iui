---
title: OpenAI
description: A SvelteKit endpoint that streams a Ripple spec from an OpenAI model with the official Node SDK.
order: 7
---

This endpoint calls the OpenAI Responses API with the Ripple system prompt and streams the text back as it is written. The page feeds the stream to `streamSpec`, as in [SvelteKit end to end](/docs/guides/sveltekit).

## Install and configure

```bash
bun add openai
```

Put the key in your server environment as `OPENAI_API_KEY`. The SDK reads it from there. Never send it to the browser or import the SDK in client code.

## The endpoint

```ts
// src/routes/api/ui/+server.ts
import OpenAI from 'openai';
import { error } from '@sveltejs/kit';
import { SYSTEM_PROMPT } from '$lib/server/ripple-prompt';
import type { RequestHandler } from './$types';

const client = new OpenAI();

export const POST: RequestHandler = async ({ request }) => {
  const { prompt } = await request.json();
  if (typeof prompt !== 'string' || !prompt.trim()) error(400, 'prompt is required');

  const abort = new AbortController();
  const events = await client.responses.create(
    { model: 'gpt-6-astra', instructions: SYSTEM_PROMPT, input: prompt, stream: true },
    { signal: abort.signal }
  );

  const body = new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const event of events) {
          if (event.type === 'response.output_text.delta') controller.enqueue(event.delta);
          if (event.type === 'error') throw new Error(event.message);
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      abort.abort();
    }
  });

  return new Response(body.pipeThrough(new TextEncoderStream()), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};
```

`SYSTEM_PROMPT` is the catalog prompt from [Prompting a model with the manifest](/docs/guides/prompting). It goes in `instructions`, and the user's request in `input`.

Only `response.output_text.delta` events are forwarded, so the page receives the spec text and nothing else. If the user leaves the page, the browser cancels the response body and `cancel()` aborts the request.

## Choosing a model

The model id above comes from OpenAI's streaming guide at the time of writing. Model names change often, so check [OpenAI's models page](https://developers.openai.com/api/docs/models) and swap in the one you want; the rest of the code stays the same.

## Errors

A failed request before any text (a bad key, a rate limit) makes the stream error, and the page's `streamSpec` store reports a `malformed` error with no spec. Log the real error on the server. An `error` event mid-stream is turned into the same failure by the loop above.
