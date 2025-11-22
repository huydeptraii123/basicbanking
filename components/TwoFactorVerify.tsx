'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

interface TwoFactorVerifyProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const TwoFactorVerify = ({ onSuccess, onCancel }: TwoFactorVerifyProps) => {
  const [otpToken, setOtpToken] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const router = useRouter()

  const handleVerify = async () => {
    if (!otpToken || otpToken.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${BACKEND_URL}/api/user/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ otpToken })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Invalid OTP code')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Two-Factor Authentication
            </h2>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app to continue
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="otpVerify" className="text-center">
                Verification Code
              </Label>
              <Input
                id="otpVerify"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleVerify}
                disabled={loading || otpToken.length !== 6}
                className="bg-bank-gradient w-full"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
              {onCancel && (
                <Button 
                  onClick={onCancel}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-center text-gray-500">
            Don't have access to your authenticator app? Contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TwoFactorVerify
