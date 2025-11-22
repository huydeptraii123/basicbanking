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
// const get2FA_QRCode = async (req, res) => {
//   try {
//     const user = await UserDB.findOne({ _id: req.params.id })
//     if (!user) {
//       res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found!' })
//       return
//     }

//     // Biến lưu trữ 2fa secret key của user
//     let twoFactorSecretKeyValue = null
//     // Lấy 2fa secret key của user từ bảng 2fa_secret_keys
//     const twoFactorSecretKey = await TwoFactorSecretKeyDB.findOne({ user_id: user._id })
    
//     if (!twoFactorSecretKey) {
//       // Nếu chưa có secret key riêng của user thì tạo mới secret key cho user
//       const newTwoFactorSecretKey = await TwoFactorSecretKeyDB.insert({
//         user_id: user._id,
//         value: authenticator.generateSecret() // generateSecret() là một hàm từ otplib để tạo một random secret key mới, đúng chuẩn.
//       })

//       twoFactorSecretKeyValue = newTwoFactorSecretKey.value
//     } else {
//       // Ngược lại nếu user đã có rồi thì lấy ra sử dụng luôn.
//       twoFactorSecretKeyValue = twoFactorSecretKey.value
//     }

//     // Tạo OTP Auth Token
//     const otpAuthToken = authenticator.keyuri(
//       user.username,
//       SERVICE_NAME,
//       twoFactorSecretKeyValue
//     )

//     // Tạo một ảnh QR Code từ OTP Auth Token để gửi về cho client
//     const QRCodeImageUrl = await QRCode.toDataURL(otpAuthToken)

//     res.status(StatusCodes.OK).json({ qrcode: QRCodeImageUrl })
//   } catch (error) {
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
//   }
// }
// export const get2FA_QRCodeAPI = async (userId) => {
//   const res = await authorizedAxiosInstance.get(`${API_ROOT}/v1/users/${userId}/get_2fa_qr_code`)
//   return res.data
// }

// const setup2FA = async (req, res) => {
//   try {
//     // B1: Lấy user từ bảng users
//     const user = await UserDB.findOne({ _id: req.params.id })
//     if (!user) {
//       res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found!' })
//       return
//     }

//     // B2: Lấy secret key của user từ bảng 2fa_secret_keys
//     const twoFactorSecretKey = await TwoFactorSecretKeyDB.findOne({ user_id: user._id })
//     if (!twoFactorSecretKey) {
//       res.status(StatusCodes.NOT_FOUND).json({ message: 'Two-Factor secret key not found!' })
//       return
//     }

//     // Bước 3: Nếu user đã có secret key thì sẽ kiểm tra OTP Token từ Client gửi lên
//     const clientOtpToken = req.body.otpToken
//     const isValid = authenticator.verify({
//       token: clientOtpToken,
//       secret: twoFactorSecretKey.value
//     })

//     if (!isValid) {
//       res.status(StatusCodes.NOT_FOUND).json({ message: 'Invalid OTP Token!' })
//       return
//     }

//     // Bước 4: Nếu OTP Token hợp lệ thì nghĩa là đã xác thực 2FA thành công, tiếp theo sẽ cập nhật lại thông tin require_2fa của user trong Database
//     const updatedUser = await UserDB.update(
//       { _id: user._id },
//       { $set: { require_2fa: true } },
//       { returnUpdatedDocs: true }
//     )

//     /**
//      * Bước 5: Lúc này tùy vào spec dự án mà sẽ giữ phiên đăng nhập hợp lệ cho user, hoặc yêu cầu bắt buộc
//      * user phải đăng nhập lại. Cái này tùy theo nhu cầu.
//      * * Ở đây mình sẽ chọn giữ phiên đăng nhập hợp lệ cho user giống như Google họ làm. Khi nào user chủ động
//      * đăng xuất và đăng nhập lại hoặc user nó đăng nhập trên một device khác thì mới yêu cầu require_2fa
//      */
//     // Vì user lúc này mới bật 2fa nên chúng ta sẽ tạo mới một phiên đăng nhập hợp lệ cho user với định danh trình duyệt hiện tại.
//     const newUserSession = await UserSessionDB.insert({
//       user_id: user._id,
//       // Lấy userAgent từ req.headers để định danh trình duyệt của user (device_id)
//       device_id: req.headers['user-agent'],
//       // Xác định phiên đăng nhập này là hợp lệ với 2FA
//       is_2fa_verified: true,
//       last_login: new Date().valueOf()
//     })

//     // Bước 6: Trả về dữ liệu cần thiết cho phía Front-end
//     res.status(StatusCodes.OK).json({
//       ...pickUser(updatedUser),
//       is_2fa_verified: newUserSession.is_2fa_verified,
//       last_login: newUserSession.last_login
//     })

//   } catch (error) {
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
//   }
// }

// const verify2FA = async (req, res) => {
//   try {
//     // Bước 1: Lấy user từ bảng users
//     const user = await UserDB.findOne({ _id: req.params.id })
//     if (!user) {
//       res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found!' })
//       return
//     }

//     // Bước 2: Lấy secret key của user từ bảng 2fa_secret_keys
//     const twoFactorSecretKey = await TwoFactorSecretKeyDB.findOne({ user_id: user._id })
//     if (!twoFactorSecretKey) {
//       res.status(StatusCodes.NOT_FOUND).json({ message: 'Two-Factor secret key not found!' })
//       return
//     }

//     // Bước 3: Nếu user đã có secret key thì sẽ kiểm tra OTP Token từ Client gửi lên
//     const clientOtpToken = req.body.otpToken
//     if (!clientOtpToken) {
//       res.status(StatusCodes.NOT_FOUND).json({ message: 'OTP Token not found!' })
//       return
//     }

//     const isValid = authenticator.verify({
//       token: clientOtpToken,
//       secret: twoFactorSecretKey.value
//     })

//     if (!isValid) {
//       res.status(StatusCodes.NOT_ACCEPTABLE).json({ message: 'Invalid OTP Token!' })
//       return
//     }

//     // Bước 4: Nếu OTP Token hợp lệ thì bước xác thực 2FA thành công, Cập nhật lại phiên đăng nhập hợp lệ cho user
//     const updatedUserSession = await UserSessionDB.update(
//       { 
//         user_id: user._id, 
//         device_id: req.headers['user-agent'] 
//       },
//       { 
//         $set: { is_2fa_verified: true },
//         returnUpdatedDocs: true 
//       }
//     )

//     // Bước 5: Trả về dữ liệu cần thiết cho phía Front-end
//     res.status(StatusCodes.OK).json({
//       ...pickUser(user),
//       is_2fa_verified: updatedUserSession.is_2fa_verified,
//       last_login: updatedUserSession.last_login
//     })

//   } catch (error) {
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
//   }
// }
export default router;
