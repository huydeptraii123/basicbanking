import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Sentry from '../sentry';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import prisma from '../prisma';

const router = Router();

const SERVICE_NAME = 'SHBank';

// GET /api/user/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // authMiddleware sets req.user
    if (!req.user) {
      return res.status(200).json({ user: null });
    }
    return res.json({ user: req.user });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error(err);
    return res.status(500).json({ user: null });
  }

});

// GET /api/user/2fa/qrcode - Lấy QR code để setup 2FA
router.get('/2fa/qrcode', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Tạo hoặc lấy secret key
    let twoFactorSecret = user.twoFactorSecret;
    if (!twoFactorSecret) {
      // Tạo mới secret key
      twoFactorSecret = authenticator.generateSecret();
      
      // Lưu vào database
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret }
      });
    }

    // Tạo OTP Auth URL
    const otpAuthUrl = authenticator.keyuri(
      user.email,
      SERVICE_NAME,
      twoFactorSecret
    );

    // Tạo QR Code từ OTP Auth URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return res.json({ 
      qrcode: qrCodeDataUrl,
      secret: twoFactorSecret 
    });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/user/2fa/setup - Xác nhận và bật 2FA
router.post('/2fa/setup', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { otpToken } = req.body;
    
    if (!otpToken) {
      return res.status(400).json({ message: 'OTP token is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'Two-factor secret not found. Please get QR code first.' });
    }

    // Verify OTP token
    const isValid = authenticator.verify({
      token: otpToken,
      secret: user.twoFactorSecret
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP token' });
    }

    // Bật 2FA cho user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
    });

    return res.json({ 
      message: '2FA enabled successfully',
      twoFactorEnabled: updatedUser.twoFactorEnabled
    });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/user/2fa/verify - Xác thực OTP khi đăng nhập
router.post('/2fa/verify', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { otpToken } = req.body;
    
    if (!otpToken) {
      return res.status(400).json({ message: 'OTP token is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'Two-factor authentication is not set up' });
    }

    // Verify OTP token
    const isValid = authenticator.verify({
      token: otpToken,
      secret: user.twoFactorSecret
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP token' });
    }

    return res.json({ 
      message: '2FA verification successful',
      verified: true
    });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/user/2fa/disable - Tắt 2FA
router.post('/2fa/disable', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

    return res.json({ 
      message: '2FA disabled successfully',
      twoFactorEnabled: updatedUser.twoFactorEnabled
    });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
export default router;
