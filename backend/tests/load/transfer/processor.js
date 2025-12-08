// Artillery processor để set auth token và bank IDs
// Các biến này sẽ được load từ file .env hoặc từ test-data.json

const fs = require('fs');
const path = require('path');

let testData = null;

// Load test data từ file và set vào context
function loadTestData(context, events, done) {
  if (!testData) {
    try {
      const dataPath = path.join(__dirname, 'test-data.json');
      if (fs.existsSync(dataPath)) {
        testData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log('✓ Loaded test data from test-data.json');
      } else {
        console.error('⚠ test-data.json not found! Run: npm run load-test:prepare');
        return done(new Error('test-data.json not found'));
      }
    } catch (err) {
      console.error('Error loading test data:', err);
      return done(err);
    }
  }
  
  // Set variables
  context.vars.email = testData.email;
  context.vars.password = testData.password;
  
  // Random amount 10-100
  context.vars.amount = Math.floor(Math.random() * 91) + 10;
  
  // Random direction
  const useBank1AsSource = Math.random() < 0.5;
  context.vars.sourceAccountId = useBank1AsSource ? testData.user1BankId : testData.user2BankId;
  context.vars.destinationAccountId = useBank1AsSource ? testData.user2BankId : testData.user1BankId;
  
  return done();
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
  loadTestData,
  setAuthData,
  logTransaction
};
