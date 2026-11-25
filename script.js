/**
 * SkyCast - Live Weather Web Application
 * Vanilla JavaScript (ES6+), Open-Meteo APIs, No External Libraries
 */

// ==========================================================================
// WMO Weather Interpretation Code Table
// ==========================================================================
const WMO_CODE_MAP = {
  0:  { desc: 'Clear sky', dayEmoji: '☀️', nightEmoji: '🌙', theme: 'clear' },
  1:  { desc: 'Mainly clear', dayEmoji: '🌤️', nightEmoji: '🌤️', theme: 'clear' },
  2:  { desc: 'Partly cloudy', dayEmoji: '⛅', nightEmoji: '☁️', theme: 'cloudy' },
  3:  { desc: 'Overcast', dayEmoji: '☁️', nightEmoji: '☁️', theme: 'cloudy' },
  45: { desc: 'Foggy', dayEmoji: '🌫️', nightEmoji: '🌫️', theme: 'cloudy' },
  48: { desc: 'Depositing rime fog', dayEmoji: '🌫️', nightEmoji: '🌫️', theme: 'cloudy' },
  51: { desc: 'Light drizzle', dayEmoji: '🌦️', nightEmoji: '🌧️', theme: 'rainy' },
  53: { desc: 'Moderate drizzle', dayEmoji: '🌦️', nightEmoji: '🌧️', theme: 'rainy' },
  55: { desc: 'Dense drizzle', dayEmoji: '🌧️', nightEmoji: '🌧️', theme: 'rainy' },
  56: { desc: 'Light freezing drizzle', dayEmoji: '🌧️❄️', nightEmoji: '🌧️❄️', theme: 'rainy' },
  57: { desc: 'Dense freezing drizzle', dayEmoji: '🌧️❄️', nightEmoji: '🌧️❄️', theme: 'rainy' },
  61: { desc: 'Slight rain', dayEmoji: '🌦️', nightEmoji: '🌧️', theme: 'rainy' },
  63: { desc: 'Moderate rain', dayEmoji: '🌧️', nightEmoji: '🌧️', theme: 'rainy' },
  65: { desc: 'Heavy rain', dayEmoji: '🌧️', nightEmoji: '🌧️', theme: 'rainy' },
  66: { desc: 'Light freezing rain', dayEmoji: '🌨️', nightEmoji: '🌨️', theme: 'rainy' },
  67: { desc: 'Heavy freezing rain', dayEmoji: '🌨️', nightEmoji: '🌨️', theme: 'rainy' },
  71: { desc: 'Slight snowfall', dayEmoji: '🌨️', nightEmoji: '🌨️', theme: 'snow' },
  73: { desc: 'Moderate snowfall', dayEmoji: '❄️', nightEmoji: '❄️', theme: 'snow' },
  75: { desc: 'Heavy snowfall', dayEmoji: '❄️', nightEmoji: '❄️', theme: 'snow' },
  77: { desc: 'Snow grains', dayEmoji: '❄️', nightEmoji: '❄️', theme: 'snow' },
  80: { desc: 'Slight rain showers', dayEmoji: '🌦️', nightEmoji: '🌧️', theme: 'rainy' },
  81: { desc: 'Moderate rain showers', dayEmoji: '🌧️', nightEmoji: '🌧️', theme: 'rainy' },
  82: { desc: 'Violent rain showers', dayEmoji: '⛈️', nightEmoji: '⛈️', theme: 'rainy' },
  85: { desc: 'Slight snow showers', dayEmoji: '🌨️', nightEmoji: '🌨️', theme: 'snow' },
  86: { desc: 'Heavy snow showers', dayEmoji: '🌨️', nightEmoji: '🌨️', theme: 'snow' },
  95: { desc: 'Thunderstorm', dayEmoji: '⛈️', nightEmoji: '⛈️', theme: 'thunderstorm' },
  96: { desc: 'Thunderstorm with slight hail', dayEmoji: '⛈️⚡', nightEmoji: '⛈️⚡', theme: 'thunderstorm' },
  99: { desc: 'Thunderstorm with heavy hail', dayEmoji: '⛈️⚡', nightEmoji: '⛈️⚡', theme: 'thunderstorm' },
};

function getWeatherMeta(code, isDay = 1) {
  const meta = WMO_CODE_MAP[code] || {
    desc: 'Cloudy',
    dayEmoji: '⛅',
    nightEmoji: '☁️',
    theme: 'cloudy'
  };

  const isNight = isDay === 0;
  const emoji = isNight ? meta.nightEmoji : meta.dayEmoji;
  
  // If it's nighttime and not storming/snowing, give a deep purple night theme
  let theme = meta.theme;
  if (isNight && (theme === 'clear' || theme === 'cloudy')) {
    theme = 'night';
  }

  return {
    description: meta.desc,
    emoji: emoji,
    theme: theme
  };
}

// ==========================================================================
// Application State
// ==========================================================================
const state = {
  unit: 'C', // 'C' or 'F'
  lastWeatherData: null,
  currentLocationName: 'Kolkata',
  currentCountry: 'India',
};

