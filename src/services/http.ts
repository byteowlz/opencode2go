import { invoke } from "@tauri-apps/api/core"

interface HttpResponse {
  status: number
  data: any
  ok: boolean
}

export class TauriHttpClient {
  async get(url: string): Promise<Response> {
    const response = await invoke<HttpResponse>("http_get", { url })

    return new Response(JSON.stringify(response.data), {
      status: response.status,
      statusText: response.ok ? "OK" : "Error",
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  async post(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {}

    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value
        })
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value
        })
      } else {
        Object.assign(headers, options.headers)
      }
    }

    let body: any = {}
    if (options.body) {
      if (typeof options.body === "string") {
        try {
          body = JSON.parse(options.body)
        } catch {
          body = { data: options.body }
        }
      } else {
        body = options.body
      }
    }

    const response = await invoke<HttpResponse>("http_post", {
      url,
      body,
      headers: Object.keys(headers).length > 0 ? headers : null,
    })

    return new Response(JSON.stringify(response.data), {
      status: response.status,
      statusText: response.ok ? "OK" : "Error",
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  async fetch(input: string | URL | Request, options?: RequestInit): Promise<Response> {
    let url: string
    let requestOptions = options || {}

    if (input instanceof Request) {
      url = input.url
      requestOptions = {
        method: input.method,
        headers: input.headers,
        body: await input.text(),
        ...requestOptions,
      }
    } else {
      url = input.toString()
    }

    const method = requestOptions?.method?.toUpperCase() || "GET"

    if (method === "GET") {
      return this.get(url)
    } else if (method === "POST") {
      return this.post(url, requestOptions)
    } else {
      throw new Error(`HTTP method ${method} not supported`)
    }
  }
}

export const tauriHttpClient = new TauriHttpClient()

export const tauriFetch = (input: string | URL | Request, options?: RequestInit): Promise<Response> => {
  return tauriHttpClient.fetch(input, options)
}
