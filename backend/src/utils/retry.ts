

export async function runTransactionWithRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 100
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {

    const isRetryable = 
      error.code === 'P2034' ||
      error.message.includes('deadlock') ||
      error.message.includes('Write conflict');

    if (isRetryable && retries > 0) {
      console.warn(`[Transaction Retry] Database busy, retrying... (${retries} left)`);

      await new Promise(res => setTimeout(res, delay));

      return runTransactionWithRetry(fn, retries - 1, delay * 2);
    }

    throw error;
  }
}