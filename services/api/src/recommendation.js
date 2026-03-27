function weatherMultiplier(weatherType) {
  if (!weatherType) return 1;
  if (weatherType === "rain") return 0.8;
  if (weatherType === "heatwave") return 0.9;
  if (weatherType === "pleasant") return 1.05;
  return 1;
}

function eventMultiplier(eventType, eventIntensity = 0) {
  if (!eventType || eventType === "none") return 1;
  if (eventType === "cricket") return 1 + 0.15 * eventIntensity;
  if (eventType === "holiday") return 1 + 0.2 * eventIntensity;
  if (eventType === "exam") return 1 - 0.15 * eventIntensity;
  if (eventType === "local_event") return 1 + 0.1 * eventIntensity;
  return 1;
}

function confidenceFromContext({ weatherType, eventType, usedFallback }) {
  if (usedFallback) return "Low";
  if (!weatherType && (!eventType || eventType === "none")) return "Medium";
  return "High";
}

export function generateRecommendation(menuItems, context) {
  const w = weatherMultiplier(context.weatherType);
  const e = eventMultiplier(context.eventType, Number(context.eventIntensity || 0));
  const factor = Number((w * e).toFixed(2));

  const items = menuItems.map((item) => {
    const recommendedQty = Math.max(1, Math.round(item.baselinePrepQty * factor));
    return {
      menuItemId: item.id,
      itemName: item.name,
      baselineQty: item.baselinePrepQty,
      recommendedQty,
      adjustmentFactor: factor,
      reason: `Adjusted by weather (${context.weatherType || "unknown"}) and event (${context.eventType || "none"}).`
    };
  });

  const usedFallback = context.sourceStatus === "fallback";
  const confidenceLevel = confidenceFromContext({
    weatherType: context.weatherType,
    eventType: context.eventType,
    usedFallback
  });

  return {
    items,
    confidenceLevel,
    usedFallback,
    reasonSummary: "Prep quantities adjusted from baseline using context signals."
  };
}
