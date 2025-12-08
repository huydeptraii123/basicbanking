// Artillery processor for rate limit testing
// Simulates spam behavior from single user

const fs = require('fs');
const path = require('path');

let testData = null;

// Load test data
function loadTestData() {
  if (!testData) {
    try {
      const dataPath = path.join(__dirname, 'test-data.json');
      if (fs.existsSync(dataPath)) {
        testData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log('✓ Loaded test data for rate limit testing');
      } else {
        console.error('⚠ test-data.json not found! Run: npm run rate-limit:prepare');
        testData = {
          authToken: 'auth_token=YOUR_TOKEN',
          user1BankId: 'BANK_1_ID',
          user2BankId: 'BANK_2_ID'
        };
      }
    } catch (err) {
      console.error('Error loading test data:', err);
      testData = {
        authToken: 'auth_token=YOUR_TOKEN',
        user1BankId: 'BANK_1_ID',
        user2BankId: 'BANK_2_ID'
      };
    }
  }
  return testData;
}

// Set auth data - SAME user for all requests to simulate spam
function setAuthData(context, events, done) {
  const data = loadTestData();
  
  context.vars.authToken = data.authToken;
  context.vars.senderBankId = data.user1BankId;
  context.vars.receiverBankId = data.user2BankId;
  
  return done();
}

// Log blocked response
function logBlocked(requestParams, response, context, ee, next) {
  if (response.statusCode === 429) {
    console.log('🚫 Request blocked by rate limiter:', {
      statusCode: 429,
      retryAfter: response.headers['retry-after'],
      timestamp: new Date().toISOString()
    });
  }
  return next();
}

module.exports = {
  setAuthData,
  logBlocked
};
