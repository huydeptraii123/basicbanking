import { join } from 'path';
import fs from 'fs';

type User = {
  id: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  dwollaCustomerId?: string | null;
  dwollaCustomerUrl?: string | null;
  createdAt?: string;
};

type Bank = {
  id: string;
  userId: string;
  bankId?: string;
  accountId?: string;
  accessToken?: string;
  fundingSourceUrl?: string | null;
  sharableId?: string;
  createdAt?: string;
};

type Transaction = {
  id: string;
  name?: string;
  amount?: number;
  senderBankId?: string | null;
  receiverBankId?: string | null;
  channel?: string;
  category?: string;
  createdAt?: string;
};

type Data = {
  users: User[];
  banks: Bank[];
  transactions: Transaction[];
};

const dataDir = process.env.DB_DATA_DIR || join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const file = join(dataDir, 'db.json');

function readFile() {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as Data;
  } catch (e) {
    return { users: [], banks: [], transactions: [] } as Data;
  }
}

function writeFile(data: Data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const db = {
  data: readFile() as Data,
  read() {
    this.data = readFile();
  },
  write() {
    writeFile(this.data);
  },
};

// ensure file exists
db.write();

export default db;
 
