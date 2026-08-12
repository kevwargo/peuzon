import { API_KEY, API_URL } from "../../env.json";

export async function request<T>(
  method: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    method,
    headers: {
      Authorization: API_KEY,
      Accept: "application/json",
      ...options.headers,
    },
  });

  const respText = await response.text();
  console.log(
    `${method} ${url} -> text:${respText} | code:${response.status}(${response.statusText})`,
  );
  if (!response.ok) {
    throw new APIError(response.status, response.statusText);
  }

  if (!respText) {
    return null as T;
  }

  return JSON.parse(respText) as T;
}

export async function get<T>(path: string): Promise<T> {
  return await request("GET", path);
}

export async function put<B, R>(path: string, body: B): Promise<R> {
  return await request("PUT", path, {
    body: JSON.stringify(body),
    headers: {
      ContentType: "application/json",
    },
  });
}

export class APIError extends Error {
  constructor(
    public readonly code: number,
    msg: string,
  ) {
    super(msg);
  }
}
