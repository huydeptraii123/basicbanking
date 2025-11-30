// src/utils/retry.ts

// Hàm bọc (Wrapper) để thực hiện thử lại transaction
export async function runTransactionWithRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 100
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Mã lỗi P2034 (Transaction failed due to write conflict/deadlock)
    // Mã lỗi P2002 (Unique constraint failed - check lại logic)
    const isRetryable = 
      error.code === 'P2034' || // Transaction write conflict
      error.message.includes('deadlock') ||
      error.message.includes('Write conflict');

    if (isRetryable && retries > 0) {
      console.warn(`[Transaction Retry] Database busy, retrying... (${retries} left)`);
      // Chờ một chút (Exponential Backoff) trước khi thử lại
      await new Promise(res => setTimeout(res, delay));
      // Gọi đệ quy, giảm số lần retry, tăng thời gian chờ
      return runTransactionWithRetry(fn, retries - 1, delay * 2);
    }

    throw error;
  }
}