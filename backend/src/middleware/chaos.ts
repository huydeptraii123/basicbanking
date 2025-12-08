import { Request, Response, NextFunction } from 'express';

// CẤU HÌNH ĐỘ KHÓ
const CHAOS_ENABLED = false; // Bật/Tắt tổng
const FAILURE_RATE = 0.7;   // 70% sẽ bị lỗi (30% thành công)
const DELAY_MS = 0;         // Có muốn làm chậm server không? (0 = không)

export const chaosMonkey = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Chỉ chạy khi bật cờ và không phải môi trường Production
  if (!CHAOS_ENABLED || process.env.NODE_ENV === 'production') {
    return next();
  }

  // // 2. Chỉ phá hoại các request GET (Vì chúng ta đang test Retry cho thao tác Đọc)
  // // Các request quan trọng như POST login/transaction thì tha cho nó
  // if (req.method !== 'GET') {
  //   return next();
  // }

  // 3. Roll dice (Tung xúc xắc)
  const random = Math.random();

  if (random < FAILURE_RATE) {
    console.log(`\x1b[31m[CHAOS MONKEY] 💥 BÙM! Chặn request: ${req.method} ${req.url}\x1b[0m`);
    
    // Nếu có config delay thì chờ chút mới báo lỗi (Giả lập mạng lag + timeout)
    if (DELAY_MS > 0) {
        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    // Trả về lỗi 503 Service Unavailable
    return res.status(503).json({ 
        error: 'CHAOS_MONKEY_ERROR', 
        message: 'Server đang bị khỉ phá hoại! Vui lòng thử lại.' 
    });
  }

  console.log(`\x1b[32m[CHAOS MONKEY] ✅ May mắn! Cho qua: ${req.method} ${req.url}\x1b[0m`);
  next();
};