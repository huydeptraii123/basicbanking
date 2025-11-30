// src/lib/cache.ts
// PHIÊN BẢN KHÔNG CẦN CÀI REDIS (Dùng biến cục bộ để giả lập)

// Biến lưu trữ tạm thời trong RAM (Mất khi restart server)
const memoryCache = new Map<string, { value: string, expiry: number }>();

export const cacheService = {
  // Giả lập lệnh GET
  async getBalance(bankId: string): Promise<string | null> {
    const key = `bank:balance:${bankId}`;
    const item = memoryCache.get(key);
    
    // Kiểm tra hết hạn
    if (!item) return null;
    if (Date.now() > item.expiry) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  },

  // Giả lập lệnh SET
  async setBalance(bankId: string, balance: number | string): Promise<void> {
    const key = `bank:balance:${bankId}`;
    // Lưu trong 5 phút (300000 ms)
    memoryCache.set(key, { 
      value: String(balance), 
      expiry: Date.now() + 5 * 60 * 1000 
    });
  },

  // Giả lập lệnh DEL
  async invalidateBalance(bankId: string): Promise<void> {
    const key = `bank:balance:${bankId}`;
    memoryCache.delete(key);
  },

  // Giả lập Idempotency (Chống lặp)
  async checkIdempotency(key: string): Promise<boolean> {
    const redisKey = `tx:idempotency:${key}`;
    const item = memoryCache.get(redisKey);
    if (!item) return false;
    if (Date.now() > item.expiry) {
      memoryCache.delete(redisKey);
      return false;
    }
    return true;
  },

  async setIdempotency(key: string, data: any): Promise<void> {
    const redisKey = `tx:idempotency:${key}`;
    // Lưu trong 24h
    memoryCache.set(redisKey, { 
      value: JSON.stringify(data), 
      expiry: Date.now() + 24 * 60 * 60 * 1000 
    });
  }
};

// Export một object giả để các file khác import không bị lỗi type
export default {};