export interface FetchOptions extends RequestInit {
  retries?: number;
  backoff?: number;
  timeout?: number;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchWithRetry = async (url: string, options: FetchOptions = {}): Promise<Response> => {
  const { 
      retries = 3, 
      backoff = 1000, 
      timeout = 8000, 
      ...fetchOptions 
  } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const config = { ...fetchOptions, signal: controller.signal };

  try {
    const res = await fetch(url, config);
    clearTimeout(id);

    const shouldRetry = res.status >= 500 || res.status === 408 || res.status === 429;

    if (res.ok || !shouldRetry) {
      return res;
    }

    if (retries > 0) {
      // throw error để xuống catch retry
      throw new Error(`Server Error: ${res.status}`);
    }

    return res;
  } catch (error: any) {
    clearTimeout(id);
    const isTimeout = error.name === 'AbortError';

    if (retries > 0) {
      const jitter = Math.floor(Math.random() * 200);
      const totalWait = backoff + jitter;
      
      console.log(`\x1b[33m⚠️ [Retry] ${isTimeout ? 'Timeout' : 'Error'} on ${url}. Waiting ${totalWait}ms... (${retries} left)\x1b[0m`);
      
      await wait(totalWait);
      return fetchWithRetry(url, { ...options, retries: retries - 1, backoff: backoff * 2 });
    }

    if (isTimeout) throw new Error(`Request timeout`);
    throw error;
  }
};