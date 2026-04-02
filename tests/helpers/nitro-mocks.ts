import { H3, toNodeHandler } from "nitro/h3";
import type { H3Event } from "nitro/h3";
import http from "node:http";

export interface TestResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export async function callHandler(
  handler: (event: H3Event) => Promise<unknown>,
  url: string,
): Promise<TestResponse> {
  const app = new H3();
  app.use(handler);

  const server = http.createServer(toNodeHandler(app));

  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const port = (server.address() as { port: number }).port;
  const fullUrl = `http://localhost:${port}${url}`;

  try {
    const response = await fetch(fullUrl);
    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      statusCode: response.status,
      headers,
      body,
    };
  } finally {
    server.close();
  }
}
