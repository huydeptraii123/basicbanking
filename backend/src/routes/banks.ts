import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Dev/debug: list all banks
router.get('/all', async (req, res) => {
  try {
    const banks = await prisma.bank.findMany();
    return res.json(banks);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'list banks error' });
  }
});

// Dev: sync missing accountId from sharableId (one-time admin helper)
// Accessible via GET so you can call from a browser during development
router.get('/sync-accountIds', async (req, res) => {
  try {
    const banks = await prisma.bank.findMany({ where: { accountId: null } });
    const updates = [] as any[];
    for (const b of banks) {
      console.log('syncing bank id:', b.id, 'sharableId:', b.sharableId);
      if (b.sharableId) {
        const updated = await prisma.bank.update({ where: { id: b.id }, data: { accountId: b.sharableId } });
        updates.push(updated);
      }
    }
    return res.json({ updated: updates.length, details: updates });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'sync error' });
  }
});

// POST /api/banks/exchange-public-token
// kept for backward compatibility but will return 501 if Plaid is not configured
router.post('/exchange-public-token', async (req, res) => {
  return res.status(501).json({ error: 'Plaid exchange is disabled in local-only mode' });
});

// POST /api/banks/create - create a bank record locally without Plaid/Dwolla
router.post('/create', async (req, res) => {
  try {
  const { userId, bankName, accountId, accessToken, sharableId, balance } = req.body;
  if (!userId || !accountId) return res.status(400).json({ error: 'missing fields' });

  // bankName is optional but preferred; if absent, fallback to accountId as name
  const name = bankName || `Account ${accountId.slice(-4)}`;
  // Use provided sharableId if given; otherwise use the public accountId as the sharable id
  const shar = sharableId || accountId;

  // Store bankName into bankId field (previously used for Plaid item id).
  // Keep accountId separate so name and account code are not identical.
  const created = await prisma.bank.create({ data: { userId, bankId: name, accountId: accountId, balance: balance ? Number(balance) : 0, accessToken: accessToken || null, fundingSourceUrl: null, sharableId: shar } });

    return res.json({ ok: true, bank: created });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'create bank error' });
  }
});

// GET /api/banks/user/:userId - list banks for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const banks = await prisma.bank.findMany({ where: { userId } });
    // Normalize sharableId to be the public accountId when available so frontend shows Account ID
    const mapped = banks.map((b) => ({ ...b, sharableId: b.accountId || b.sharableId }));
    return res.json(mapped);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'get banks error' });
  }
});

// GET /api/banks/by-account/:accountId - get bank by accountId or sharableId
router.get('/by-account/:accountId', async (req, res) => {
  try {
    const rawAccountId = req.params.accountId;
    console.log('\n========== [DEBUG by-account lookup] ==========');
    console.log('rawAccountId:', JSON.stringify(rawAccountId));

    // --- Normalize and sanitize ---
    let lookupKey = String(rawAccountId).trim();
    console.log('Step 1 - trimmed lookupKey:', JSON.stringify(lookupKey));

    // --- Base64 decode attempt ---
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (base64Regex.test(lookupKey)) {
      try {
        const decoded = Buffer.from(lookupKey, 'base64').toString('utf8');
        console.log('Step 2 - base64 decoded (raw):', JSON.stringify(decoded));
        if (/^[\x20-\x7E]+$/.test(decoded)) {
          lookupKey = decoded.trim();
          console.log('✅ Step 2 - using decoded base64 as lookupKey:', JSON.stringify(lookupKey));
        } else {
          console.log('⚠️ Step 2 - decoded contained non-printable chars, skipping use.');
        }
      } catch (e: any) {
        console.warn('⚠️ Base64 decode failed:', e?.message || e);
      }
    }

    // --- Sanitize fallbacks ---
    if (!/^[\x20-\x7E]+$/.test(lookupKey)) {
      console.warn('⚠️ Step 3 - invalid printable lookupKey, trying fallback:', JSON.stringify(lookupKey));
      const digits = String(rawAccountId).replace(/\D+/g, '');
      if (digits && digits.length >= 3) {
        lookupKey = digits;
        console.log('✅ Step 3a - digits-only fallback used:', lookupKey);
      } else {
        const asciiOnly = String(rawAccountId).replace(/[^\x20-\x7E]/g, '').trim();
        if (asciiOnly && asciiOnly.length >= 1) {
          lookupKey = asciiOnly;
          console.log('✅ Step 3b - ascii-stripped fallback used:', JSON.stringify(lookupKey));
        } else {
          console.warn('❌ Step 3 - all sanitize fallbacks failed. rawAccountId:', rawAccountId);
          return res.status(400).json({ error: 'invalid account id' });
        }
      }
    }

    console.log('✅ Final lookupKey for Prisma query:', JSON.stringify(lookupKey));

    // --- Prisma lookup ---
    console.log('Step 4 - querying Prisma...');
    let bank = await prisma.bank.findFirst({
      where: { OR: [{ accountId: lookupKey }, { sharableId: lookupKey }] }
    });
    console.log('Step 4a - findFirst exact result:', bank);

    if (!bank) {
      bank = await prisma.bank.findFirst({
        where: {
          OR: [
            { accountId: { contains: lookupKey } },
            { sharableId: { contains: lookupKey } }
          ]
        }
      });
      console.log('Step 4b - findFirst fuzzy result:', bank);
    }

    if (!bank) {
      console.log('❌ Step 5 - no bank found for lookupKey:', JSON.stringify(lookupKey));
      return res.status(404).json({ error: 'bank not found' });
    }

    console.log('✅ Step 6 - Found bank:', bank);
    const mapped = { ...bank, sharableId: bank.accountId || bank.sharableId };
    return res.json(mapped);

  } catch (err: any) {
    console.error('[ERROR] get bank error:', err);
    return res.status(500).json({ error: err.message || 'get bank error' });
  }
});


// GET /api/banks/:id - get bank by id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log('[DEBUG] Lookup started for ID:', id);

    // 1️⃣ exact match
    let bank = await prisma.bank.findUnique({ where: { id } });
    console.log('[DEBUG] Step 1 - findUnique result:', bank);

    // 2️⃣ fallback match (accountId or sharableId)
    if (!bank) {
      bank = await prisma.bank.findFirst({
        where: { OR: [{ accountId: id }, { sharableId: id }] },
      });
      console.log('[DEBUG] Step 2 - findFirst exact result:', bank);
    }

    // 3️⃣ fuzzy match
    if (!bank) {
      bank = await prisma.bank.findFirst({
        where: {
          OR: [
            { accountId: { contains: id } },
            { sharableId: { contains: id } },
          ],
        },
      });
      console.log('[DEBUG] Step 3 - findFirst fuzzy result:', bank);
    }

    // 4️⃣ final result
    if (!bank) {
      console.log('[DEBUG] No bank found after all attempts.');
      return res.status(404).json({ error: 'bank not found' });
    }

    console.log('[DEBUG] ✅ Found bank:', bank);
    const mapped = { ...bank, sharableId: bank.accountId || bank.sharableId };
    return res.json(mapped);

  } catch (err: any) {
    console.error('[ERROR] get bank failed:', err);
    return res.status(500).json({ error: err.message || 'get bank error' });
  }
});


// DELETE /api/banks/:id - delete bank by id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const bank = await prisma.bank.findUnique({ where: { id } });
    if (!bank) return res.status(404).json({ error: 'bank not found' });

    await prisma.bank.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'delete bank error' });
  }
});

export default router;
