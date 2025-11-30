// Hàm làm tròn số an toàn cho tiền tệ (2 chữ số thập phân)
// Ví dụ: 100.0000001 -> 100.00
export function safeRound(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}