// ==========================================================================
// DOM Elements
// ==========================================================================
const elements = {
  body: document.body,
  dateTime: document.getElementById('current-date-time'),
  searchForm: document.getElementById('search-form'),
  cityInput: document.getElementById('city-input'),
  geoBtn: document.getElementById('geo-btn'),
  unitCBtn: document.getElementById('unit-c'),
  unitFBtn: document.getElementById('unit-f'),
  unitToggle: document.querySelector('.unit-toggle'),
  errorBanner: document.getElementById('error-banner'),
  errorMessage: document.getElementById('error-message'),
  errorCloseBtn: document.getElementById('error-close-btn'),
  loadingOverlay: document.getElementById('loading-overlay'),
  weatherDisplay: document.getElementById('weather-display'),

  // Weather Card Elements
  currentCity: document.getElementById('current-city'),
  currentCountry: document.getElementById('current-country'),
  currentWeatherDesc: document.getElementById('current-weather-desc'),
  currentTemp: document.getElementById('current-temp'),
  tempUnitSymbol: document.getElementById('temp-unit-symbol'),
  currentWeatherEmoji: document.getElementById('current-weather-emoji'),
  humidityVal: document.getElementById('humidity-val'),
  windVal: document.getElementById('wind-val'),
  rangeVal: document.getElementById('range-val'),
  forecastCards: document.getElementById('forecast-cards'),
};

// ==========================================================================
// Utility Functions
// ==========================================================================

function cToF(celsius) {
  return (celsius * 9) / 5 + 32;
}

function formatTemperature(celsius) {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return '--';
  const val = state.unit === 'C' ? celsius : cToF(celsius);
  return Math.round(val);
}

function formatWindSpeed(kmh) {
  if (kmh === null || kmh === undefined || isNaN(kmh)) return '--';
  if (state.unit === 'C') {
    return `${Math.round(kmh)} km/h`;
  } else {
    const mph = kmh * 0.621371;
    return `${Math.round(mph)} mph`;
  }
}

function updateLiveClock() {
  const now = new Date();
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  elements.dateTime.textContent = now.toLocaleString(undefined, options);
}

function showLoading(isLoading) {
  if (isLoading) {
    elements.loadingOverlay.classList.remove('hidden');
    elements.weatherDisplay.style.opacity = '0.35';
    elements.weatherDisplay.style.pointerEvents = 'none';
  } else {
    elements.loadingOverlay.classList.add('hidden');
    elements.weatherDisplay.style.opacity = '1';
    elements.weatherDisplay.style.pointerEvents = 'auto';
  }
}

function showError(msg) {
  elements.errorMessage.textContent = msg;
  elements.errorBanner.classList.remove('hidden');
}

function hideError() {
  elements.errorBanner.classList.add('hidden');
}

// ==========================================================================
// Weather API & Geocoding Calls
// ==========================================================================

/**
 * Look up latitude/longitude for a given city query via Open-Meteo Geocoding
 */
