import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, ChevronDown,
  CircleHelp, Clock3, Download, ExternalLink, Gauge, Leaf, Menu, Moon, RefreshCw,
  Sun, Wind, X,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { useGetDashboardQuery, useRefreshDashboardMutation, type Point } from './windApi'

const fmt = (value: number | null | undefined, decimals = 0) =>
  value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('en-GB', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })

const shortTime = (value: string) => new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
const hourLabel = (value: number) => `${String(value).padStart(2, '0')}:00`

function MetricCard({ label, value, unit, note, icon: Icon, accent = false }: {
  label: string; value: string; unit: string; note: string; icon: typeof Activity; accent?: boolean
}) {
  return <article className={`metric-card${accent ? ' metric-card-accent' : ''}`}>
    <div className="metric-top"><span>{label}</span><Icon size={16} strokeWidth={1.7} /></div>
    <div className="metric-value">{value}<small>{unit}</small></div>
    <div className="metric-note"><span className="status-dot" />{note}</div>
  </article>
}

function EmptyChart({ message }: { message: string }) {
  return <div className="empty-chart"><Activity size={20} /><span>{message}</span></div>
}

export default function App() {
  const { data, error: loadError, isLoading, isFetching } = useGetDashboardQuery()
  const [refreshDashboard, { isLoading: isRefreshing, error: refreshError }] = useRefreshDashboardMutation()
  const [range, setRange] = useState('7D')
  const [dark, setDark] = useState(true)
  const [showMethod, setShowMethod] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const updateActiveSection = () => {
      const sections = ['overview', 'accuracy', 'uncertainty']
      const current = sections.reduce((active, sectionId) => {
        const section = document.getElementById(sectionId)
        return section && section.getBoundingClientRect().top <= 160 ? sectionId : active
      }, 'overview')
      setActiveSection(current)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [])

  const filteredPoints = useMemo(() => {
    if (!data?.points) return []
    const complete = data.points.filter((p) => p.forecast_mw != null || p.actual_mw != null)
    const days = range === '24H' ? 1 : range === '7D' ? 7 : 31
    const latest = complete[complete.length - 1]
    if (!latest) return complete
    const cutoff = new Date(latest.start_time).getTime() - days * 86_400_000
    return complete.filter((p) => new Date(p.start_time).getTime() >= cutoff)
  }, [data, range])

  const latest = data?.latest_forecast
  const accuracy = data?.metrics
  const errorDirection = accuracy?.bias_mw != null && accuracy.bias_mw < 0
  const hasError = Boolean(loadError || refreshError)

  const downloadCsv = () => {
    if (!data?.points) return
    const header = 'start_time,forecast_mw,actual_mw,publish_time,lead_hours,error_mw'
    const rows = data.points.map((p) => [p.start_time, p.forecast_mw ?? '', p.actual_mw ?? '', p.publish_time ?? '', p.lead_hours ?? '', p.error_mw ?? ''].join(','))
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }))
    link.download = 'northstar-wind-january-2026.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <div className={`app-shell${dark ? '' : ' light-mode'}`}>
    <aside className={`sidebar${mobileNav ? ' sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Wind size={19} /></div><span>northstar<span className="brand-period">.</span></span><button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-select"><span className="workspace-avatar">UK</span><span>United Kingdom</span><ChevronDown size={14} /></div>
      <div className="nav-section-label">ANALYTICS</div>
      <nav className="side-nav">
        <a className={`nav-item${activeSection === 'overview' ? ' active' : ''}`} href="#overview" aria-current={activeSection === 'overview' ? 'location' : undefined} onClick={() => { setActiveSection('overview'); setMobileNav(false) }}><BarChart3 size={17} />Overview<span className="nav-active-mark" /></a>
        <a className={`nav-item${activeSection === 'accuracy' ? ' active' : ''}`} href="#accuracy" aria-current={activeSection === 'accuracy' ? 'location' : undefined} onClick={() => { setActiveSection('accuracy'); setMobileNav(false) }}><Gauge size={17} />Forecast accuracy<span className="nav-active-mark" /></a>
        <a className={`nav-item${activeSection === 'uncertainty' ? ' active' : ''}`} href="#uncertainty" aria-current={activeSection === 'uncertainty' ? 'location' : undefined} onClick={() => { setActiveSection('uncertainty'); setMobileNav(false) }}><Activity size={17} />Uncertainty<span className="nav-active-mark" /></a>
      </nav>
      <div className="sidebar-bottom">
        <div className="market-card"><div className="market-card-head"><span className="live-pulse" />MARKET DATA</div><strong>BMRS <span>● Connected</span></strong><small>National wind · 30 min</small></div>
        <div className="user-profile"><div className="user-avatar">AO</div><div><strong>Analyst workspace</strong><small>Day-ahead desk</small></div><ChevronDown size={15} /></div>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button><span>Analytics</span><span className="crumb-slash">/</span><strong>Wind intelligence</strong></div>
        <div className="topbar-actions"><div className="period-pill"><CalendarDays size={14} /><span>JAN 01 — 31, 2026</span><span className="period-dot" /></div><button className="icon-button theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="icon-button" aria-label="Help" onClick={() => setShowMethod(!showMethod)}><CircleHelp size={17} /></button></div>
      </header>

      <div className="content-wrap">
        <section className="page-heading" id="overview">
          <div><div className="eyebrow"><span className="eyebrow-line" />PROCUREMENT INTELLIGENCE <span className="eyebrow-sep">/</span> NATIONAL WIND</div><h1>Wind forecast <em>intelligence</em></h1><p className="page-subtitle">January 2026 retrospective · See what the wind delivered and how the day-ahead call performed.</p></div>
          <div className="heading-actions"><span className={`data-status ${hasError ? 'data-status-error' : ''}`}><span className="status-dot" />{isLoading ? 'Connecting to BMRS' : hasError ? 'Data unavailable' : 'BMRS data feed'}</span><button className="button-secondary" onClick={() => refreshDashboard()} disabled={isFetching || isRefreshing}><RefreshCw size={14} className={isFetching || isRefreshing ? 'spin' : ''} />Refresh</button><button className="button-primary" onClick={downloadCsv} disabled={!data?.points.length}><Download size={14} />Export data</button></div>
        </section>

        {showMethod && <div className="method-banner"><div><strong>How to read this dashboard</strong><p>Forecast accuracy compares the latest forecast published at least 24 hours before each delivery interval against metered WIND generation. Error = forecast − actual; negative bias means wind was under-forecast.</p></div><button className="icon-button" onClick={() => setShowMethod(false)} aria-label="Close methodology"><X size={16} /></button></div>}

        {hasError && <div className="error-banner"><div><strong>BMRS data could not be loaded</strong><p>The dashboard does not substitute sample values for live source data. Check the API connection and try again.</p></div><button className="button-secondary" onClick={() => refreshDashboard()}><RefreshCw size={14} />Retry</button></div>}

        <section className="hero-grid" aria-label="Latest forecast and accuracy summary">
          <article className="hero-card">
            <div className="hero-card-glow" />
            <div className="hero-card-header"><div><span className="section-kicker"><span className="live-pulse" />LATEST JANUARY DAY-AHEAD FORECAST</span><h2>Wind generation</h2></div><span className="wind-icon"><Wind size={21} /></span></div>
            <div className="hero-reading"><span>{isLoading ? '···' : fmt(latest?.forecast_mw)}</span><small>MW</small><span className="reading-divider" /><span className="reading-time">{latest ? shortTime(latest.start_time) : 'No forecast available'}</span></div>
            <div className="hero-footer"><span><Clock3 size={13} />{latest?.publish_time ? `Issued ${shortTime(latest.publish_time)} UTC` : 'Forecast issue time unavailable'}</span><span className="forecast-badge"><span />DAY-AHEAD</span></div>
            <div className="hero-sparkline"><div className="sparkline-bars">{(data?.points.slice(-36) ?? []).map((p, i) => <span key={`${p.start_time}-${i}`} style={{ height: `${Math.max(5, ((p.forecast_mw ?? 0) / Math.max(1, ...data!.points.slice(-36).map((item) => item.forecast_mw ?? 0))) * 29)}px` }} />)}</div></div>
          </article>
          <div className="metrics-grid">
            <MetricCard label="Mean absolute error" value={isLoading ? '···' : fmt(accuracy?.mae_mw)} unit=" MW" note={accuracy?.count ? `${fmt(accuracy.count)} matched intervals` : 'Awaiting matched intervals'} icon={Activity} accent />
            <MetricCard label="Root mean squared error" value={isLoading ? '···' : fmt(accuracy?.rmse_mw)} unit=" MW" note="Penalises larger misses" icon={Gauge} />
            <MetricCard label="Forecast bias" value={isLoading ? '···' : fmt(accuracy?.bias_mw)} unit=" MW" note={accuracy?.bias_mw == null ? 'Forecast − actual' : errorDirection ? 'Wind under-forecast on average' : 'Wind over-forecast on average'} icon={errorDirection ? ArrowDownRight : ArrowUpRight} />
            <MetricCard label="Mean absolute % error" value={isLoading ? '···' : fmt(accuracy?.mape_pct, 1)} unit="%" note="Intervals with non-zero actual" icon={BarChart3} />
          </div>
        </section>

        <section className="chart-card primary-chart" id="accuracy">
          <div className="chart-heading"><div><div className="chart-title-row"><span className="chart-icon"><Activity size={15} /></span><h3>Forecast vs actual</h3><span className="chart-context">JANUARY 2026</span></div><p>National wind generation by half-hour delivery interval</p></div><div className="chart-tools"><div className="segmented-control">{['24H', '7D', 'ALL'].map((item) => <button className={range === item ? 'selected' : ''} key={item} onClick={() => setRange(item)}>{item}</button>)}</div></div></div>
          <div className="chart-legend"><span><i className="legend-line forecast-line" />Forecast</span><span><i className="legend-line actual-line" />Actual</span>{data?.high_error_threshold_mw != null && <span><i className="legend-dot-high" />High-error interval · top decile</span>}<span className="unit-label">GENERATION · MW</span></div>
          <div className="main-chart">{isLoading ? <EmptyChart message="Loading BMRS generation data…" /> : filteredPoints.length === 0 ? <EmptyChart message="No January wind observations are available from BMRS." /> : <ResponsiveContainer width="100%" height="100%"><ComposedChart data={filteredPoints} margin={{ top: 10, right: 13, left: -12, bottom: 0 }}>
            <defs><linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b5fb68" stopOpacity={0.17} /><stop offset="100%" stopColor="#b5fb68" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="start_time" tickFormatter={(v) => new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })} minTickGap={44} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'DM Mono' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'DM Mono' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="forecast_mw" name="Forecast" stroke="#b5fb68" strokeWidth={1.8} fill="url(#forecastFill)" connectNulls={false} dot={false} />
            <Line type="monotone" dataKey="actual_mw" name="Actual" stroke="#60b9ef" strokeWidth={1.7} connectNulls={false} dot={renderHighErrorDot} activeDot={{ r: 3, strokeWidth: 0 }} />
          </ComposedChart></ResponsiveContainer>}</div>
          <div className="chart-footnote"><span><span className="status-dot" />{fmt(filteredPoints.length)} half-hour intervals in view</span><button className="text-button" onClick={() => setShowMethod(!showMethod)}>View methodology <ExternalLink size={12} /></button></div>
        </section>

        <section className="lower-grid" id="uncertainty">
          <article className="chart-card lower-card">
            <div className="chart-heading"><div><div className="chart-title-row"><span className="chart-icon chart-icon-blue"><BarChart3 size={15} /></span><h3>Error by time of day</h3></div><p>Mean absolute error across delivery hours</p></div><span className="micro-unit">MW</span></div>
            <div className="small-chart">{data?.hourly_accuracy.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.hourly_accuracy} margin={{ top: 12, right: 8, left: -17, bottom: 0 }}><defs><linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#61b9ee" stopOpacity={0.3} /><stop offset="100%" stopColor="#61b9ee" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="hour" tickFormatter={hourLabel} interval={3} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'DM Mono' }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'DM Mono' }} /><Tooltip content={<HourTooltip />} /><Area dataKey="mae_mw" name="MAE" type="monotone" stroke="#61b9ee" strokeWidth={1.7} fill="url(#hourFill)" dot={false} /></AreaChart></ResponsiveContainer> : <EmptyChart message="Hourly accuracy will appear when actuals are available." />}</div>
            <div className="small-chart-caption"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
          </article>
          <article className="chart-card lower-card">
            <div className="chart-heading"><div><div className="chart-title-row"><span className="chart-icon chart-icon-purple"><Clock3 size={15} /></span><h3>Error by forecast lead</h3></div><p>Forecast horizon vs. mean absolute error</p></div><span className="micro-unit">MW</span></div>
            <div className="lead-chart">{data?.lead_accuracy.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data.lead_accuracy} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}><CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="lead_hours" tickFormatter={(v) => `${v}h`} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'DM Mono' }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'DM Mono' }} /><Tooltip content={<LeadTooltip />} /><Line dataKey="mae_mw" name="MAE" type="monotone" stroke="#b293ff" strokeWidth={2} dot={{ r: 2.7, fill: '#b293ff', stroke: 'var(--panel)', strokeWidth: 2 }} activeDot={{ r: 4 }} /><ReferenceLine y={accuracy?.mae_mw ?? undefined} stroke="var(--muted)" strokeDasharray="4 5" /></ComposedChart></ResponsiveContainer> : <EmptyChart message="Lead-time accuracy will appear when matched forecasts are available." />}</div>
            <div className="lead-foot"><span><i className="legend-line lead-line" />MAE by lead</span><span><i className="legend-line average-line" />Overall MAE</span></div>
          </article>
          <article className="chart-card lower-card residual-card">
            <div className="chart-heading"><div><div className="chart-title-row"><span className="chart-icon chart-icon-orange"><Activity size={15} /></span><h3>Forecast error distribution</h3></div><p>Residuals grouped by error magnitude</p></div><span className="micro-unit">INTERVALS</span></div>
            <div className="residual-wrap">{data?.residuals.length ? <ResidualChart residuals={data.residuals} /> : <EmptyChart message="Residual distribution needs matched forecast and actual intervals." />}</div>
            <div className="residual-axis"><span>← Under-forecast</span><span>MW error · forecast − actual</span><span>Over-forecast →</span></div>
          </article>
        </section>

        <section className="insight-strip"><div className="insight-icon"><Leaf size={17} /></div><div><strong>Procurement signal</strong><p>{accuracy?.bias_mw == null ? 'Matched January forecast and actual data will reveal systematic wind shortfall and inform cover decisions.' : accuracy.bias_mw < 0 ? `Forecasts under-called wind by ${fmt(Math.abs(accuracy.bias_mw))} MW on average. Use MAE as a baseline for uncertainty, not a deterministic reserve.` : `Forecasts over-called wind by ${fmt(accuracy.bias_mw)} MW on average. Use MAE as a baseline for uncertainty, not a deterministic reserve.`}</p></div><button className="insight-link" onClick={() => setShowMethod(!showMethod)}>Read the methodology <ExternalLink size={12} /></button></section>

        <footer className="page-footer"><span><span className="status-dot" />DATA SOURCE: ELEXON BMRS</span><span>WIND ONLY <i /> JAN 2026 <i /> UK NATIONAL</span><span>UTC · HALF-HOURLY</span></footer>
      </div>
    </main>
  </div>
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number | null; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><span className="tooltip-time">{label ? shortTime(label) + ' UTC' : ''}</span>{payload.map((entry) => <div key={entry.name} className="tooltip-row"><i style={{ background: entry.color }} />{entry.name}<strong>{fmt(entry.value)} MW</strong></div>)}</div>
}
function renderHighErrorDot(props: { cx?: number; cy?: number; payload?: Point }) {
  if (!props.payload?.high_error || props.cx == null || props.cy == null) return <g />
  return <circle cx={props.cx} cy={props.cy} r={3.2} fill="#f5a868" stroke="var(--panel)" strokeWidth={1.5} />
}
function HourTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><span className="tooltip-time">{hourLabel(Number(label))} UTC</span><div className="tooltip-row"><i className="tooltip-blue" />MAE<strong>{fmt(payload[0].value)} MW</strong></div></div>
}
function LeadTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><span className="tooltip-time">{label}h forecast lead</span><div className="tooltip-row"><i className="tooltip-purple" />MAE<strong>{fmt(payload[0].value)} MW</strong></div></div>
}
function ResidualChart({ residuals }: { residuals: number[] }) {
  const bins = useMemo(() => {
    if (!residuals.length) return []
    const max = Math.max(100, ...residuals.map(Math.abs))
    const width = max * 2 / 16
    return Array.from({ length: 16 }, (_, index) => {
      const lower = -max + width * index
      return { center: lower + width / 2, count: residuals.filter((v) => v >= lower && (index === 15 ? v <= lower + width : v < lower + width)).length }
    })
  }, [residuals])
  return <ResponsiveContainer width="100%" height="100%"><ComposedChart data={bins} margin={{ top: 15, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="center" tickFormatter={(v) => `${v > 0 ? '+' : ''}${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'DM Mono' }} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'DM Mono' }} /><Tooltip formatter={(value) => [value, 'Intervals']} labelFormatter={(v) => `${fmt(Number(v))} MW`} contentStyle={{ background: 'var(--tooltip)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 11 }} /><ReferenceLine x={0} stroke="var(--muted)" strokeDasharray="3 4" /><Area dataKey="count" type="monotone" stroke="#f5a868" strokeWidth={1.7} fill="#f5a868" fillOpacity={0.18} /></ComposedChart></ResponsiveContainer>
}
