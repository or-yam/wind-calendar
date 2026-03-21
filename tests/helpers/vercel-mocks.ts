import type { VercelRequest, VercelResponse } from "@vercel/node";

export function mockVercelRequest(path: string): VercelRequest {
  return {
    url: path,
    headers: { host: "localhost:3000" },
  } as unknown as VercelRequest;
}

export interface MockResponseResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  json: unknown;
}

export function mockVercelResponse() {
  const result: MockResponseResult = {
    statusCode: 200,
    headers: {},
    body: "",
    json: undefined,
  };

  const res = {
    setHeader(name: string, value: string) {
      result.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      result.statusCode = code;
      return res;
    },
    send(body: string) {
      result.body = body;
      return res;
    },
    json(data: unknown) {
      result.json = data;
      result.body = JSON.stringify(data);
      // Don't override content-type if already set by handler via setHeader
      if (!result.headers["content-type"]) {
        result.headers["content-type"] = "application/json";
      }
      return res;
    },
    end() {
      return res;
    },
  } as unknown as VercelResponse;

  return { res, result };
}
