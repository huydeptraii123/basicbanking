'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import HeaderBox from './HeaderBox'
import Image from 'next/image'
import { fetchWithRetry } from '@/lib/core-fetch'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

interface TwoFactorSetupProps {
  user: any
}

const TwoFactorSetup = ({ user }: TwoFactorSetupProps) => {
  const [qrCode, setQrCode] = useState<string>('')
  const [otpToken, setOtpToken] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  useEffect(() => {
    // Kiểm tra trạng thái 2FA của user
    if (user) {
      fetchUserStatus()
    }
  }, [user])

  const fetchUserStatus = async () => {
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/user/me`, {
        credentials: 'include'
      })
      const data = await res.json()
      if (data.user) {
        setTwoFactorEnabled(data.user.twoFactorEnabled || false)
      }
    } catch (err) {
      console.error('Error fetching user status:', err)
    }
  }

  const handleGetQRCode = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/2fa/qrcode`, {
        method: 'GET',
        credentials: 'include'
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to get QR code')
      }

      setQrCode(data.qrcode)
    } catch (err: any) {
      setError(err.message || 'Failed to get QR code')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSetup = async () => {
    if (!otpToken || otpToken.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${BACKEND_URL}/api/user/2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ otpToken })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to setup 2FA')
      }

      setSuccess('2FA has been activated successfully!')
      setTwoFactorEnabled(true)
      setQrCode('')
      setOtpToken('')
    } catch (err: any) {
      setError(err.message || 'Failed to setup 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA?')) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${BACKEND_URL}/api/user/2fa/disable`, {
        method: 'POST',
        credentials: 'include'
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to disable 2FA')
      }

      setSuccess('2FA has been disabled successfully!')
      setTwoFactorEnabled(false)
      setQrCode('')
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <HeaderBox 
        type="title"
        title="Two-Factor Authentication (2FA)"
        subtext="Add an extra layer of security to your account"
      />

      {twoFactorEnabled ? (
        <div className="flex flex-col gap-4 bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-green-800">2FA is Active</h2>
          </div>
          <p className="text-sm text-gray-600">
            Your account is protected with two-factor authentication.
          </p>
          <Button 
            onClick={handleDisable2FA}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 w-fit"
          >
            {loading ? 'Processing...' : 'Disable 2FA'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {!qrCode ? (
            <div className="flex flex-col gap-4 bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-lg font-semibold text-blue-800">Setup 2FA</h2>
              <p className="text-sm text-gray-600">
                Scan a QR code with your authenticator app (Google Authenticator or Authy) to enable 2FA.
              </p>
              <Button 
                onClick={handleGetQRCode}
                disabled={loading}
                className="bg-bank-gradient w-fit"
              >
                {loading ? 'Loading...' : 'Get QR Code'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6 bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-800">Scan QR Code</h2>
                <div className="relative w-64 h-64 border-2 border-gray-300 rounded-lg p-4">
                  <Image 
                    src={qrCode}
                    alt="2FA QR Code"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center max-w-md">
                  Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>.
                  Then enter the 6-digit code below and click <strong>Confirm</strong> to activate.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="otpToken">Enter 6-digit code</Label>
                  <Input
                    id="otpToken"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                    className="max-w-xs"
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleConfirmSetup}
                    disabled={loading || otpToken.length !== 6}
                    className="bg-bank-gradient"
                  >
                    {loading ? 'Confirming...' : 'Confirm'}
                  </Button>
                  <Button 
                    onClick={() => {
                      setQrCode('')
                      setOtpToken('')
                      setError('')
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-lg border border-green-200">
          {success}
        </div>
      )}
    </div>
  )
}

export default TwoFactorSetup
