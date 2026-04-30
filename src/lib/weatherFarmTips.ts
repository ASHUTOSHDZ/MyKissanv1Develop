export type ForecastDay = {
  day: string;
  date: string;
  temp: number;
  text: string;
  humidity: string;
  wind: string;
  rainChance: string;
  tips: string[];
};

/** Farm / crop oriented guidance (shared with farmer dashboard). */
export const buildFarmTips = (
  tempC: number,
  rainChance: number,
  humidity: number,
  windKph: number,
  conditionText: string,
): string[] => {
  const tips: string[] = [];

  if (tempC <= 16) {
    tips.push("Temperature is very low. Avoid early morning spraying and protect young plants from cold stress.");
    tips.push("Best work window: late morning to early afternoon when field surface warms up.");
  } else if (tempC <= 18) {
    tips.push("Cool conditions are good for manual work, but start after sunrise to reduce dew-related disease spread.");
    tips.push("Use light irrigation only after checking topsoil moisture; overwatering can chill roots.");
  } else if (tempC <= 20) {
    tips.push("Mild weather supports transplanting and weeding. Keep workers active through morning hours.");
    tips.push("Spray only if leaves are dry; prefer mid-morning for better absorption.");
  } else if (tempC <= 22) {
    tips.push("Comfortable temperature for most field operations and harvesting tasks.");
    tips.push("Run irrigation in short cycles, preferably evening, to minimize daytime evaporation.");
  } else if (tempC <= 24) {
    tips.push("Good workability day. Schedule labor-heavy tasks before noon for stable output.");
    tips.push("Water spray on leaves can be done after 4 PM for better retention.");
  } else if (tempC <= 26) {
    tips.push("Warm but manageable. Keep rest breaks every 90-120 minutes for workers.");
    tips.push("Use morning irrigation; avoid midday water spray to prevent rapid loss.");
  } else if (tempC <= 28) {
    tips.push("Field work is suitable in morning and late evening; reduce afternoon load.");
    tips.push("Moisture loss rises now, so check root-zone moisture before deciding water spray.");
  } else if (tempC <= 30) {
    tips.push("Heat starts affecting labor efficiency. Shift major work to 6-11 AM and 4:30-7 PM.");
    tips.push("Prefer drip/furrow irrigation in early morning; avoid leaf spray under strong sun.");
  } else if (tempC <= 32) {
    tips.push("Hot conditions: keep shade, hydration, and shorter work shifts for safety.");
    tips.push("Water spray is useful only near sunset; midday spray may stress leaves.");
  } else if (tempC <= 34) {
    tips.push("Very warm day. Avoid heavy manual work from 12-4 PM to reduce heat risk.");
    tips.push("Prioritize deep irrigation in early morning and mulch exposed soil where possible.");
  } else if (tempC <= 36) {
    tips.push("High heat warning: limit operations to morning/evening and avoid unnecessary movement in peak hours.");
    tips.push("Use protective clothing and postpone non-urgent pesticide sprays.");
  } else if (tempC <= 38) {
    tips.push("Extreme heat. Perform only critical work at sunrise or after sunset.");
    tips.push("Do not schedule water spray in daytime; use controlled irrigation after evening cooldown.");
  } else {
    tips.push("Severe heat stress day. Postpone most field work and focus on crop protection checks only.");
    tips.push("Irrigate in split doses during early dawn and late evening to reduce plant shock.");
  }

  if (rainChance >= 60) {
    tips.push("Rain probability is high. Keep drainage channels open and postpone fertilizer or pesticide spraying.");
  } else if (rainChance >= 35) {
    tips.push("Moderate rain chance. Keep backup plan for covered storage and finish sensitive work by afternoon.");
  } else {
    tips.push("Low rain chance. Good day for planned operations; continue normal irrigation monitoring.");
  }

  if (humidity >= 80) {
    tips.push("High humidity can trigger fungal issues. Scout lower leaves and avoid dense canopy wetting.");
  } else if (windKph >= 22) {
    tips.push("Wind is strong. Delay spraying because drift risk is high and efficiency drops.");
  } else if (conditionText.toLowerCase().includes("cloud")) {
    tips.push("Cloudy periods reduce evaporation; a light evening irrigation cycle is usually enough.");
  } else {
    tips.push("Stable weather supports routine farm work with standard safety precautions.");
  }

  return tips.slice(0, 5);
};

/**
 * Outdoor labor / commute-to-field guidance for workers (hydration, rain, heat).
 * Builds on {@link buildFarmTips} then adds practical carry items.
 */
export const buildWorkerOutdoorLaborTips = (
  tempC: number,
  rainChance: number,
  humidity: number,
  windKph: number,
  conditionText: string,
): string[] => {
  const tips = [...buildFarmTips(tempC, rainChance, humidity, windKph, conditionText)];

  tips.push(
    "Carry a refillable water bottle (about 1–2 L) and sip on the way—dehydration sneaks up during walking or cycling to the plot.",
  );

  if (tempC >= 28) {
    tips.push(
      "Heat: wear light cotton, use cap or cloth for sun, and prefer travel before 9 AM or after 4:30 PM when possible.",
    );
  }

  if (rainChance >= 40 || /rain|shower|drizzle|thunder|storm/i.test(conditionText)) {
    tips.push(
      "Rain: pack phone and ID in a small plastic pouch; choose non-slip footwear; a foldable umbrella or thin raincoat helps in open fields.",
    );
  } else if (rainChance <= 12 && tempC >= 20 && tempC <= 34) {
    tips.push("Outlook is mostly dry for travel—still keep water and a light dry snack for long shifts.");
  }

  if (humidity >= 75 && tempC >= 26) {
    tips.push("Humid heat: sweat does not evaporate fast—take short shade breaks even if the sky looks clear.");
  }

  if (windKph >= 25) {
    tips.push("Windy: tie down loose dupatta/hat; shield eyes from dust with plain glasses if available.");
  }

  return [...new Set(tips)].slice(0, 7);
};

export const parsePercent = (value: string): number => {
  const n = parseInt(String(value).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

export const parseHumidityPercent = (value: string): number => parsePercent(value);

export const parseWindKph = (value: string): number => parsePercent(value);
