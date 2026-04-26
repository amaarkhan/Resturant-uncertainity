import { useState, useEffect } from "react";
import { ChefHat, Utensils, Star, CloudSun, AlertCircle, CheckCircle, RefreshCw, Sparkles, MapPin } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:4000") + "/api/v1";
const PRODUCT_NAME = "PrepPulse";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

export function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const showToast = (msg, isErr = false) => {
    if (isErr) setError(msg);
    else setMessage(msg);
    setTimeout(() => { setError(""); setMessage(""); }, 5000);
  };

  // Load active restaurants on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await request("/customer/restaurants");
        setRestaurants(data.restaurants || []);
      } catch (err) {
        showToast("Could not load restaurants. Is the API running?", true);
      } finally {
        setLoadingRestaurants(false);
      }
    })();
  }, []);

  // Clear recommendation when restaurant changes
  useEffect(() => {
    setRecommendation(null);
  }, [selectedId]);

  async function fetchRecommendations() {
    if (!selectedId) return;
    setLoading(true);
    setRecommendation(null);
    try {
      const data = await request("/customer/recommendations", {
        method: "POST",
        body: { restaurantId: selectedId }
      });
      setRecommendation(data);
      showToast("Recommendations loaded!");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  const selectedRestaurant = restaurants.find((r) => r.id === selectedId);

  return (
    <div className="container">
      {/* ── Toast ── */}
      {(error || message) && (
        <div className="toast-fixed">
          <div className={`toast ${error ? "toast-error" : "toast-success"}`}>
            {error ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="font-medium">{error || message}</span>
          </div>
        </div>
      )}

      {/* ── Hero Header ── */}
      <div className="hero-section">
        <div className="hero-icon-wrap">
          <Utensils className="text-primary" size={36} />
        </div>
        <h1 className="text-2xl mt-4">{PRODUCT_NAME}</h1>
        <p className="text-muted text-sm">Discover today's best dishes — powered by AI & real-time signals</p>
      </div>

      {/* ── Restaurant Selector ── */}
      <div className="card selector-card">
        <h2 className="text-xl mb-4">
          <MapPin size={20} className="text-primary" style={{ display: "inline", verticalAlign: "middle", marginRight: "0.5rem" }} />
          Choose a Restaurant
        </h2>

        {loadingRestaurants ? (
          <div className="loading-center" style={{ padding: "2rem 0" }}>
            <RefreshCw className="animate-spin text-primary" size={24} />
            <span className="loading-text">Loading restaurants...</span>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={28} className="text-muted" />
            <p className="text-muted">No restaurants available right now.</p>
          </div>
        ) : (
          <>
            <select
              id="restaurant-select"
              className="select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select a restaurant...</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.city}
                </option>
              ))}
            </select>

            <div className="mt-6 flex justify-end">
              <button
                id="get-recommendations-btn"
                className="btn btn-primary"
                onClick={fetchRecommendations}
                disabled={!selectedId || loading}
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <>
                    <Sparkles size={18} /> Get Today's Recommendations
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="card">
          <div className="loading-center">
            <RefreshCw className="animate-spin text-primary" size={32} />
            <span className="loading-text">Analyzing weather, events & menu data...</span>
          </div>
        </div>
      )}

      {/* ── Recommendation Results ── */}
      {recommendation && !loading && (
        <>
          {/* Summary Card */}
          <div className="card recommendation-hero">
            <div className="header mb-4" style={{ paddingBottom: "1rem" }}>
              <div>
                <h2 className="text-xl" id="recommendation-heading">
                  <ChefHat size={22} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.5rem" }} />
                  Today's Best Items to Order
                </h2>
                <p className="text-sm text-muted mt-2">
                  {recommendation.restaurant.name} — {recommendation.restaurant.city}
                </p>
              </div>
              <span className={`badge badge-${recommendation.confidence.toLowerCase()}`}>
                {recommendation.confidence} Confidence
              </span>
            </div>

            {/* AI Summary */}
            <div className="ai-summary">
              <div className="ai-summary-header">
                <Sparkles size={16} className="text-primary" />
                <span className="font-semibold text-sm">AI Insight</span>
                {!recommendation.groqAvailable && (
                  <span className="badge" style={{ background: "var(--warning-bg)", color: "var(--warning)", marginLeft: "0.5rem", fontSize: "0.65rem" }}>
                    Rule Engine
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ lineHeight: "1.7", marginTop: "0.5rem" }}>
                {recommendation.summary}
              </p>
            </div>

            {/* Weather Context */}
            <div className="context-strip mt-4">
              <CloudSun size={16} />
              <span className="text-sm">
                Weather: <strong style={{ textTransform: "capitalize" }}>{recommendation.weather.type}</strong>
              </span>
              <span className="text-sm text-muted">•</span>
              <span className="text-sm text-muted">
                {recommendation.date}
              </span>
            </div>
          </div>

          {/* Dish Cards */}
          <div className="card">
            <h2 className="text-xl mb-4">
              <Star size={20} className="text-primary" style={{ display: "inline", verticalAlign: "middle", marginRight: "0.5rem" }} />
              Recommended Dishes ({recommendation.items.length})
            </h2>

            <div className="flex-col gap-2">
              {recommendation.items.map((item, idx) => (
                <div key={idx} className="rec-item customer-dish-item" id={`dish-item-${idx}`}>
                  <div className="dish-name-col">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-muted dish-reason">{item.reason}</div>
                  </div>
                  <div className="dish-qty-col">
                    <div className="text-muted text-sm">Recommended</div>
                    <div className="text-lg font-bold text-primary">{item.recommendedQty}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="footer-note">
        <p className="text-sm text-muted text-center">
          Recommendations update daily based on weather, events & historical demand.
        </p>
      </div>
    </div>
  );
}
