import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { AnalyticsOverview } from '../types';

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [queue, setQueue] = useState<any>(null);

  async function load() {
    const [analyticsResponse, queueResponse] = await Promise.all([
      api.get('/analytics/overview'),
      api.get('/publishing/queue-metrics').catch(() => ({ data: null })),
    ]);
    setData(analyticsResponse.data);
    setQueue(queueResponse.data);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <div className="card">Loading analytics...</div>;

  return (
    <div className="stack">
      <section className="kpi-grid">
        <Kpi label="Reach" value={data.totals.reach} />
        <Kpi label="Impressions" value={data.totals.impressions} />
        <Kpi label="Engagement" value={data.totals.engagement} />
        <Kpi label="Clicks" value={data.totals.clicks} />
      </section>

      {queue && (
        <section className="queue-strip card">
          <strong>Queue:</strong>
          <span>Waiting {queue.waiting}</span>
          <span>Active {queue.active}</span>
          <span>Delayed {queue.delayed}</span>
          <span>Failed {queue.failed}</span>
        </section>
      )}

      <section className="grid two">
        <div className="card chart-card">
          <h2>Performance timeline</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.timeline.map((row) => ({ ...row, collectedAt: new Date(row.collectedAt).toLocaleTimeString() }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="collectedAt" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="reach" strokeWidth={2} />
              <Line type="monotone" dataKey="engagement" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h2>Platform comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.platformBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="reach" />
              <Bar dataKey="engagement" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid two">
        <div className="card chart-card">
          <h2>Follower growth</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.followerGrowth.map((row) => ({ ...row, collectedAt: new Date(row.collectedAt).toLocaleTimeString() }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="collectedAt" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="followerCount" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>Schedule status</h2>
          <div className="status-grid">
            {Object.entries(data.statusCounts || {}).map(([status, count]) => (
              <div key={status}><span>{status}</span><strong>{count}</strong></div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Post-level results</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Post</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Job</th>
                <th>Reach</th>
                <th>Engagement</th>
                <th>Clicks</th>
                <th>URL/Error</th>
              </tr>
            </thead>
            <tbody>
              {data.posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>{post.platform}</td>
                  <td><span className={`badge ${post.status.toLowerCase()}`}>{post.status}</span></td>
                  <td>{post.jobStatus || '—'}</td>
                  <td>{post.metrics?.reach ?? 0}</td>
                  <td>{post.metrics?.engagement ?? 0}</td>
                  <td>{post.metrics?.clicks ?? 0}</td>
                  <td>{post.url ? <a href={post.url} target="_blank">Open</a> : post.errorMessage || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="kpi card">
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}
