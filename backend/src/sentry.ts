import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import '@sentry/profiling-node';

dotenv.config();

const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1);
const profilesSampleRate = Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0);

if (!process.env.SENTRY_DSN) {
  console.warn('SENTRY_DSN is not set. Sentry will run in noop mode.');
}

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  tracesSampleRate,
  profilesSampleRate,
  integrations: integrations => {
    const customIntegrations = [];
    if (typeof Sentry.expressIntegration === 'function') {
      customIntegrations.push(Sentry.expressIntegration());
    }
    return [...integrations, ...customIntegrations];
  },
});

export default Sentry;
