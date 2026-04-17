const https = require("https");
const config = require("../config");

const OWM_API_KEY = config.OWM_API_KEY;
const CACHE_TTL   = config.WEATHER_CACHE_MINUTES * 60 * 1000;

// Zone → city name for OWM API
const ZONE_CITY_MAP = {
  "Chennai - Velachery":     "Chennai",
  "Chennai - Adyar":         "Chennai",
  "Chennai - Tambaram":      "Chennai",
  "Mumbai - Dharavi":        "Mumbai",
  "Delhi - Noida":           "Noida",
  "Delhi - Saket":           "Delhi",
  "Bangalore - Koramangala": "Bangalore",
  "Hyderabad - Hitech City": "Hyderabad",
};

// In-memory cache: city -> { data, fetchedAt }
const weatherCache = new Map();

function log(msg) {
  console.log(`[WeatherIntegration] ${new Date().toISOString()} — ${msg}`);
}

// HTTP GET with exponential backoff retry
function httpGet(url, retries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      https.get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error("JSON parse error")); }
          } else if (n > 0) {
            log(`HTTP ${res.statusCode} — retrying in ${delay}ms (${n} left)`);
            setTimeout(() => attempt(n - 1), delay);
            delay *= 2;
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on("error", (err) => {
        if (n > 0) {
          log(`Network error: ${err.message} — retrying in ${delay}ms`);
          setTimeout(() => attempt(n - 1), delay);
          delay *= 2;
        } else {
          reject(err);
        }
      });
    };
    attempt(retries);
  });
}

// Fetch weather from OpenWeatherMap for a city
async function fetchWeatherForCity(city) {
  const cached = weatherCache.get(city);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    log(`Cache hit for ${city}`);
    return cached.data;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&appid=${OWM_API_KEY}&units=metric`;
  log(`Fetching weather for ${city}`);

  const raw = await httpGet(url);

  const data = {
    rainfall:    (raw.rain && raw.rain["1h"]) ? raw.rain["1h"] : 0,  // mm/hr
    temperature: raw.main.temp,
    humidity:    raw.main.humidity,
    description: raw.weather[0].description,
    timestamp:   Date.now(),
    // AQI requires separate OWM Air Pollution API call
    aqi:         null,
  };

  // Fetch AQI separately
  try {
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${raw.coord.lat}&lon=${raw.coord.lon}&appid=${OWM_API_KEY}`;
    const aqiRaw = await httpGet(aqiUrl);
    // OWM AQI index 1-5; map to approximate AQI value
    const aqiIndex = aqiRaw.list[0].main.aqi;
    const aqiMap = { 1: 50, 2: 100, 3: 150, 4: 250, 5: 400 };
    data.aqi = aqiMap[aqiIndex] || 50;
  } catch (e) {
    log(`AQI fetch failed for ${city}: ${e.message}`);
    data.aqi = 0;
  }

  weatherCache.set(city, { data, fetchedAt: Date.now() });
  log(`Fetched: ${city} — rain=${data.rainfall}mm temp=${data.temperature}°C aqi=${data.aqi}`);
  return data;
}

// Safe defaults if API fails
const SAFE_DEFAULT = { rainfall: 0, aqi: 0, temperature: 30, timestamp: Date.now() };

async function getZoneWeather(zone) {
  const city = ZONE_CITY_MAP[zone];
  if (!city) {
    log(`Unknown zone: ${zone}`);
    return { ...SAFE_DEFAULT };
  }
  try {
    return await fetchWeatherForCity(city);
  } catch (e) {
    log(`Failed to fetch weather for ${zone}: ${e.message} — returning safe defaults`);
    return { ...SAFE_DEFAULT };
  }
}

async function checkRainfallTrigger(zone, threshold = 20) {
  const w = await getZoneWeather(zone);
  return w.rainfall > threshold;
}

async function checkAQITrigger(zone, threshold = 300) {
  const w = await getZoneWeather(zone);
  return w.aqi > threshold;
}

async function checkHeatTrigger(zone, threshold = 42) {
  const w = await getZoneWeather(zone);
  return w.temperature > threshold;
}

module.exports = { getZoneWeather, checkRainfallTrigger, checkAQITrigger, checkHeatTrigger };
