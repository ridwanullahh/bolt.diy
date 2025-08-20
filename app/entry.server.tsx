import type { AppLoadContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
// @ts-expect-error
import { renderToReadableStream } from 'react-dom/server.browser';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore, DEFAULT_THEME } from '~/lib/stores/theme';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  _loadContext: AppLoadContext,
) {
  // await initializeModelList({});

  const readable = await renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
    signal: request.signal,
    onError(error: unknown) {
      console.error(error);
      responseStatusCode = 500;
    },
  });

  const body = new ReadableStream({
    start(controller) {
      try {
        const head = renderHeadToString({ request, remixContext, Head });

        // Safely get theme value with fallback for serverless environment
        let theme = DEFAULT_THEME;

        try {
          theme = themeStore.get() || DEFAULT_THEME;
        } catch (error) {
          console.warn('Failed to get theme from store, using default:', error);
          theme = DEFAULT_THEME;
        }

        controller.enqueue(
          new Uint8Array(
            new TextEncoder().encode(
              `<!DOCTYPE html><html lang="en" data-theme="${theme}"><head>${head}</head><body><div id="root" class="w-full h-full">`,
            ),
          ),
        );

        const reader = readable.getReader();

        function read() {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                controller.enqueue(new Uint8Array(new TextEncoder().encode('</div></body></html>')));
                controller.close();

                return;
              }

              controller.enqueue(value);
              read();
            })
            .catch((error) => {
              console.error('Stream read error:', error);
              controller.error(error);
              readable.cancel();
            });
        }
        read();
      } catch (error) {
        console.error('Error in stream start:', error);
        controller.error(error);
      }
    },

    cancel() {
      readable.cancel();
    },
  });

  if (isbot(request.headers.get('user-agent') || '')) {
    await readable.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');

  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
