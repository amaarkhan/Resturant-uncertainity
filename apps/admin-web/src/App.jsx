import { useState, useEffect } from "react";
import { 
  ShieldCheck, Users, Store, LayoutDashboard, Coffee, 
  Settings, LogOut, CheckCircle, AlertCircle, RefreshCw, X,
  Activity, Database
} from "lucide-react";

const rawApiBase = import.meta.env.VITE_API_BASE?.trim();
const API_BASE = rawApiBase ? `${rawApiBase.replace(/\/+$/, "")}/api/v1` : "/api/v1";
const PRODUCT_NAME = "PrepPulse";

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
  const [tabLoading, setTabLoading] = useState(false);

  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [telemetryData, setTelemetryData] = useState(null);

  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    city: "",
    timezone: "Asia/Karachi",
    operatingDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    weatherEnabled: true,
    eventsEnabled: true,
    weatherWeight: 1.0,
    eventWeight: 1.0
  });

  const [newOwner, setNewOwner] = useState({
    fullName: "",
    email: "",
    password: "",
    restaurantId: ""
  });

  const [newDish, setNewDish] = useState({
    restaurantId: "",
    name: "",
    unit: "plate",
    baselinePrepQty: 50,
    cost: 0,
    price: 0
  });

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
    setTabLoading(true);
    try {
      if (activeTab === "restaurants") {
        const d = await request("/admin/restaurants", { token: session.accessToken });
        setRestaurants(d.restaurants || []);
      } else if (activeTab === "menuInfo") {
        const [menuData, restaurantData] = await Promise.all([
          request("/admin/menu-items", { token: session.accessToken }),
          request("/admin/restaurants", { token: session.accessToken })
        ]);
        setMenuItems(menuData.menuItems || []);
        setRestaurants(restaurantData.restaurants || []);
      } else if (activeTab === "users") {
        const [userData, restaurantData] = await Promise.all([
          request("/admin/users", { token: session.accessToken }),
          request("/admin/restaurants", { token: session.accessToken })
        ]);
        setUsers(userData.users || []);
        setRestaurants(restaurantData.restaurants || []);
      } else if (activeTab === "dashboard") {
        setDashboardOverview(null);
        setDashboard(null);
        const [pmf, dash] = await Promise.all([
          request("/admin/metrics/overview", { token: session.accessToken }),
          request("/admin/dashboard", { token: session.accessToken })
        ]);
        setDashboardOverview(pmf);
        setDashboard(dash);
      } else if (activeTab === "telemetry") {
        setTelemetryData(null);
        const stats = await request("/admin/metrics/instrumentation", { token: session.accessToken });
        setTelemetryData(stats);
      }
    } catch (err) {
      showToast("Error loading data: " + err.message, true);
    } finally {
      setTabLoading(false);
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

  const createRestaurant = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await request("/admin/restaurants", {
        method: "POST",
        token: session.accessToken,
        body: {
          ...newRestaurant,
          weatherWeight: Number(newRestaurant.weatherWeight),
          eventWeight: Number(newRestaurant.eventWeight)
        }
      });

      setRestaurants((prev) => [created, ...prev]);
      setNewOwner((prev) => ({ ...prev, restaurantId: created.id }));
      setNewRestaurant({
        name: "",
        city: "",
        timezone: "Asia/Karachi",
        operatingDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
        weatherEnabled: true,
        eventsEnabled: true,
        weatherWeight: 1.0,
        eventWeight: 1.0
      });
      showToast("Restaurant created. You can now create its owner account.");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const createOwnerAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await request("/admin/users", {
        method: "POST",
        token: session.accessToken,
        body: {
          fullName: newOwner.fullName,
          email: newOwner.email,
          password: newOwner.password,
          role: "OWNER_MANAGER",
          restaurantId: newOwner.restaurantId
        }
      });

      setNewOwner({
        fullName: "",
        email: "",
        password: "",
        restaurantId: ""
      });

      const d = await request("/admin/users", { token: session.accessToken });
      setUsers(d.users || []);
      showToast("Owner account created successfully.");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const createDish = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await request("/admin/menu-items", {
        method: "POST",
        token: session.accessToken,
        body: {
          restaurantId: newDish.restaurantId,
          name: newDish.name,
          unit: newDish.unit,
          baselinePrepQty: Number(newDish.baselinePrepQty),
          cost: Number(newDish.cost),
          price: Number(newDish.price)
        }
      });

      setMenuItems((prev) => [created, ...prev]);
      setNewDish((prev) => ({
        ...prev,
        name: "",
        baselinePrepQty: 50,
        cost: 0,
        price: 0
      }));
      showToast("Dish added successfully.");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="flex-col items-center mb-8" style={{alignItems:'center'}}>
            <div className="login-icon-wrap">
              <ShieldCheck size={36} className="text-primary" />
            </div>
            <h1 className="text-2xl" style={{textAlign:'center'}}>{PRODUCT_NAME} Admin Portal</h1>
            <p className="text-muted text-sm" style={{textAlign:'center'}}>Secure command center access</p>
          </div>
          {error && (
            <div className="toast toast-error mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={login} className="form-group">
            <label>Email</label>
            <input className="input" type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="mt-4">Password</label>
            <input className="input" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="btn btn-primary mt-6 w-full" disabled={loading}>
              {loading ? <RefreshCw className="animate-spin" size={18} /> : "Sign In"}
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
          <ShieldCheck className="text-primary" size={24} /> {PRODUCT_NAME} Admin Core
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
          {/* Toast moved to fixed position */}
        </header>

        {(message || error) && (
          <div className="toast-fixed">
            <div className={`toast ${error ? 'toast-error' : 'toast-success'}`}>
              {error ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
              <span>{error || message}</span>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && tabLoading && !dashboardOverview && (
          <div className="loading-center">
            <RefreshCw className="animate-spin text-primary" size={28} />
            <span className="loading-text">Loading dashboard...</span>
          </div>
        )}

        {activeTab === 'dashboard' && dashboardOverview && dashboard && (
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
                <span className="stat-value">{dashboardOverview.wastePercent}%</span>
                <span className="stat-desc">From {dashboardOverview.outcomeCount} outcome entries</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Stockout Rate</span>
                <span className="stat-value">{dashboardOverview.stockoutRate}%</span>
                <span className="stat-desc">Days impacted by stockouts</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">System Trust Score</span>
                <span className="stat-value">{dashboardOverview.trustScore}</span>
                <span className="stat-desc">Out of 5.0 baseline</span>
              </div>
            </div>
            
            <div className="card mt-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg">Recommendation Follow Rate</h3>
                <span className="text-2xl text-primary font-bold">{(dashboardOverview.recommendationFollowRate * 100).toFixed(1)}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-surface-hover)', borderRadius: '4px' }}>
                <div style={{ width: `${dashboardOverview.recommendationFollowRate * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
              </div>
              <p className="text-muted text-sm mt-2">Percentage of recommendations accepted without modification by owners.</p>
            </div>
          </div>
        )}

        {activeTab === 'telemetry' && tabLoading && !telemetryData && (
          <div className="loading-center">
            <RefreshCw className="animate-spin text-primary" size={28} />
            <span className="loading-text">Loading telemetry...</span>
          </div>
        )}

        {activeTab === 'telemetry' && telemetryData && (
          <div className="flex-col gap-6">
            <h2 className="text-xl flex-row"><Activity className="text-primary"/> MVP Instrumentation Data (Phase 8)</h2>
            
            <h3 className="text-lg mt-2 text-primary">1. Product Usage Mechanics</h3>
            <div className="grid-cols-3">
              <div className="stat-card">
                <span className="stat-label">Recommendation View Rate</span>
                <span className="stat-value">{telemetryData.product.viewRate}%</span>
                <span className="stat-desc">Dashboard visits vs generation</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">System Follow Rate</span>
                <span className="stat-value">{telemetryData.product.followRate}%</span>
                <span className="stat-desc">Direct compliance</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Feedback Loop Completion</span>
                <span className="stat-value">{telemetryData.product.feedbackCompletionRate}%</span>
                <span className="stat-desc">EOD reviews received</span>
              </div>
            </div>

            <h3 className="text-lg mt-2 text-danger">2. Reliability Matrix</h3>
            <div className="grid-cols-3">
              <div className="stat-card">
                <span className="stat-label">API Success Rate</span>
                <span className="stat-value" style={{color: 'var(--success)'}}>{telemetryData.reliability.successRate}%</span>
                <span className="stat-desc">Total 200/300 responses</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">API Error Rate</span>
                <span className="stat-value" style={{color: 'var(--danger)'}}>{telemetryData.reliability.errorRate}%</span>
                <span className="stat-desc">Total 400/500 responses</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Avg Core Latency</span>
                <span className="stat-value">{telemetryData.reliability.avgLatency}ms</span>
                <span className="stat-desc">Response time mapping</span>
              </div>
            </div>

            <h3 className="text-lg mt-2 " style={{color: 'var(--success)'}}>3. Core Business Proxies</h3>
            <div className="grid-cols-3">
              <div className="stat-card">
                <span className="stat-label">Platform Gross Margin</span>
                <span className="stat-value" style={{color: 'var(--success)'}}>${telemetryData.business.grossMargin}</span>
                <span className="stat-desc">Total Profit Proxy Across DB</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Raw Waste Threshold</span>
                <span className="stat-value">{telemetryData.business.wastePercent}%</span>
                <span className="stat-desc">Inventory conversion loss</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Stockout Occurrences</span>
                <span className="stat-value">{telemetryData.business.stockoutRate}%</span>
                <span className="stat-desc">Days failing local demand</span>
              </div>
            </div>

            <h3 className="text-lg mt-2 text-muted">4. Source Data Integrity</h3>
            <div className="grid-cols-2">
              <div className="stat-card">
                <span className="stat-label">Data Fill Completeness</span>
                <span className="stat-value text-primary">{telemetryData.dataQuality.completionRate}%</span>
                <span className="stat-desc">Expected EOD entries tracked</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Input Omission Defaults</span>
                <span className="stat-value">{telemetryData.dataQuality.missingInputFrequency}</span>
                <span className="stat-desc">Events falling back to base templates</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div className="flex-col gap-6">
            <div className="card">
              <h2 className="text-xl mb-4">Onboard New Restaurant</h2>
              <form onSubmit={createRestaurant}>
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label>Restaurant Name</label>
                    <input
                      className="input"
                      type="text"
                      value={newRestaurant.name}
                      onChange={(e) => setNewRestaurant((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Karachi Central Kitchen"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>City</label>
                    <input
                      className="input"
                      type="text"
                      value={newRestaurant.city}
                      onChange={(e) => setNewRestaurant((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Karachi"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Timezone</label>
                    <input
                      className="input"
                      type="text"
                      value={newRestaurant.timezone}
                      onChange={(e) => setNewRestaurant((prev) => ({ ...prev, timezone: e.target.value }))}
                      placeholder="Asia/Karachi"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Operating Days CSV</label>
                    <input
                      className="input"
                      type="text"
                      value={newRestaurant.operatingDays}
                      onChange={(e) => setNewRestaurant((prev) => ({ ...prev, operatingDays: e.target.value }))}
                      placeholder="Mon,Tue,Wed,Thu,Fri,Sat,Sun"
                    />
                  </div>

                  <div className="form-group">
                    <label>Weather Weight</label>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      value={newRestaurant.weatherWeight}
                      onChange={(e) => setNewRestaurant((prev) => ({ ...prev, weatherWeight: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Event Weight</label>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      value={newRestaurant.eventWeight}
                      onChange={(e) => setNewRestaurant((prev) => ({ ...prev, eventWeight: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="switch-group">
                  <div>
                    <div className="font-semibold text-main">Enable Weather Signals</div>
                    <div className="text-muted text-sm">Apply weather-based recommendation adjustments</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newRestaurant.weatherEnabled}
                    onChange={(e) => setNewRestaurant((prev) => ({ ...prev, weatherEnabled: e.target.checked }))}
                  />
                </div>

                <div className="switch-group">
                  <div>
                    <div className="font-semibold text-main">Enable Event Signals</div>
                    <div className="text-muted text-sm">Apply event intensity and type effects</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newRestaurant.eventsEnabled}
                    onChange={(e) => setNewRestaurant((prev) => ({ ...prev, eventsEnabled: e.target.checked }))}
                  />
                </div>

                <div className="flex justify-between mt-6">
                  <span className="text-sm text-muted">Create restaurant first, then create owner account in Users tab.</span>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : "Create Restaurant"}
                  </button>
                </div>
              </form>
            </div>

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
          </div>
        )}

        {activeTab === 'users' && (
          <div className="flex-col gap-6">
            <div className="card">
              <h2 className="text-xl mb-4">Create Owner Account</h2>
              <form onSubmit={createOwnerAccount}>
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label>Owner Full Name</label>
                    <input
                      className="input"
                      type="text"
                      value={newOwner.fullName}
                      onChange={(e) => setNewOwner((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Fatima Khan"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      className="input"
                      type="email"
                      value={newOwner.email}
                      onChange={(e) => setNewOwner((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="owner@restaurant.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input
                      className="input"
                      type="password"
                      value={newOwner.password}
                      onChange={(e) => setNewOwner((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="At least 6 characters"
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Restaurant</label>
                    <select
                      className="select"
                      value={newOwner.restaurantId}
                      onChange={(e) => setNewOwner((prev) => ({ ...prev, restaurantId: e.target.value }))}
                      required
                    >
                      <option value="">Select a restaurant</option>
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name} ({restaurant.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <span className="text-sm text-muted">This creates an OWNER_MANAGER account scoped to one restaurant.</span>
                  <button type="submit" className="btn btn-primary" disabled={loading || restaurants.length === 0}>
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : "Create Owner"}
                  </button>
                </div>
              </form>
            </div>

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
          </div>
        )}

        {activeTab === 'menuInfo' && (
          <div className="flex-col gap-6">
            <div className="card">
              <h2 className="text-xl mb-4">Add Dish To Restaurant</h2>
              <form onSubmit={createDish}>
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label>Restaurant</label>
                    <select
                      className="select"
                      value={newDish.restaurantId}
                      onChange={(e) => setNewDish((prev) => ({ ...prev, restaurantId: e.target.value }))}
                      required
                    >
                      <option value="">Select a restaurant</option>
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name} ({restaurant.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Dish Name</label>
                    <input
                      className="input"
                      type="text"
                      value={newDish.name}
                      onChange={(e) => setNewDish((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Chicken Biryani"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Unit</label>
                    <input
                      className="input"
                      type="text"
                      value={newDish.unit}
                      onChange={(e) => setNewDish((prev) => ({ ...prev, unit: e.target.value }))}
                      placeholder="plate"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Baseline Prep Qty</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={newDish.baselinePrepQty}
                      onChange={(e) => setNewDish((prev) => ({ ...prev, baselinePrepQty: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Cost</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newDish.cost}
                      onChange={(e) => setNewDish((prev) => ({ ...prev, cost: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Price</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newDish.price}
                      onChange={(e) => setNewDish((prev) => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <span className="text-sm text-muted">Each dish is attached to exactly one restaurant using restaurantId.</span>
                  <button type="submit" className="btn btn-primary" disabled={loading || restaurants.length === 0}>
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : "Add Dish"}
                  </button>
                </div>
              </form>
            </div>

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
                    <th>Restaurant</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(m => {
                    const restaurant = restaurants.find((r) => r.id === m.restaurantId);
                    return (
                      <tr key={m.id}>
                        <td className="text-muted font-mono">{m.id.slice(-6)}</td>
                        <td><strong>{m.name}</strong></td>
                        <td><span className="badge" style={{background: 'var(--bg-surface-hover)'}}>{m.unit}</span></td>
                        <td className="text-muted">${m.cost?.toFixed(2)}</td>
                        <td className="text-success">${m.price?.toFixed(2)}</td>
                        <td>{m.baselinePrepQty}</td>
                        <td>
                          <strong>{restaurant?.name || "Unknown"}</strong>
                          <br />
                          <span className="text-muted font-mono text-sm">{m.restaurantId}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {menuItems.length === 0 && <tr><td colSpan="7" className="text-center text-muted">No dishes added yet</td></tr>}
                </tbody>
              </table>
            </div>
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
