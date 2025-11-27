// Artillery Processor cho Sign-In Load Testing
// Random chọn user từ pool để test sign-in

const fs = require('fs');
const path = require('path');

let testData = null;
let userIndex = 0;

// Load test data
function loadTestData() {
  if (!testData) {
    try {
      const dataPath = path.join(__dirname, 'test-data.json');
      if (fs.existsSync(dataPath)) {
        testData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log(`✓ Loaded ${testData.totalUsers} test users`);
      } else {
        console.error('⚠ test-data.json not found! Run: npm run load-test:signin:prepare');
        testData = { users: [], totalUsers: 0, testPassword: '' };
      }
    } catch (err) {
      console.error('Error loading test data:', err);
      testData = { users: [], totalUsers: 0, testPassword: '' };
    }
  }
  return testData;
}

// Random user selection
function setRandomUser(context, events, done) {
  const data = loadTestData();
  
  if (data.users.length === 0) {
    console.error('No test users available!');
    return done();
  }
  
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];
  
  context.vars.email = user.email;
  context.vars.password = user.password;
  
  return done();
}

// Round-robin user selection
function setUserRoundRobin(context, events, done) {
  const data = loadTestData();
  
  if (data.users.length === 0) {
    console.error('No test users available!');
    return done();
  }
  
  const user = data.users[userIndex % data.users.length];
  userIndex++;
  
  context.vars.email = user.email;
  context.vars.password = user.password;
  
  return done();
}

module.exports = {
  setRandomUser,
  setUserRoundRobin
};