async function fetchCityCoordinates(cityName) {
  const endpoint = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Geocoding server error (${response.status})`);
  }
  
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${cityName}" not found. Please verify spelling.`);
  }

  const result = data.results[0];
  return {
    name: result.name,
    country: result.country || (result.admin1 ? result.admin1 : ''),
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

/**
 * Fetch current weather and 5-day forecast from Open-Meteo Forecast API
 */
async function fetchWeatherData(lat, lon) {
  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Weather service error (${response.status})`);
  }

  return await response.json();
}

/**
 * Reverse geocode coordinates using client-side reverse geocoding API or fallback
 */
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || 'My Location';
      const country = data.countryName || '';
      return { city, country };
    }
  } catch (err) {
    console.warn('Reverse geocoding unavailable, using fallback', err);
  }
  return { city: 'Current Location', country: '' };
}

// ==========================================================================
// Render Logic
// ==========================================================================

function renderWeather() {
  const data = state.lastWeatherData;
  if (!data) return;

  const current = data.current;
  const daily = data.daily;

  // 1. Current Weather
  const weatherCode = current.weather_code;
  const isDay = current.is_day ?? 1;
  const meta = getWeatherMeta(weatherCode, isDay);

  // Update theme gradient
  elements.body.className = `theme-${meta.theme}`;

  // Update headers
  elements.currentCity.textContent = state.currentLocationName;
  elements.currentCountry.textContent = state.currentCountry;
  elements.currentWeatherDesc.textContent = meta.description;
  elements.currentWeatherEmoji.textContent = meta.emoji;

  // Temperature
  elements.currentTemp.textContent = formatTemperature(current.temperature_2m);
  elements.tempUnitSymbol.textContent = `°${state.unit}`;

  // Metrics
  elements.humidityVal.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  elements.windVal.textContent = formatWindSpeed(current.wind_speed_10m);

  // Today High / Low
  if (daily && daily.temperature_2m_max && daily.temperature_2m_min) {
    const maxToday = formatTemperature(daily.temperature_2m_max[0]);
    const minToday = formatTemperature(daily.temperature_2m_min[0]);
    elements.rangeVal.textContent = `${maxToday}° / ${minToday}°`;
  }

  // 2. 5-Day Forecast
  elements.forecastCards.innerHTML = '';
  if (daily && daily.time && daily.time.length > 0) {
    const totalDays = Math.min(5, daily.time.length);

    for (let i = 0; i < totalDays; i++) {
      const rawDateStr = daily.time[i];
      // Parse local calendar date safely avoiding timezone day shift
      const parts = rawDateStr.split('-');
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

      let dayName;
      if (i === 0) {
        dayName = 'Today';
      } else if (i === 1) {
        dayName = 'Tomorrow';
      } else {
        dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
      }

      const dateDisplay = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const dayCode = daily.weather_code[i];
      const dayMeta = getWeatherMeta(dayCode, 1);

      const highTemp = formatTemperature(daily.temperature_2m_max[i]);
      const lowTemp = formatTemperature(daily.temperature_2m_min[i]);

      const tile = document.createElement('div');
      tile.className = 'forecast-tile glass-inset';
      tile.innerHTML = `
        <span class="forecast-day">${dayName}</span>
        <span class="forecast-date">${dateDisplay}</span>
        <div class="forecast-emoji" role="img" aria-label="${dayMeta.description}">${dayMeta.emoji}</div>
        <span class="forecast-cond">${dayMeta.description}</span>
        <div class="forecast-temps">
          <span class="forecast-high">${highTemp}°</span>
          <span class="forecast-low">${lowTemp}°</span>
        </div>
      `;
      elements.forecastCards.appendChild(tile);
    }
  }
}

/**
 * Main Controller: Loads weather for a specific named city
 */
async function loadCityWeather(cityName, preferredCountry = '') {
  hideError();
  showLoading(true);

  try {
    const loc = await fetchCityCoordinates(cityName);
    state.currentLocationName = loc.name;
    state.currentCountry = preferredCountry || loc.country;

    const weatherData = await fetchWeatherData(loc.latitude, loc.longitude);
    state.lastWeatherData = weatherData;

    renderWeather();
  } catch (err) {
    console.error('Weather load error:', err);
    showError(err.message || 'Could not load weather data.');
  } finally {
    showLoading(false);
  }
}

/**
 * Controller: Loads weather based on device geolocation
 */
async function loadLocationWeather() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }

  hideError();
  showLoading(true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const [locInfo, weatherData] = await Promise.all([
          reverseGeocode(lat, lon),
          fetchWeatherData(lat, lon)
        ]);

        state.currentLocationName = locInfo.city;
        state.currentCountry = locInfo.country;
        state.lastWeatherData = weatherData;

        renderWeather();
      } catch (err) {
        console.error('Location weather error:', err);
        showError('Failed to fetch weather for your location.');
      } finally {
        showLoading(false);
      }
    },
    (geoError) => {
      showLoading(false);
      let msg = 'Unable to retrieve your location.';
      if (geoError.code === geoError.PERMISSION_DENIED) {
        msg = 'Location permission was denied. Type a city name in the search bar.';
      } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
        msg = 'Location information is currently unavailable.';
      } else if (geoError.code === geoError.TIMEOUT) {
        msg = 'Location request timed out. Please try again.';
      }
      showError(msg);
    },
    { timeout: 10000, enableHighAccuracy: false }
  );
}

// ==========================================================================
// Unit Switching Logic (°C / °F)
// ==========================================================================

function setUnit(newUnit) {
  if (state.unit === newUnit) return;
  state.unit = newUnit;

  if (newUnit === 'C') {
    elements.unitCBtn.classList.add('active');
    elements.unitCBtn.setAttribute('aria-pressed', 'true');
    elements.unitFBtn.classList.remove('active');
    elements.unitFBtn.setAttribute('aria-pressed', 'false');
    elements.unitToggle.removeAttribute('data-active');
  } else {
    elements.unitFBtn.classList.add('active');
    elements.unitFBtn.setAttribute('aria-pressed', 'true');
    elements.unitCBtn.classList.remove('active');
    elements.unitCBtn.setAttribute('aria-pressed', 'false');
    elements.unitToggle.setAttribute('data-active', 'F');
  }

  // Re-render instantly from cached data without network call
  if (state.lastWeatherData) {
    renderWeather();
  }
}

// ==========================================================================
// Event Listeners & Initialization
// ==========================================================================

function setupEventListeners() {
  // Search Form Submit
  elements.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = elements.cityInput.value.trim();
    if (city) {
      loadCityWeather(city);
      elements.cityInput.blur();
    }
  });

  // "Use my location" button
  elements.geoBtn.addEventListener('click', () => {
    loadLocationWeather();
  });

  // Unit Toggle Buttons
  elements.unitCBtn.addEventListener('click', () => setUnit('C'));
  elements.unitFBtn.addEventListener('click', () => setUnit('F'));

  // Close Error Banner
  elements.errorCloseBtn.addEventListener('click', hideError);

  // Live Clock update
  updateLiveClock();
  setInterval(updateLiveClock, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();

  // 6. Default to Kolkata on first load as required
  loadCityWeather('Kolkata', 'India');
});
