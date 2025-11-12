import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import sentryRoute from './routes/sentry-example-api';
import authRoute from './routes/auth';
import userRoute from './routes/user';
import banksRoute from './routes/banks';
import transactionsRoute from './routes/transactions';

dotenv.config();

const app = express();
app.use(express.json());
// enable CORS for local frontend (allow credentials for cookie-based auth)
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'].filter(Boolean) as string[];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());

// mount routes
app.use('/api/sentry-example-api', sentryRoute);
app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/banks', banksRoute);
app.use('/api/transactions', transactionsRoute);

const port = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

export default app;
