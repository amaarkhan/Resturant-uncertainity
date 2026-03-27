import { useMemo, useState } from "react";

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
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("owner123");
  const [session, setSession] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weatherType, setWeatherType] = useState("pleasant");
  const [eventType, setEventType] = useState("none");
  const [eventIntensity, setEventIntensity] = useState(0);
  const [recommendation, setRecommendation] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  const [feedbackType, setFeedbackType] = useState("balanced");
  const [confidenceRating, setConfidenceRating] = useState(4);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canGenerate = useMemo(() => session?.restaurantId && date, [session, date]);

  async function login(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: { email, password }
      });
      setSession(data);
      setMessage("Logged in.");
      setRecommendation(null);
      setOutcomes([]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function generateRecommendation() {
    setError("");
    try {
      const data = await request("/recommendations/generate", {
        method: "POST",
        token: session.accessToken,
        body: {
          restaurantId: session.restaurantId,
          date,
          manualContext: {
            weatherType,
            eventType,
            eventIntensity,
            sourceStatus: "live"
          }
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
      setMessage("Recommendation generated.");
    } catch (err) {
      setError(err.message);
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
    setError("");
    try {
      await request("/outcomes/daily", {
        method: "POST",
        token: session.accessToken,
        body: {
          restaurantId: session.restaurantId,
          date,
          entries: outcomes.map((row) => ({
            menuItemId: row.menuItemId,
            preparedQty: Number(row.preparedQty),
            soldQty: Number(row.soldQty),
            leftoverQty: Number(row.leftoverQty),
            stockout: Boolean(row.stockout),
            recommendationFollowed: Boolean(row.recommendationFollowed)
          }))
        }
      });
      setMessage("Outcomes saved.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitFeedback() {
    setError("");
    if (!session?.restaurantId) return;
    try {
      await request("/feedback/quick", {
        method: "POST",
        token: session.accessToken,
        body: {
          restaurantId: session.restaurantId,
          date,
          feedbackType,
          confidenceRating: Number(confidenceRating)
        }
      });
      setMessage("Feedback saved.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Customer App</h1>
        <p>Daily prep recommendation for restaurant owners and kitchen managers.</p>
      </section>

      {!session ? (
        <section className="card">
          <h2>Login</h2>
          <form onSubmit={login} className="grid">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
            <button type="submit">Login</button>
          </form>
          <p>Use owner@example.com / owner123</p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2>Generate Recommendation</h2>
            <div className="grid">
              <label>
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label>
                Weather
                <select value={weatherType} onChange={(e) => setWeatherType(e.target.value)}>
                  <option value="pleasant">Pleasant</option>
                  <option value="rain">Rain</option>
                  <option value="heatwave">Heatwave</option>
                </select>
              </label>
              <label>
                Event
                <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                  <option value="none">None</option>
                  <option value="cricket">Cricket Match</option>
                  <option value="holiday">Holiday</option>
                  <option value="exam">Exam Period</option>
                  <option value="local_event">Local Event</option>
                </select>
              </label>
              <label>
                Event Intensity (0-1)
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={eventIntensity}
                  onChange={(e) => setEventIntensity(Number(e.target.value))}
                />
              </label>
            </div>
            <button disabled={!canGenerate} onClick={generateRecommendation}>Generate</button>
          </section>

          {recommendation && (
            <section className="card">
              <h2>Recommendation</h2>
              <p><strong>Confidence:</strong> {recommendation.confidenceLevel}</p>
              <p>{recommendation.reasonSummary}</p>
              {recommendation.usedFallback && <p className="warn">Using fallback signal data. Treat output as low confidence.</p>}
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Baseline</th>
                    <th>Recommended</th>
                    <th>Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendation.items.map((item) => (
                    <tr key={item.menuItemId}>
                      <td>{item.itemName}</td>
                      <td>{item.baselineQty}</td>
                      <td>{item.recommendedQty}</td>
                      <td>{item.adjustmentFactor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {outcomes.length > 0 && (
            <section className="card">
              <h2>Daily Outcomes</h2>
              <p>Enter actual prepared and sold quantities for metrics and PMF analysis.</p>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Prepared</th>
                    <th>Sold</th>
                    <th>Leftover</th>
                    <th>Stockout</th>
                    <th>Followed</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.map((row, idx) => (
                    <tr key={row.menuItemId}>
                      <td>{row.itemName}</td>
                      <td>
                        <input type="number" value={row.preparedQty} onChange={(e) => updateOutcome(idx, "preparedQty", Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" value={row.soldQty} onChange={(e) => updateOutcome(idx, "soldQty", Number(e.target.value))} />
                      </td>
                      <td>{row.leftoverQty}</td>
                      <td>
                        <input type="checkbox" checked={row.stockout} onChange={(e) => updateOutcome(idx, "stockout", e.target.checked)} />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.recommendationFollowed}
                          onChange={(e) => updateOutcome(idx, "recommendationFollowed", e.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={submitOutcomes}>Save Outcomes</button>
            </section>
          )}

          <section className="card">
            <h2>Quick Feedback</h2>
            <div className="grid">
              <label>
                Feedback
                <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
                  <option value="balanced">Balanced</option>
                  <option value="ran_out_early">Ran Out Early</option>
                  <option value="too_much_left">Too Much Left</option>
                </select>
              </label>
              <label>
                Confidence (1-5)
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={confidenceRating}
                  onChange={(e) => setConfidenceRating(e.target.value)}
                />
              </label>
            </div>
            <button onClick={submitFeedback}>Submit Feedback</button>
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
