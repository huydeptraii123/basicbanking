'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

type MetricSnapshot = {
  timestamp: string;
  cpuLoad: number;
  memory: {
    usedPercent: number;
  };
  network: {
    rxBytes: number;
    txBytes: number;
  };
};

type DerivedMetrics = {
  throughputRps: number;
  errorRate: number;
  httpFailureRate?: number;
  checkFailureRate?: number;
  latencyP95?: number | null;
  latencyAvg?: number | null;
  networkMbps?: number | null;
};

type LoadTestResult = {
  timestamp: string;
  throttle: {
    enabled: boolean;
    maxConcurrent: number;
    queueMax: number;
    maxWaitMs: number;
  };
  load: {
    requestCount: number;
    durationSeconds: number;
  };
  derivedMetrics: DerivedMetrics;
  systemBefore: MetricSnapshot;
  systemAfter: MetricSnapshot;
};

type ApiResponse = {
  current: LoadTestResult | null;
  previous: LoadTestResult | null;
};

const defaultForm = {
  enabled: true,
  maxConcurrent: 600,
  queueMax: 400,
  maxWaitMs: 4000,
  requestCount: 2000,
  durationSeconds: 3,
  mode: 'local' as 'local' | 'docker',
  baseUrl: process.env.NEXT_PUBLIC_LOAD_TEST_BASE_URL || 'http://localhost:4000',
};

const formatNumber = (value: number | null | undefined, fraction = 2) => {
  if (value === null || value === undefined) return '–';
  return Number(value).toFixed(fraction);
};

