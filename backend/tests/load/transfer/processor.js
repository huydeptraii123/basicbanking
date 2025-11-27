// Artillery processor để set auth token và bank IDs
// Các biến này sẽ được load từ file .env hoặc từ test-data.json

const fs = require('fs');
const path = require('path');

let testData = null;

// Load test data từ file
function loadTestData() {
  if (!testData) {
    try {
      const dataPath = path.join(__dirname, 'test-data.json');
      if (fs.existsSync(dataPath)) {
        testData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log('✓ Loaded test data from test-data.json');
      } else {
        console.error('⚠ test-data.json not found! Run: npm run load-test:prepare');
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

// Set auth data cho mỗi virtual user
function setAuthData(context, events, done) {
  const data = loadTestData();
  
  // Randomly chọn sender và receiver từ 2 banks
  const useBank1AsSender = Math.random() > 0.5;
  
  context.vars.authToken = data.authToken;
  context.vars.senderBankId = useBank1AsSender ? data.user1BankId : data.user2BankId;
  context.vars.receiverBankId = useBank1AsSender ? data.user2BankId : data.user1BankId;
  
  return done();
}

// Log function cho debugging
function logTransaction(context, events, done) {
  console.log('Transaction:', {
    id: context.vars.transactionId,
    senderBalance: context.vars.senderBalance,
    receiverBalance: context.vars.receiverBalance
  });
  return done();
}

module.exports = {
  setAuthData,
  logTransaction
};
