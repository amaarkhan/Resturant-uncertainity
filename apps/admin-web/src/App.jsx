import { useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:4000") + "/api/v1";

async function request(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

export function App() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [session, setSession] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [pmfReport, setPmfReport] = useState(null);
  const [restaurantForm, setRestaurantForm] = useState({ name: "", city: "", timezone: "Asia/Karachi" });
  const [menuForm, setMenuForm] = useState({ restaurantId: "", name: "", unit: "plate", baselinePrepQty: 10 });
  const [userForm, setUserForm] = useState({ fullName: "", email: "", password: "", role: "OWNER_MANAGER", restaurantId: "" });
  const [pmfForm, setPmfForm] = useState({
    restaurantId: "",
    baselineFrom: "2026-03-01",
    baselineTo: "2026-03-10",
    pilotFrom: "2026-03-11",
    pilotTo: "2026-03-27",
    week4Usage: 42,
    willingnessToPay: 25
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function login(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: { email, password }
      });
      setSession(data);
      setMessage("Logged in as admin.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadRestaurants() {
    try {
      const data = await request("/admin/restaurants", { token: session.accessToken });
      setRestaurants(data.restaurants || []);
      if (data.restaurants?.length) {
        setPmfForm((prev) => ({ ...prev, restaurantId: prev.restaurantId || data.restaurants[0].id }));
        setMenuForm((prev) => ({ ...prev, restaurantId: prev.restaurantId || data.restaurants[0].id }));
        setUserForm((prev) => ({ ...prev, restaurantId: prev.restaurantId || data.restaurants[0].id }));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadMenuItems() {
    try {
      const data = await request("/admin/menu-items", { token: session.accessToken });
      setMenuItems(data.menuItems || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadMetrics() {
    try {
      const data = await request("/admin/metrics/overview", { token: session.accessToken });
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadUsers() {
    try {
      const data = await request("/admin/users", { token: session.accessToken });
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function createRestaurant(e) {
    e.preventDefault();
    setError("");
    try {
      await request("/admin/restaurants", {
        method: "POST",
        token: session.accessToken,
        body: restaurantForm
      });
      setRestaurantForm({ name: "", city: "", timezone: "Asia/Karachi" });
      setMessage("Restaurant created.");
      await loadRestaurants();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createMenuItem(e) {
    e.preventDefault();
    setError("");
    try {
      await request("/admin/menu-items", {
        method: "POST",
        token: session.accessToken,
        body: {
          ...menuForm,
          baselinePrepQty: Number(menuForm.baselinePrepQty)
        }
      });
      setMenuForm((prev) => ({ ...prev, name: "", baselinePrepQty: 10 }));
      setMessage("Menu item created.");
      await loadMenuItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createUser(e) {
    e.preventDefault();
    setError("");
    try {
      await request("/admin/users", {
        method: "POST",
        token: session.accessToken,
        body: userForm
      });
      setUserForm((prev) => ({ ...prev, fullName: "", email: "", password: "" }));
      setMessage("User created.");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function runPmfReport(e) {
    e.preventDefault();
    setError("");
    try {
      const query = new URLSearchParams({
        baselineFrom: pmfForm.baselineFrom,
        baselineTo: pmfForm.baselineTo,
        pilotFrom: pmfForm.pilotFrom,
        pilotTo: pmfForm.pilotTo,
        week4Usage: String(pmfForm.week4Usage),
        willingnessToPay: String(pmfForm.willingnessToPay),
        ...(pmfForm.restaurantId ? { restaurantId: pmfForm.restaurantId } : {})
      });

      const data = await request(`/admin/metrics/pmf-report?${query.toString()}`, {
        token: session.accessToken
      });
      setPmfReport(data);
      setMessage("PMF report generated.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Admin Panel</h1>
        <p>Manage restaurants, menu items, and monitor MVP metrics.</p>
      </section>

      {!session ? (
        <section className="card">
          <h2>Login</h2>
          <form onSubmit={login} className="grid">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
            <button type="submit">Login</button>
          </form>
          <p>Use admin@example.com / admin123</p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2>Actions</h2>
            <div className="actions">
              <button onClick={loadRestaurants}>Load Restaurants</button>
              <button onClick={loadMenuItems}>Load Menu Items</button>
              <button onClick={loadMetrics}>Load Metrics</button>
              <button onClick={loadUsers}>Load Users</button>
            </div>
          </section>

          <section className="card">
            <h2>Create Restaurant</h2>
            <form onSubmit={createRestaurant} className="grid">
              <input placeholder="Name" value={restaurantForm.name} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, name: e.target.value }))} />
              <input placeholder="City" value={restaurantForm.city} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, city: e.target.value }))} />
              <input placeholder="Timezone" value={restaurantForm.timezone} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, timezone: e.target.value }))} />
              <button type="submit">Create Restaurant</button>
            </form>
          </section>

          <section className="card">
            <h2>Create Menu Item</h2>
            <form onSubmit={createMenuItem} className="grid">
              <select value={menuForm.restaurantId} onChange={(e) => setMenuForm((prev) => ({ ...prev, restaurantId: e.target.value }))}>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <input placeholder="Item Name" value={menuForm.name} onChange={(e) => setMenuForm((prev) => ({ ...prev, name: e.target.value }))} />
              <input placeholder="Unit" value={menuForm.unit} onChange={(e) => setMenuForm((prev) => ({ ...prev, unit: e.target.value }))} />
              <input
                type="number"
                placeholder="Baseline"
                value={menuForm.baselinePrepQty}
                onChange={(e) => setMenuForm((prev) => ({ ...prev, baselinePrepQty: Number(e.target.value) }))}
              />
              <button type="submit">Create Menu Item</button>
            </form>
          </section>

          <section className="card">
            <h2>Create User</h2>
            <form onSubmit={createUser} className="grid">
              <input placeholder="Full Name" value={userForm.fullName} onChange={(e) => setUserForm((prev) => ({ ...prev, fullName: e.target.value }))} />
              <input placeholder="Email" value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} />
              <input placeholder="Password" type="password" value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} />
              <select value={userForm.role} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="OWNER_MANAGER">Owner/Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select value={userForm.restaurantId} onChange={(e) => setUserForm((prev) => ({ ...prev, restaurantId: e.target.value }))}>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button type="submit">Create User</button>
            </form>
          </section>

          <section className="card">
            <h2>Restaurants</h2>
            <ul>
              {restaurants.map((r) => (
                <li key={r.id}>{r.name} - {r.city}</li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>Menu Items</h2>
            <ul>
              {menuItems.map((m) => (
                <li key={m.id}>{m.name} ({m.unit}) baseline: {m.baselinePrepQty}</li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>Metrics Overview</h2>
            {metrics ? (
              <div className="grid">
                <p>Active Restaurants: {metrics.activeRestaurants}</p>
                <p>Daily Active Users: {metrics.dailyActiveUsers}</p>
                <p>Recommendation Follow Rate: {Number(metrics.recommendationFollowRate || 0).toFixed(2)}</p>
                <p>Feedback Count: {metrics.feedbackCount}</p>
                <p>Outcome Count: {metrics.outcomeCount}</p>
                <p>Waste %: {metrics.wastePercent}</p>
                <p>Stockout %: {metrics.stockoutRate}</p>
                <p>Trust Score: {metrics.trustScore}</p>
              </div>
            ) : (
              <p>No metrics loaded yet.</p>
            )}
          </section>

          <section className="card">
            <h2>PMF Report</h2>
            <form onSubmit={runPmfReport} className="grid">
              <label>
                Restaurant
                <select value={pmfForm.restaurantId} onChange={(e) => setPmfForm((prev) => ({ ...prev, restaurantId: e.target.value }))}>
                  <option value="">All Restaurants</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Baseline From
                <input type="date" value={pmfForm.baselineFrom} onChange={(e) => setPmfForm((prev) => ({ ...prev, baselineFrom: e.target.value }))} />
              </label>
              <label>
                Baseline To
                <input type="date" value={pmfForm.baselineTo} onChange={(e) => setPmfForm((prev) => ({ ...prev, baselineTo: e.target.value }))} />
              </label>
              <label>
                Pilot From
                <input type="date" value={pmfForm.pilotFrom} onChange={(e) => setPmfForm((prev) => ({ ...prev, pilotFrom: e.target.value }))} />
              </label>
              <label>
                Pilot To
                <input type="date" value={pmfForm.pilotTo} onChange={(e) => setPmfForm((prev) => ({ ...prev, pilotTo: e.target.value }))} />
              </label>
              <label>
                Week 4 Usage %
                <input
                  type="number"
                  value={pmfForm.week4Usage}
                  onChange={(e) => setPmfForm((prev) => ({ ...prev, week4Usage: Number(e.target.value) }))}
                />
              </label>
              <label>
                Willingness To Pay %
                <input
                  type="number"
                  value={pmfForm.willingnessToPay}
                  onChange={(e) => setPmfForm((prev) => ({ ...prev, willingnessToPay: Number(e.target.value) }))}
                />
              </label>
              <button type="submit">Run PMF Report</button>
            </form>

            {pmfReport && (
              <div className="pmf-report">
                <p>
                  Decision: <span className="pill">{pmfReport.decision.decision}</span>
                </p>
                <p>Passed Thresholds: {pmfReport.decision.passedCount}</p>
                <p>Waste Reduction: {pmfReport.deltas.wasteReduction}%</p>
                <p>Stockout Reduction: {pmfReport.deltas.stockoutReduction}%</p>
                <p>Trust Lift: {pmfReport.deltas.trustLift}%</p>
                <h3>Threshold Checks</h3>
                <ul>
                  {Object.entries(pmfReport.decision.checks).map(([key, pass]) => (
                    <li key={key}>
                      {key}: {pass ? "Pass" : "Fail"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Users</h2>
            <ul>
              {users.map((u) => (
                <li key={u.id}>{u.fullName} - {u.email} ({u.role})</li>
              ))}
            </ul>
          </section>

          <section className="card">
            <button onClick={() => setSession(null)}>Logout</button>
          </section>
        </>
      )}

      {message && <p className="msg">{message}</p>}
      {error && <p className="err">{error}</p>}
    </main>
  );
}
