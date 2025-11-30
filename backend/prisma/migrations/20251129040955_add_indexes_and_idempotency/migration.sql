-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bankId" TEXT,
    "accountId" TEXT,
    "balance" REAL DEFAULT 0.0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "accessToken" TEXT,
    "sharableId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bank" ("accessToken", "accountId", "balance", "bankId", "createdAt", "id", "sharableId", "userId") SELECT "accessToken", "accountId", "balance", "bankId", "createdAt", "id", "sharableId", "userId" FROM "Bank";
DROP TABLE "Bank";
ALTER TABLE "new_Bank" RENAME TO "Bank";
CREATE UNIQUE INDEX "Bank_accountId_key" ON "Bank"("accountId");
CREATE INDEX "Bank_userId_idx" ON "Bank"("userId");
CREATE INDEX "Bank_accountId_idx" ON "Bank"("accountId");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "amount" REAL,
    "senderBankId" TEXT,
    "receiverBankId" TEXT,
    "channel" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_senderBankId_fkey" FOREIGN KEY ("senderBankId") REFERENCES "Bank" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_receiverBankId_fkey" FOREIGN KEY ("receiverBankId") REFERENCES "Bank" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "category", "channel", "createdAt", "id", "name", "receiverBankId", "senderBankId", "status") SELECT "amount", "category", "channel", "createdAt", "id", "name", "receiverBankId", "senderBankId", "status" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");
CREATE INDEX "Transaction_senderBankId_idx" ON "Transaction"("senderBankId");
CREATE INDEX "Transaction_receiverBankId_idx" ON "Transaction"("receiverBankId");
CREATE INDEX "Transaction_idempotencyKey_idx" ON "Transaction"("idempotencyKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