export default function LoadLabPage() {
  const [form, setForm] = useState(defaultForm);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/tools/load-test/latest`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as ApiResponse;
      setResults(data);
    } catch (err) {
      console.error('Failed to fetch latest results', err);
    }
  };

  useEffect(() => {
    fetchLatest();
  }, []);

  const handleChange = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value: any;
    if (event.target.type === 'checkbox') {
      value = event.target.checked;
    } else if (event.target.type === 'number') {
      value = Number(event.target.value);
    } else {
      value = event.target.value;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, mode: event.target.value as 'local' | 'docker' }));
  };

  const startTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendUrl}/api/tools/load-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          throttle: {
            enabled: form.enabled,
            maxConcurrent: form.maxConcurrent,
            queueMax: form.queueMax,
            maxWaitMs: form.maxWaitMs,
          },
          load: {
            requestCount: form.requestCount,
            durationSeconds: form.durationSeconds,
          },
          mode: form.mode,
          target: form.baseUrl ? { baseUrl: form.baseUrl } : undefined,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Load test failed');
      }

      const data = (await res.json()) as ApiResponse;
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to run load test');
    } finally {
      setLoading(false);
    }
  };

  const comparisonMetrics = useMemo(() => {
    if (!results?.current || !results?.previous) return [];

    const currentRow = {
      throughput: results.current.derivedMetrics.throughputRps,
      errorRate: results.current.derivedMetrics.errorRate * 100,
      latency: results.current.derivedMetrics.latencyP95 ?? null,
      cpu: results.current.systemAfter.cpuLoad,
      memory: results.current.systemAfter.memory.usedPercent,
      network: (results.current.derivedMetrics.networkMbps || 0) * 8,
    };
    const previousRow = {
      throughput: results.previous.derivedMetrics.throughputRps,
      errorRate: results.previous.derivedMetrics.errorRate * 100,
      latency: results.previous.derivedMetrics.latencyP95 ?? null,
      cpu: results.previous.systemAfter.cpuLoad,
      memory: results.previous.systemAfter.memory.usedPercent,
      network: (results.previous.derivedMetrics.networkMbps || 0) * 8,
    };

    return [
      { label: 'Throughput (req/s)', current: currentRow.throughput, previous: previousRow.throughput, decimals: 0 },
      { label: 'Error %', current: currentRow.errorRate, previous: previousRow.errorRate, decimals: 2 },
      { label: 'P95 Latency (ms)', current: currentRow.latency, previous: previousRow.latency, decimals: 1 },
      { label: 'CPU %', current: currentRow.cpu, previous: previousRow.cpu, decimals: 1 },
      { label: 'Memory %', current: currentRow.memory, previous: previousRow.memory, decimals: 1 },
      { label: 'Network (Mb/s)', current: currentRow.network, previous: previousRow.network, decimals: 2 },
    ];
  }, [results]);

  return (
    <div className="p-6 space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-4">Load Lab</h1>
        <p className="text-sm text-slate-500 mb-6">
          Tinh chỉnh throttling và chạy kịch bản k6 để quan sát throughput, error rate, CPU, memory và độ trễ.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Max concurrent</span>
            <input
              type="number"
              value={form.maxConcurrent}
              onChange={handleChange('maxConcurrent')}
              className="rounded-md border px-3 py-2"
              min={1}
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Queue size</span>
            <input
              type="number"
              value={form.queueMax}
              onChange={handleChange('queueMax')}
              className="rounded-md border px-3 py-2"
              min={0}
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Max wait (ms)</span>
            <input
              type="number"
              value={form.maxWaitMs}
              onChange={handleChange('maxWaitMs')}
              className="rounded-md border px-3 py-2"
              min={0}
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Request count</span>
            <input
              type="number"
              value={form.requestCount}
              onChange={handleChange('requestCount')}
              className="rounded-md border px-3 py-2"
              min={1}
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Duration (s)</span>
            <input
              type="number"
              value={form.durationSeconds}
              onChange={handleChange('durationSeconds')}
              className="rounded-md border px-3 py-2"
              min={1}
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={handleChange('enabled')}
              className="h-4 w-4"
            />
            <span className="font-medium">Enable throttling</span>
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Runner mode</span>
            <select
              value={form.mode}
              onChange={handleModeChange}
              className="rounded-md border px-3 py-2"
            >
              <option value="local">Local CLI</option>
              <option value="docker">Docker container</option>
            </select>
          </label>
          <label className="flex flex-col text-sm md:col-span-2">
            <span className="mb-1 font-medium">Target base URL</span>
            <input
              type="text"
              value={form.baseUrl}
              onChange={handleChange('baseUrl')}
              className="rounded-md border px-3 py-2"
              placeholder="http://localhost:4000"
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          onClick={startTest}
          disabled={loading}
          className="mt-6 inline-flex items-center rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Start test'}
        </button>
      </section>

      {results?.current && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Current result</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Throughput (req/s)" value={formatNumber(results.current.derivedMetrics.throughputRps)} />
            <MetricCard label="Error rate (%)" value={formatNumber(results.current.derivedMetrics.errorRate * 100)} />
            <MetricCard label="P95 latency (ms)" value={formatNumber(results.current.derivedMetrics.latencyP95 ?? null)} />
            <MetricCard label="CPU after (%)" value={formatNumber(results.current.systemAfter.cpuLoad)} />
            <MetricCard label="Memory after (%)" value={formatNumber(results.current.systemAfter.memory.usedPercent)} />
            <MetricCard label="Network (MB/s)" value={formatNumber(results.current.derivedMetrics.networkMbps ?? null)} />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Run at {new Date(results.current.timestamp).toLocaleString()} with {results.current.load.requestCount} requests / {results.current.load.durationSeconds}s.
          </p>
        </section>
      )}

      {comparisonMetrics.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">So sánh theo tiêu chí</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {comparisonMetrics.map((metric) => (
              <MiniChart key={metric.label} metric={metric} />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Mỗi biểu đồ hiển thị lần chạy hiện tại so với lần ngay trước đó.</p>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MiniChart({ metric }: { metric: ComparisonMetric }) {
  const data = useMemo(() => ({
    labels: ['Previous', 'Current'],
    datasets: [
      {
        label: metric.label,
        data: [metric.previous ?? 0, metric.current ?? 0],
        backgroundColor: ['rgba(148,163,184,0.8)', 'rgba(59,130,246,0.8)'],
      },
    ],
  }), [metric]);

  const options = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatNumber(ctx.parsed.x, metric.decimals)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { display: false } },
    },
  }), [metric.decimals]);

  return (
    <div className="rounded-lg border border-slate-100 p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{metric.label}</h3>
      <Bar data={data} options={options} height={metric.label.includes('Latency') ? 120 : 90} />
    </div>
  );
}

type ComparisonMetric = {
  label: string;
  current: number | null | undefined;
  previous: number | null | undefined;
  decimals?: number;
};
