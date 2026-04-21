import { useMemo, useState, useEffect } from "react";
import { Activity, Calendar, LogOut, CheckCircle, AlertCircle, TrendingUp, RefreshCw, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:4000") + "/api/v1";
const PRODUCT_NAME = "PrepPulse";

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
  const [email, setEmail] = useState("karachi@example.com");
  const [password, setPassword] = useState("owner123");
  const [session, setSession] = useState(null);
  
  const [activeTab, setActiveTab] = useState("daily");
  
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [autoMode, setAutoMode] = useState(true);
  const [weatherType, setWeatherType] = useState("pleasant");
  const [eventType, setEventType] = useState("none");
  const [eventIntensity, setEventIntensity] = useState(0);
  
  const [recommendation, setRecommendation] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  
  const [feedbackType, setFeedbackType] = useState("balanced");
  const [confidenceRating, setConfidenceRating] = useState(4);
  
  const [trends, setTrends] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canGenerate = useMemo(() => session?.restaurantId && date, [session, date]);

  useEffect(() => {
    if (session && activeTab === "history") {
      loadTrends();
    }
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
      setSession(data);
      showToast("Successfully logged in.");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrends() {
    try {
      const data = await request(`/recommendations/trends?restaurantId=${session.restaurantId}`, {
        token: session.accessToken
      });
      setTrends(data.trends);
    } catch (err) {
      showToast("Failed to load trends", true);
    }
  }

  async function generateRecommendation() {
    setLoading(true);
    try {
      const data = await request("/recommendations/generate", {
        method: "POST",
        token: session.accessToken,
        body: {
          restaurantId: session.restaurantId,
          date,
          manualContext: autoMode ? { sourceStatus: "auto" } : { weatherType, eventType, eventIntensity, sourceStatus: "live" }
        }
      });
      setRecommendation(data);
      setOutcomes(
        data.items.map((item) => ({
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          preparedQty: item.recommendedQty,
          soldQty: Math.max(item.recommendedQty - 5, 0),
          leftoverQty: 5,
          stockout: false,
          recommendationFollowed: true
        }))
      );
      showToast("Recommendation generated.");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  function updateOutcome(index, key, value) {
    setOutcomes((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [key]: value };
        if (key === "preparedQty" || key === "soldQty") {
          const prepared = Number(key === "preparedQty" ? value : next.preparedQty);
          const sold = Number(key === "soldQty" ? value : next.soldQty);
          next.leftoverQty = Math.max(prepared - sold, 0);
        }
        return next;
      })
    );
  }

  async function submitOutcomes() {
    setLoading(true);
    try {
      const entries = outcomes.map((o) => ({
        menuItemId: o.menuItemId,
        preparedQty: Number(o.preparedQty),
        soldQty: Number(o.soldQty),
        leftoverQty: Number(o.leftoverQty),
        stockout: o.stockout,
        recommendationFollowed: o.recommendationFollowed
      }));
      await request("/outcomes/daily", {
        method: "POST",
        token: session.accessToken,
        body: { restaurantId: session.restaurantId, date, entries }
      });
      showToast("Outcomes saved safely.");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback() {
    setLoading(true);
    try {
      await request("/feedback/quick", {
        method: "POST",
        token: session.accessToken,
        body: {
          restaurantId: session.restaurantId,
          date,
          feedbackType,
          confidenceRating: Number(confidenceRating),
          note: "Submitted via Phase 5 UX"
        }
      });
      showToast("Thank you for your feedback!");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <div className="login-container">
        <div className="card login-card">
          <div className="text-center mb-6">
            <div className="login-icon-wrap">
              <Activity className="text-primary" size={32} />
            </div>
            <h1 className="text-2xl mt-4">{PRODUCT_NAME} Kitchen Portal</h1>
            <p className="text-muted text-sm">Sign in to manage your daily prep</p>
          </div>
          {error && <div className="error-toast"><AlertCircle size={16} /> {error}</div>}
          <form onSubmit={login} className="flex-col gap-4">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required />
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            <button className="btn btn-primary mt-2" type="submit" disabled={loading}>
              {loading ? <RefreshCw className="animate-spin" size={18} /> : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1 className="text-2xl flex-row"><Activity className="text-primary" /> {PRODUCT_NAME} Kitchen Dashboard</h1>
          <p className="text-sm text-muted">Smart prep for small restaurants</p>
        </div>
        <button className="btn btn-outline text-sm" onClick={() => setSession(null)}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {(error || message) && (
        <div className="toast-fixed">
          <div className={`toast ${error ? 'toast-error' : 'toast-success'}`}>
            {error ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="font-medium">{error || message}</span>
          </div>
        </div>
      )}

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>
          <Calendar size={18} /> Daily Plan
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <BarChart2 size={18} /> 14-Day History
        </button>
      </div>

      {activeTab === 'daily' && (
        <>
          <div className="card">
            <h2 className="text-xl mb-4">1. Today's Context</h2>
            
            <div className="mb-4 flex items-center gap-2 bg-gray-50 p-3 rounded-lg" style={{background: 'var(--bg-core)', border: '1px solid var(--border)'}}>
              <input type="checkbox" id="autoMode" checked={autoMode} onChange={(e) => setAutoMode(e.target.checked)} />
              <label htmlFor="autoMode" className="font-semibold text-primary cursor-pointer text-sm mb-0">
                Auto-Detect Weather & Events (Recommended)
              </label>
            </div>

            {!autoMode && (
              <div className="grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Date</label>
                  <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-semibold">Weather Forecast</label>
                  <select className="select" value={weatherType} onChange={(e) => setWeatherType(e.target.value)}>
                    <option value="pleasant">Pleasant & Clear</option>
                    <option value="heatwave">Extreme Heat</option>
                    <option value="rain">Heavy Rain</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">Local Event</label>
                  <select className="select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                    <option value="none">Normal Day</option>
                    <option value="cricket">Cricket Match</option>
                    <option value="holiday">Public Holiday</option>
                    <option value="exam">University Exams</option>
                    <option value="local_event">Nearby Festival</option>
                  </select>
                </div>
                {eventType !== "none" && (
                  <div>
                    <label className="text-sm font-semibold">Event Intensity (0-10)</label>
                    <input className="input" type="number" min="0" max="10" value={eventIntensity} onChange={(e) => setEventIntensity(Number(e.target.value))} />
                  </div>
                )}
              </div>
            )}
            
            {autoMode && (
              <div className="grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Date to Predict</label>
                  <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button className="btn btn-primary" onClick={generateRecommendation} disabled={!canGenerate || loading}>
                {loading ? <RefreshCw className="animate-spin" size={18} /> : "Generate Suggestion"}
              </button>
            </div>
          </div>

          {recommendation && (
            <div className="card">
              <div className="header mb-4" style={{ paddingBottom: '1rem' }}>
                <h2 className="text-xl">2. Prep Suggestion</h2>
                <span className={`badge badge-${recommendation.confidenceLevel.toLowerCase()}`}>
                  {recommendation.confidenceLevel} Confidence
                </span>
              </div>
              <p className="text-sm text-muted mb-4">{recommendation.reasonSummary}</p>
              
              <div className="flex-col gap-2">
                {outcomes.map((item, idx) => (
                  <div key={item.menuItemId} className="rec-item">
                    <div className="font-semibold">{item.itemName}</div>
                    <div className="text-sm text-center">
                      <div className="text-muted">Suggested</div>
                      <div className="text-lg font-bold text-primary">{item.preparedQty}</div>
                    </div>
                    <div>
                      <label className="text-sm text-muted d-block text-center">Prepared Qty</label>
                      <input className="input text-center" style={{marginTop: '0.25rem'}} type="number" min="0" value={item.preparedQty} onChange={(e) => updateOutcome(idx, 'preparedQty', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-muted d-block text-center">Followed AI?</label>
                      <select className="select" style={{marginTop: '0.25rem'}} value={item.recommendationFollowed} onChange={(e) => updateOutcome(idx, 'recommendationFollowed', e.target.value === 'true')}>
                        <option value={true}>Yes</option>
                        <option value={false}>No</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button className="btn btn-primary" onClick={submitOutcomes} disabled={loading}><CheckCircle size={18} /> Confirm Plan</button>
              </div>
            </div>
          )}

          {outcomes.length > 0 && (
            <div className="card">
              <h2 className="text-xl mb-4">3. End of Day Results</h2>
              <div className="flex-col gap-2">
                {outcomes.map((item, idx) => (
                  <div key={item.menuItemId} className="rec-item">
                    <div className="font-semibold">{item.itemName}</div>
                    <div>
                      <label className="text-sm text-muted">Sold Qty</label>
                      <input className="input" type="number" min="0" value={item.soldQty} onChange={(e) => updateOutcome(idx, 'soldQty', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-muted">Leftovers</label>
                      <input className="input bg-gray-50" type="number" disabled value={item.leftoverQty} />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input type="checkbox" id={`so-${idx}`} checked={item.stockout} onChange={(e) => updateOutcome(idx, 'stockout', e.target.checked)} />
                      <label htmlFor={`so-${idx}`} className="text-sm text-danger cursor-pointer">Stocked Out</label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button className="btn btn-primary" onClick={submitOutcomes} disabled={loading}><CheckCircle size={18} /> Save Outcomes</button>
              </div>

              <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-lg mb-4">Daily Feedback</h3>
                <div className="grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold">How was today's demand vs forecast?</label>
                    <select className="select" value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
                      <option value="balanced">Just Right</option>
                      <option value="overprepared">Overprepared (Waste)</option>
                      <option value="underprepared">Underprepared (Stockout)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">System Rating (1-5)</label>
                    <select className="select" value={confidenceRating} onChange={(e) => setConfidenceRating(e.target.value)}>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Stars</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button className="btn btn-outline" onClick={submitFeedback} disabled={loading}>Send Feedback</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="header mb-4">
            <h2 className="text-xl flex-row"><TrendingUp className="text-primary" /> Waste & Stockout Trends</h2>
            <button className="btn btn-outline text-sm" onClick={loadTrends} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <p className="text-muted text-sm mb-6">Tracking your leftover food percentage and stockout occurrences over the last 14 days.</p>
          
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#7c839e'}} stroke="rgba(255,255,255,0.06)" />
                <YAxis yAxisId="left" orientation="left" stroke="rgba(255,255,255,0.06)" tick={{fill: '#818cf8'}} label={{ value: 'Waste %', angle: -90, position: 'insideLeft', fill: '#818cf8' }} />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.06)" tick={{fill: '#fb7185'}} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', background: '#1a1e30', color: '#e4e7f1' }} />
                <Legend wrapperStyle={{color: '#7c839e'}} />
                <Bar yAxisId="left" dataKey="wastePercent" name="Waste %" fill="#818cf8" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="stockoutCount" name="Stockout Count" fill="#fb7185" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
