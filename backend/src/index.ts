import express from 'express';
import dotenv from 'dotenv';
import sentryRoute from './routes/sentry-example-api';

dotenv.config();

const app = express();
app.use(express.json());

// mount routes
app.use('/api/sentry-example-api', sentryRoute);

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
