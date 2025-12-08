'use client';

import { useEffect, useState } from 'react';
import HeaderBox from '@/components/HeaderBox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
  trackByUser: boolean;
}

interface BlockedUser {
  identifier: string;
  blockedUntil: number;
  retryAfter: number;
  violationCount: number;
}

interface RateLimitStatus {
  enabled: boolean;
  totalTracked: number;
  totalBlocked: number;
  blockedUsers: BlockedUser[];
  config: RateLimitConfig;
  timestamp: string;
}

export default function RateLimitLabPage() {
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({
    windowMs: 60000,
    maxRequests: 30,
    blockDurationMs: 300000,
  });

  // Fetch status
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/rate-limit/status`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch rate limit status');
      }
      
      const data = await res.json();
      setStatus(data);
      
      // Update form with current config
      setConfigForm({
        windowMs: data.config.windowMs,
        maxRequests: data.config.maxRequests,
        blockDurationMs: data.config.blockDurationMs,
      });
      
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto refresh every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Toggle rate limiting
  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/rate-limit/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !status?.enabled }),
      });

      if (!res.ok) throw new Error('Failed to toggle rate limiting');
      
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update config
  const handleUpdateConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/rate-limit/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(configForm),
      });

      if (!res.ok) throw new Error('Failed to update config');
      
      await fetchStatus();
      alert('Configuration updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset all
  const handleReset = async () => {
    if (!confirm('Reset all rate limiting logs and unblock all users?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/rate-limit/reset`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to reset');
      
      await fetchStatus();
      alert('Rate limiting reset successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Unblock user
  const handleUnblock = async (identifier: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/rate-limit/unblock/${encodeURIComponent(identifier)}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to unblock user');
      
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="flex-center size-full">
        <div className="text-center">
          <p className="text-gray-500">Loading rate limit status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <HeaderBox
        type="title"
        title="Rate Limiting Lab 🛡️"
        subtext="Anti-Spam Protection - Block abusive users"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rate Limiting Status</CardTitle>
              <CardDescription>
                Current protection status and statistics
              </CardDescription>
            </div>
            <Badge variant={status.enabled ? "default" : "destructive"}>
              {status.enabled ? "ENABLED ✅" : "DISABLED ❌"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Tracked</p>
              <p className="text-2xl font-bold text-blue-600">{status.totalTracked}</p>
              <p className="text-xs text-gray-500">Users/IPs monitored</p>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Currently Blocked</p>
              <p className="text-2xl font-bold text-red-600">{status.totalBlocked}</p>
              <p className="text-xs text-gray-500">Active blocks</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Protection Level</p>
              <p className="text-2xl font-bold text-green-600">
                {status.enabled ? "HIGH" : "NONE"}
              </p>
              <p className="text-xs text-gray-500">
                {status.enabled ? "Spam blocked" : "Vulnerable"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button 
              onClick={handleToggle}
              disabled={loading}
              variant={status.enabled ? "destructive" : "default"}
            >
              {status.enabled ? "Disable Protection" : "Enable Protection"}
            </Button>
            
            <Button 
              onClick={handleReset}
              disabled={loading}
              variant="outline"
            >
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Configuration</CardTitle>
          <CardDescription>
            Adjust protection parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Window (ms)</label>
              <input
                type="number"
                value={configForm.windowMs}
                onChange={(e) => setConfigForm({ ...configForm, windowMs: parseInt(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min={1000}
                step={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                Time window: {(configForm.windowMs / 1000).toFixed(0)}s
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Max Requests</label>
              <input
                type="number"
                value={configForm.maxRequests}
                onChange={(e) => setConfigForm({ ...configForm, maxRequests: parseInt(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min={1}
              />
              <p className="text-xs text-gray-500 mt-1">
                Requests per window
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Block Duration (ms)</label>
              <input
                type="number"
                value={configForm.blockDurationMs}
                onChange={(e) => setConfigForm({ ...configForm, blockDurationMs: parseInt(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min={1000}
                step={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                Block time: {(configForm.blockDurationMs / 60000).toFixed(0)}min
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="text-sm font-medium mb-2">Current Rule:</p>
            <p className="text-sm text-gray-700">
              Allow <span className="font-bold text-blue-600">{configForm.maxRequests} requests</span> per{' '}
              <span className="font-bold text-blue-600">{(configForm.windowMs / 1000).toFixed(0)} seconds</span>.
              <br />
              Block violators for{' '}
              <span className="font-bold text-red-600">{(configForm.blockDurationMs / 60000).toFixed(0)} minutes</span>.
            </p>
          </div>

          <Button onClick={handleUpdateConfig} disabled={loading}>
            Update Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Blocked Users Card */}
      {status.blockedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Blocked Users ({status.blockedUsers.length})</CardTitle>
            <CardDescription>
              Users/IPs currently blocked for spam
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.blockedUsers.map((user) => (
                <div
                  key={user.identifier}
                  className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium">{user.identifier}</p>
                    <p className="text-xs text-gray-600">
                      Violations: {user.violationCount} • Retry in: {user.retryAfter}s
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnblock(user.identifier)}
                    disabled={loading}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Testing Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Guide 🧪</CardTitle>
          <CardDescription>
            How to test rate limiting effectiveness
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-2">1. Prepare Test Data</h3>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              cd backend{'\n'}
              npm run rate-limit:prepare
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">2. Test WITHOUT Rate Limiting</h3>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              # Disable protection{'\n'}
              Invoke-RestMethod -Uri "{backendUrl}/api/rate-limit/toggle" `{'\n'}
              {'  '}-Method Post -Body '{`{"enabled":false}`}' -ContentType "application/json"{'\n'}
              {'\n'}
              # Run spam test{'\n'}
              npm run rate-limit:auto:100
            </pre>
            <p className="text-xs text-gray-600 mt-2">
              Expected: 100% success - all spam requests allowed ❌
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">3. Test WITH Rate Limiting</h3>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              # Enable protection{'\n'}
              Invoke-RestMethod -Uri "{backendUrl}/api/rate-limit/toggle" `{'\n'}
              {'  '}-Method Post -Body '{`{"enabled":true}`}' -ContentType "application/json"{'\n'}
              {'\n'}
              # Run spam test{'\n'}
              npm run rate-limit:auto:100
            </pre>
            <p className="text-xs text-gray-600 mt-2">
              Expected: ~30% success, ~70% blocked - spam protection working ✅
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">4. Compare Results</h3>
            <p className="text-sm text-gray-700">
              The automated test will show comparison of success rate, blocked rate, and effectiveness.
              <br />
              See detailed results in <code className="bg-gray-200 px-1 rounded">backend/tests/rate-limit/results/</code>
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">💡 Pro Tip</p>
            <p className="text-xs text-blue-700 mt-1">
              Rate Limiting protects against spam from SINGLE user.
              <br />
              Throttling protects against HIGH TRAFFIC from MANY users.
              <br />
              Use both for complete protection!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-500">
        Last updated: {new Date(status.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
