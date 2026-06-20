import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, PlusCircle, Unplug } from 'lucide-react';
import { api } from '../lib/api';
import { Platform, SocialAccount } from '../types';

const platforms: Platform[] = ['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'TIKTOK'];

export function AccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await api.get('/platforms/accounts');
    setAccounts(response.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function connect(platform: Platform) {
    setLoading(true);
    try {
      await api.post('/platforms/mock-connect', {
        platform,
        accountName: `${display(platform)} Connected Account`,
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function openOAuth(platform: Platform) {
    const response = await api.get(`/platforms/${platform}/connect-url`);
    if (response.data?.url) window.open(response.data.url, '_blank');
  }

  async function disconnect(id: string) {
    await api.delete(`/platforms/accounts/${id}`);
    await load();
  }

  return (
    <section className="grid two">
      {platforms.map((platform) => {
        const connected = accounts.filter((a) => a.platform === platform && a.status === 'CONNECTED');
        return (
          <div className="card platform-card" key={platform}>
            <div className="platform-head">
              <div>
                <h2>{display(platform)}</h2>
                <p>{connected.length ? `${connected.length} connected account(s)` : 'No connected account yet'}</p>
              </div>
              {connected.length ? <CheckCircle2 className="success" /> : <Unplug className="muted-icon" />}
            </div>
            <div className="account-list">
              {connected.map((account) => {
                const quota = account.quota;
                const pct = quota ? Math.min(100, Math.round((quota.used / Math.max(quota.max, 1)) * 100)) : 0;
                return (
                  <div className="account-row account-row-rich" key={account.id}>
                    <div className="account-main">
                      <strong>{account.accountName}</strong>
                      <span>{account.status} · {account.scopes?.slice(0, 2).join(', ') || 'publish + analytics'}</span>
                      {quota && (
                        <div className="quota-wrap">
                          <div className="quota-bar"><span style={{ width: `${pct}%` }} /></div>
                          <small>{quota.used}/{quota.max} publish quota used</small>
                        </div>
                      )}
                    </div>
                    <button className="ghost danger" onClick={() => disconnect(account.id)}>Disconnect</button>
                  </div>
                );
              })}
            </div>
            <div className="button-row">
              <button className="primary" disabled={loading} onClick={() => connect(platform)}>
                <PlusCircle size={18} /> Mock connect
              </button>
              <button className="ghost" onClick={() => openOAuth(platform)}>
                <ExternalLink size={16} /> OAuth URL
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function display(platform: Platform) {
  if (platform === 'TWITTER') return 'X / Twitter';
  return platform.charAt(0) + platform.slice(1).toLowerCase();
}
