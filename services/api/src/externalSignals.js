// External Signals Integration (OpenMeteo + Mock Calendar)

const STATIC_EVENTS = {
  // Mapping date (YYYY-MM-DD) -> type and intensity (0-10)
  "2023-11-20": { type: "cricket", intensity: 8 },
  "2023-12-25": { type: "holiday", intensity: 10 },
  "2024-05-15": { type: "exam", intensity: 9 },
  "2024-06-05": { type: "local_event", intensity: 6 },
  // Adding dynamic dates around current active runtime to ensure testing shows hits
};

function getMockEvent(dateString) {
  // Check exact static match
  if (STATIC_EVENTS[dateString]) return STATIC_EVENTS[dateString];

  // Mocking repeating logic: Let's assume Fridays happen to have a nearby student gathering (event)
  // Or just mock one dynamic event next week to support live demos
  const d = new Date(dateString);
  const day = d.getDay();
  if (day === 5) { // Fridays
    return { type: "cricket", intensity: 7 }; 
  }
  if (d.getDate() >= 1 && d.getDate() <= 3 && d.getMonth() === 4) { // May 1-3
    return { type: "exam", intensity: 9 };
  }

  return { type: "none", intensity: 0 };
}

// Convert WMO weather codes to our simplified internal `weatherType`
// 0: Clear, 1-3: Partly Cloudy, 45-48: Fog, 51-67: Rain/Drizzle, 71-77: Snow, 80-82: Showers, 95-99: Thunderstorm
function mapWMOtoInternalType(code) {
  if (code === 0 || code === 1 || code === 2) return "pleasant";
  if (code >= 51 && code <= 99) return "rain";
  // For heatwave, OpenMeteo uses temperature metrics, we'll arbitrarily map Fog/weird weather to heatwave for testing or just use temperature instead if we add it. 
  // Let's stick strictly to WMO mapping for now.
  return "pleasant";
}

export async function fetchContextSignals(cityString, targetDateString) {
  // A real app would geocode the city to lat/lon. 
  // For MVP, we use hardcoded coordinates for common cities
  const COORDS = {
    "karachi": { lat: 24.8607, lon: 67.0011 },
    "lahore": { lat: 31.5204, lon: 74.3587 },
    "islamabad": { lat: 33.6844, lon: 73.0479 }
  };
  
  const cityKey = (cityString || "karachi").toLowerCase();
  const coords = COORDS[cityKey] || COORDS["karachi"];
  
  const eventData = getMockEvent(targetDateString);

  try {
    // OpenMeteo allows historical and forecast via same endpoint if using `daily` with start/end date
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weather_code&start_date=${targetDateString}&end_date=${targetDateString}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather API Error");
    
    const data = await res.json();
    const wmoCode = data.daily?.weather_code?.[0] ?? 0;
    
    return {
      weatherType: mapWMOtoInternalType(wmoCode),
      eventType: eventData.type,
      eventIntensity: eventData.intensity,
      sourceStatus: "live"
    };
  } catch(err) {
    console.warn("External Signals Fallback Triggered:", err.message);
    // Fallback if API fails
    return {
      weatherType: "pleasant",
      eventType: eventData.type,
      eventIntensity: eventData.intensity,
      sourceStatus: "fallback"
    };
  }
}
