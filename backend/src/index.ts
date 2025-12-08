import express, { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import sentryRoute from './routes/sentry-example-api';
import authRoute from './routes/auth';
import userRoute from './routes/user';
import banksRoute from './routes/banks';
import transactionsRoute from './routes/transactions';
import toolsRoute from './routes/tools';
import transferThrottleRoute from './routes/transfer-throttle';
import rateLimitRoute from './routes/rate-limit';
import Sentry from './sentry';
import { chaosMonkey } from './middleware/chaos';

dotenv.config();

const app = express();
app.use(express.json());
// enable CORS for local frontend (allow credentials for cookie-based auth)
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'].filter(Boolean) as string[];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());


// ==========================================
// + THÊM CHAOS MONKEY VÀO ĐÂY (TRƯỚC ROUTES)
// ==========================================
// Chỉ nên bật khi chạy local dev
if (process.env.NODE_ENV !== 'production') {
    app.use(chaosMonkey);
}
// ==========================================



// mount routes
app.use('/api/sentry-example-api', sentryRoute);
app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/banks', banksRoute);
app.use('/api/transactions', transactionsRoute);
app.use('/api/tools', toolsRoute);
app.use('/api/transfer-throttle', transferThrottleRoute);
app.use('/api/rate-limit', rateLimitRoute);

if (typeof Sentry.setupExpressErrorHandler === 'function') {
  Sentry.setupExpressErrorHandler(app);
}
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = res.statusCode >= 400 ? res.statusCode : 500;
  const eventId = (res as Response & { sentry?: string }).sentry;
  res.status(status).json({
    message: err.message || 'Unexpected server error',
    eventId,
  });
});

const port = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

export default app;
