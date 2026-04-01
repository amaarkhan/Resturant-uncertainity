import { useState, useEffect } from "react";
import { 
  ShieldCheck, Users, Store, LayoutDashboard, Coffee, 
  Settings, LogOut, CheckCircle, AlertCircle, RefreshCw, X,
  Activity, Database
} from "lucide-react";

const rawApiBase = import.meta.env.VITE_API_BASE?.trim();
const API_BASE = rawApiBase ? `${rawApiBase.replace(/\/+$/, "")}/api/v1` : "/api/v1";

async function request(path, { method = "GET", body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch {
    const apiHint = rawApiBase || "http://localhost:4000";
    throw new Error(`Cannot reach API (${apiHint}). Check API deployment health, CORS, and VITE_API_BASE.`);
  }

  const payload = await res.text();
  let json = {};
  if (payload) {
    try {
      json = JSON.parse(payload);
    } catch {
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
    }
  }

  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export function App() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("restaurants");

  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeRestaurant, setActiveRestaurant] = useState(null);

  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session, activeTab]);

  const showToast = (msg, isErr = false) => {
    if (isErr) setError(msg);
    else setMessage(msg);
    setTimeout(() => { setError(""); setMessage(""); }, 5000);
  };

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await request("/auth/login", { method: "POST", body: { email, password } });
      if (data.role !== "ADMIN") throw new Error("Requires ADMIN privileges");
      setSession(data);
      showToast("Logged in as Admin");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function loadData() {
    try {
      if (activeTab === "restaurants") {
        const d = await request("/admin/restaurants", { token: session.accessToken });
        setRestaurants(d.restaurants || []);
      } else if (activeTab === "menuInfo") {
        const d = await request("/admin/menu-items", { token: session.accessToken });
        setMenuItems(d.menuItems || []);
      } else if (activeTab === "users") {
        const d = await request("/admin/users", { token: session.accessToken });
        setUsers(d.users || []);
      } else if (activeTab === "dashboard") {
        const pmf = await request("/admin/metrics/overview", { token: session.accessToken });
        setOverview(pmf);
        const dash = await request("/admin/dashboard", { token: session.accessToken });
        setDashboard(dash);
      } else if (activeTab === "telemetry") {
        const stats = await request("/admin/metrics/instrumentation", { token: session.accessToken });
        setOverview(stats); // Reusing overview state variable for telemetry data
      }
    } catch (err) {
      showToast("Error loading data: " + err.message, true);
    }
  }

  // Modals & Submits
  const saveConfiguration = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await request(`/admin/restaurants/${activeRestaurant.id}`, {
        method: "PATCH",
        token: session.accessToken,
        body: activeRestaurant
      });
      showToast("Configuration saved successfully");
      setShowConfigModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center w-full" style={{ minHeight: "100vh", backgroundColor: "var(--bg-core)" }}>
        <div className="card" style={{ maxWidth: "420px", width: "100%" }}>
          <div className="flex-col items-center mb-8">
            <ShieldCheck size={48} className="text-primary mb-4" />
            <h1 className="text-2xl">Admin Portal</h1>
            <p className="text-muted">Command center access</p>
          </div>
          {error && (
            <div className="mb-4" style={{ padding: "1rem", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: "var(--radius-md)" }}>
              {error}
            </div>
          )}
          <form onSubmit={login} className="form-group">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="input mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="btn btn-primary mt-4 w-full" disabled={loading}>
              {loading ? <RefreshCw className="animate-spin" size={18} /> : "Authenticate"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <ShieldCheck className="text-primary" size={24} /> Admin Core
        </div>
        <nav className="flex-col gap-2">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={18} /> Monitoring Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'telemetry' ? 'active' : ''}`} onClick={() => setActiveTab('telemetry')}>
            <Activity size={18} /> MVP Telemetry
          </button>
          <button className={`nav-item ${activeTab === 'restaurants' ? 'active' : ''}`} onClick={() => setActiveTab('restaurants')}>
            <Store size={18} /> Restaurants Config
          </button>
          <button className={`nav-item ${activeTab === 'menuInfo' ? 'active' : ''}`} onClick={() => setActiveTab('menuInfo')}>
            <Coffee size={18} /> Global Menu Base
          </button>
          <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={18} /> Personnel
          </button>
        </nav>
        
        <div style={{ marginTop: 'auto' }}>
          <button className="nav-item" onClick={() => setSession(null)}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl" style={{textTransform: 'capitalize'}}>{activeTab.replace(/([A-Z])/g, ' $1').trim()}</h1>
            <p className="text-muted text-sm">Manage system resources and view live metrics.</p>
          </div>
          {(message || error) && (
            <div className="flex-row px-4 py-2" style={{ background: error ? 'var(--danger-bg)' : 'var(--success-bg)', color: error ? 'var(--danger)' : 'var(--success)', borderRadius: 'var(--radius-full)' }}>
              {error ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              <span className="text-sm font-medium">{error || message}</span>
            </div>
          )}
        </header>

        {activeTab === 'dashboard' && overview && dashboard && (
          <div className="flex-col gap-6">
            <h2 className="text-xl">Platform Health & Coverage</h2>
            <div className="grid-cols-3">
              <div className="stat-card">
                <span className="stat-label">Active Deployments</span>
                <span className="stat-value">{dashboard.activeRestaurants}</span>
                <span className="stat-desc">Restaurants currently live</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Daily 14-Day Usage Rate</span>
                <span className="stat-value text-primary">{dashboard.usageRate}%</span>
                <span className="stat-desc">Expected vs actual generate requests</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Fallback Errors</span>
                <span className="stat-value" style={{color: dashboard.errorCount > 0 ? 'var(--danger)' : 'var(--success)'}}>{dashboard.errorCount}</span>
                <span className="stat-desc">Weather/Event API failures in 14 days</span>
              </div>
            </div>

            <h2 className="text-xl mt-4">Product-Market Fit Snapshot</h2>
            <div className="grid-cols-3">
              <div className="stat-card">
                <span className="stat-label">Total Waste Rate</span>
                <span className="stat-value">{overview.wastePercent}%</span>
                <span className="stat-desc">From {overview.totalOutcomes} outcome entries</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Stockout Rate</span>
                <span className="stat-value">{overview.stockoutRate}%</span>
                <span className="stat-desc">Days impacted by stockouts</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">System Trust Score</span>
                <span className="stat-value">{overview.trustScore}</span>
                <span className="stat-desc">Out of 5.0 baseline</span>
              </div>
            </div>
            
            <div className="card mt-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg">Recommendation Follow Rate</h3>
                <span className="text-2xl text-primary font-bold">{(overview.recommendationFollowRate * 100).toFixed(1)}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-surface-hover)', borderRadius: '4px' }}>
                <div style={{ width: `${overview.recommendationFollowRate * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
              </div>
              <p className="text-muted text-sm mt-2">Percentage of recommendations accepted without modification by owners.</p>
            </div>
          </div>
        )}

        {activeTab === 'telemetry' && overview && (
          <div className="flex-col gap-6">
            <h2 className="text-xl flex-row"><Activity className="text-primary"/> MVP Instrumentation Data (Phase 8)</h2>
            
            <h3 className="text-lg mt-2 text-primary">1. Product Usage Mechanics</h3>
            <div className="grid-cols-3">
              <div className="stat-card">
                <span className="stat-label">Recommendation View Rate</span>
                <span className="stat-value">{overview.product.viewRate}%</span>
                <span className="stat-desc">Dashboard visits vs generation</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">System Follow Rate</span>
                <span className="stat-value">{overview.product.followRate}%</span>
                <span className="stat-desc">Direct compliance</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Feedback Loop Completion</span>
                <span className="stat-value">{overview.product.feedbackCompletionRate}%</span>
                <span className="stat-desc">EOD reviews received</span>
              </div>
            </div>

            <h3 className="text-lg mt-2 text-danger">2. Reliability Matrix</h3>
            <div className="grid-cols-3">
              <div className="stat-card">
                <span className="stat-label">API Success Rate</span>
                <span className="stat-value" style={{color: 'var(--success)'}}>{overview.reliability.successRate}%</span>
                <span className="stat-desc">Total 200/300 responses</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">API Error Rate</span>
                <span className="stat-value" style={{color: 'var(--danger)'}}>{overview.reliability.errorRate}%</span>
                <span className="stat-desc">Total 400/500 responses</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Avg Core Latency</span>
                <span className="stat-value">{overview.reliability.avgLatency}ms</span>
                <span className="stat-desc">Response time mapping</span>
              </div>
            </div>

            <h3 className="text-lg mt-2 " style={{color: 'var(--success)'}}>3. Core Business Proxies</h3>
            <div className="grid-cols-3">
              <div className="stat-card">
                <span className="stat-label">Platform Gross Margin</span>
                <span className="stat-value" style={{color: 'var(--success)'}}>${overview.business.grossMargin}</span>
                <span className="stat-desc">Total Profit Proxy Across DB</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Raw Waste Threshold</span>
                <span className="stat-value">{overview.business.wastePercent}%</span>
                <span className="stat-desc">Inventory conversion loss</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Stockout Occurrences</span>
                <span className="stat-value">{overview.business.stockoutRate}%</span>
                <span className="stat-desc">Days failing local demand</span>
              </div>
            </div>

            <h3 className="text-lg mt-2 text-muted">4. Source Data Integrity</h3>
            <div className="grid-cols-2">
              <div className="stat-card">
                <span className="stat-label">Data Fill Completeness</span>
                <span className="stat-value text-primary">{overview.dataQuality.completionRate}%</span>
                <span className="stat-desc">Expected EOD entries tracked</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Input Omission Defaults</span>
                <span className="stat-value">{overview.dataQuality.missingInputFrequency}</span>
                <span className="stat-desc">Events falling back to base templates</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div className="card table-container">
            <table>
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Location</th>
                  <th>Signals Active</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong><br/><span className="text-muted text-sm">{r.id}</span></td>
                    <td>{r.city} ({r.timezone})</td>
                    <td>
                      <div className="flex gap-2">
                        {r.weatherEnabled ? <span className="badge badge-active">Weather</span> : <span className="badge badge-inactive">Weather</span>}
                        {r.eventsEnabled ? <span className="badge badge-active">Event</span> : <span className="badge badge-inactive">Event</span>}
                      </div>
                    </td>
                    <td>{r.active ? <span className="badge badge-active">Live</span> : <span className="badge badge-inactive">Paused</span>}</td>
                    <td>
                      <button className="btn btn-outline text-sm" style={{padding: '0.25rem 0.75rem'}} onClick={() => { setActiveRestaurant(r); setShowConfigModal(true); }}>
                        <Settings size={14} /> Configure
                      </button>
                    </td>
                  </tr>
                ))}
                {restaurants.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No restaurants deployed</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card table-container">
            <table>
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Contact</th>
                  <th>Role Assignment</th>
                  <th>Restaurant Link</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.fullName}</strong></td>
                    <td>{u.email}</td>
                    <td><span className="badge" style={{background: 'var(--bg-surface-hover)'}}>{u.role}</span></td>
                    <td className="text-muted font-mono text-sm">{u.restaurantId || 'SYS_GLOBAL'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'menuInfo' && (
          <div className="card table-container">
            <table>
              <thead>
                <tr>
                  <th>Reference ID</th>
                  <th>Nomenclature</th>
                  <th>Unit</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Baseline Prep Qty</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map(m => (
                  <tr key={m.id}>
                    <td className="text-muted font-mono">{m.id.slice(-6)}</td>
                    <td><strong>{m.name}</strong></td>
                    <td><span className="badge" style={{background: 'var(--bg-surface-hover)'}}>{m.unit}</span></td>
                    <td className="text-muted">${m.cost?.toFixed(2)}</td>
                    <td className="text-success">${m.price?.toFixed(2)}</td>
                    <td>{m.baselinePrepQty}</td>
                    <td className="text-muted font-mono text-sm">{m.restaurantId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Config Modal */}
      {showConfigModal && activeRestaurant && (
        <div className="scrim">
          <div className="modal">
            <div className="modal-header">
              <h2>Signal Logic Routing</h2>
              <button className="btn" style={{background: 'transparent', padding: '0.5rem'}} onClick={() => setShowConfigModal(false)}>
                <X size={18} className="text-muted" />
              </button>
            </div>
            
            <form onSubmit={saveConfiguration}>
              <div className="form-group mb-6">
                <label>Operating Days CSV</label>
                <input className="input" type="text" value={activeRestaurant.operatingDays} onChange={(e) => setActiveRestaurant({...activeRestaurant, operatingDays: e.target.value})} />
                <span className="text-muted text-sm mt-1">Example: Mon,Tue,Wed,Thu,Fri,Sat,Sun</span>
              </div>

              <h3 className="text-lg mb-4">Signal Feeds</h3>
              
              <div className="switch-group">
                <div>
                  <div className="font-semibold text-main">Weather Feed Validation</div>
                  <div className="text-muted text-sm">Pull and apply weather multiplier formula</div>
                </div>
                <input type="checkbox" checked={activeRestaurant.weatherEnabled} onChange={(e) => setActiveRestaurant({...activeRestaurant, weatherEnabled: e.target.checked})} />
              </div>

              {activeRestaurant.weatherEnabled && (
                <div className="form-group pl-4 mb-4" style={{borderLeft: '2px solid var(--border)'}}>
                  <label>Weather Override Weight (Default 1.0)</label>
                  <input className="input" type="number" step="0.1" value={activeRestaurant.weatherWeight} onChange={(e) => setActiveRestaurant({...activeRestaurant, weatherWeight: parseFloat(e.target.value)})} />
                </div>
              )}

              <div className="switch-group">
                <div>
                  <div className="font-semibold text-main">Local Event Sync</div>
                  <div className="text-muted text-sm">Calculate intensity-based event volatility</div>
                </div>
                <input type="checkbox" checked={activeRestaurant.eventsEnabled} onChange={(e) => setActiveRestaurant({...activeRestaurant, eventsEnabled: e.target.checked})} />
              </div>

              {activeRestaurant.eventsEnabled && (
                <div className="form-group pl-4 mb-6" style={{borderLeft: '2px solid var(--border)'}}>
                  <label>Event Impact Weight (Default 1.0)</label>
                  <input className="input" type="number" step="0.1" value={activeRestaurant.eventWeight} onChange={(e) => setActiveRestaurant({...activeRestaurant, eventWeight: parseFloat(e.target.value)})} />
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button type="button" className="btn btn-outline" onClick={() => setShowConfigModal(false)}>Cancel Action</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <span><Settings size={16} /> Deploy Configuration</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
