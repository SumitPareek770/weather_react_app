import { useEffect, useMemo, useState } from 'react'

const API_KEY = '195b308d3fd61f33e6f1c0509d557a89'
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

const unitsConfig = {
  metric: { label: '°C', speed: 'm/s' },
  imperial: { label: '°F', speed: 'mph' }
}

const weatherCodes = {
  Thunderstorm: '⛈️',
  Drizzle: '🌦️',
  Rain: '🌧️',
  Snow: '❄️',
  Mist: '🌫️',
  Smoke: '🌫️',
  Haze: '🌫️',
  Dust: '🌫️',
  Fog: '🌫️',
  Sand: '🌫️',
  Ash: '🌋',
  Squall: '💨',
  Tornado: '🌪️',
  Clear: '☀️',
  Clouds: '☁️'
}

const weatherEmoji = (main) => weatherCodes[main] || '🌈'

const formatTime = (timestamp, timezoneOffset, options) => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour12: true,
    ...options
  }).format(new Date((timestamp + timezoneOffset) * 1000))
}

const buildForecast = (list, timezoneOffset) => {
  const days = []
  list.forEach((entry) => {
    const date = new Date((entry.dt + timezoneOffset) * 1000).toISOString().slice(0, 10)
    if (!days[date]) {
      days[date] = {
        date,
        temp_min: entry.main.temp_min,
        temp_max: entry.main.temp_max,
        icon: entry.weather[0].main,
        description: entry.weather[0].description,
        pop: entry.pop
      }
    } else {
      days[date].temp_min = Math.min(days[date].temp_min, entry.main.temp_min)
      days[date].temp_max = Math.max(days[date].temp_max, entry.main.temp_max)
      days[date].pop = Math.max(days[date].pop, entry.pop)
    }
  })

  return Object.values(days).slice(0, 5)
}

function App() {
  const [city, setCity] = useState('New York')
  const [searchTerm, setSearchTerm] = useState('New York')
  const [units, setUnits] = useState('metric')
  const [theme, setTheme] = useState('light')
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const unitLabels = unitsConfig[units]

  const weatherMood = useMemo(() => {
    if (!weather) return 'Clear blue skies ahead.'
    const main = weather.current.weather[0].main
    if (main === 'Rain') return 'Cozy day for a warm drink.'
    if (main === 'Snow') return 'Stay bundled up and enjoy the view.'
    if (main === 'Clear') return 'Perfect weather for outdoor plans.'
    if (main === 'Clouds') return 'Mild sky with scattered clouds.'
    return 'Prepared weather insights for your day.'
  }, [weather])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const fetchWeather = async (location) => {
    setLoading(true)
    setError(null)

    try {
      const query = typeof location === 'string'
        ? `q=${encodeURIComponent(location)}`
        : `lat=${location.lat}&lon=${location.lon}`

      const currentRes = await fetch(`${BASE_URL}/weather?${query}&units=${units}&appid=${API_KEY}`)
      const currentData = await currentRes.json()
      if (!currentRes.ok) throw new Error(currentData.message || 'Unable to fetch weather')

      const forecastRes = await fetch(`${BASE_URL}/forecast?${query}&units=${units}&appid=${API_KEY}`)
      const forecastData = await forecastRes.json()
      if (!forecastRes.ok) throw new Error(forecastData.message || 'Unable to fetch forecast')

      setWeather({
        current: currentData,
        hourly: forecastData.list.slice(0, 8),
        timezoneOffset: currentData.timezone
      })
      setForecast(buildForecast(forecastData.list, currentData.timezone))
      setCity(currentData.name)
    } catch (err) {
      setError(err.message)
      setWeather(null)
      setForecast([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather(city)
  }, [units])

  const handleSearch = (event) => {
    event.preventDefault()
    if (!searchTerm.trim()) return
    fetchWeather(searchTerm.trim())
  }

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        })
      },
      () => setError('Unable to access your location.')
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Weather Dashboard</p>
          <h1>Live forecast for {city}</h1>
          <p className="subtitle">Real-time data powered by OpenWeatherMap API.</p>
        </div>

        <div className="actions">
          <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button type="button" onClick={handleGeolocation}>Use my location</button>
          <button type="button" onClick={() => setUnits(units === 'metric' ? 'imperial' : 'metric')}>
            {unitLabels.label} / {units === 'metric' ? '°F' : '°C'}
          </button>
        </div>
      </header>

      <main>
        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="search"
            aria-label="Search city"
            placeholder="Search city, e.g. London"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        {loading ? (
          <div className="loading">Loading weather…</div>
        ) : error ? (
          <div className="alert">{error}</div>
        ) : weather ? (
          <section className="dashboard-grid">
            <article className="weather-card hero-card">
              <div className="hero-header">
                <div>
                  <p className="eyebrow">Current</p>
                  <h2>{weather.current.weather[0].main}</h2>
                  <p>{weatherMood}</p>
                </div>
                <div className="weather-icon">{weatherEmoji(weather.current.weather[0].main)}</div>
              </div>
              <div className="hero-temp">
                <span>{Math.round(weather.current.main.temp)}</span>
                <small>{unitLabels.label}</small>
              </div>
              <div className="details-grid">
                <div>
                  <p>Feels like</p>
                  <strong>{Math.round(weather.current.main.feels_like)}{unitLabels.label}</strong>
                </div>
                <div>
                  <p>Humidity</p>
                  <strong>{weather.current.main.humidity}%</strong>
                </div>
                <div>
                  <p>Wind</p>
                  <strong>{weather.current.wind.speed} {unitLabels.speed}</strong>
                </div>
                <div>
                  <p>Sunrise / Sunset</p>
                  <strong>
                    {formatTime(weather.current.sys.sunrise, weather.timezoneOffset, { hour: 'numeric', minute: '2-digit' })} / {formatTime(weather.current.sys.sunset, weather.timezoneOffset, { hour: 'numeric', minute: '2-digit' })}
                  </strong>
                </div>
              </div>
            </article>

            <article className="weather-card stats-card">
              <p className="eyebrow">Hourly preview</p>
              <div className="hourly-strip">
                {weather.hourly.map((hour) => (
                  <div key={hour.dt} className="hour-item">
                    <span>{formatTime(hour.dt, weather.timezoneOffset, { hour: 'numeric' })}</span>
                    <span className="hour-icon">{weatherEmoji(hour.weather[0].main)}</span>
                    <strong>{Math.round(hour.main.temp)}{unitLabels.label}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="weather-card forecast-card">
              <p className="eyebrow">5-day forecast</p>
              <div className="forecast-grid">
                {forecast.map((day) => (
                  <div key={day.date} className="forecast-day">
                    <p>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                    <div className="forecast-emoji">{weatherEmoji(day.icon)}</div>
                    <p>{day.description}</p>
                    <strong>{Math.round(day.temp_max)}{unitLabels.label} / {Math.round(day.temp_min)}{unitLabels.label}</strong>
                    <small>{Math.round(day.pop * 100)}% precip</small>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : (
          <div className="placeholder">Search for a city or use geolocation to begin.</div>
        )}
      </main>
    </div>
  )
}

export default App
