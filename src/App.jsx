import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { StatisticsView, HistoryView } from './StatsView'
import { groupType } from './stats'

// Environment flag to show/hide emails (set VITE_SHOW_EMAILS=true to enable)
const SHOW_EMAILS = import.meta.env.VITE_SHOW_EMAILS === 'true'

// Icons
const TableIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
    <line x1="3" y1="9" x2="21" y2="9" strokeWidth="2"/>
    <line x1="3" y1="15" x2="21" y2="15" strokeWidth="2"/>
    <line x1="9" y1="3" x2="9" y2="21" strokeWidth="2"/>
  </svg>
)

const GraphIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="5" r="3" strokeWidth="2"/>
    <circle cx="5" cy="19" r="3" strokeWidth="2"/>
    <circle cx="19" cy="19" r="3" strokeWidth="2"/>
    <line x1="12" y1="8" x2="5" y2="16" strokeWidth="2"/>
    <line x1="12" y1="8" x2="19" y2="16" strokeWidth="2"/>
  </svg>
)

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10" strokeWidth="2" strokeLinecap="round"/>
    <line x1="12" y1="20" x2="12" y2="4" strokeWidth="2" strokeLinecap="round"/>
    <line x1="6" y1="20" x2="6" y2="14" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const TrendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M3 17l6-6 4 4 8-8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 7h5v5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" strokeWidth="2"/>
    <path d="M21 21l-4.35-4.35" strokeWidth="2"/>
  </svg>
)

const MailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="2"/>
    <polyline points="22,6 12,13 2,6" strokeWidth="2"/>
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2"/>
    <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2"/>
  </svg>
)

const LinkIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M22 2L11 13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ExternalIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 4h6v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 4l-9 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ChevronIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"/>
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Resource link component
function ResourceLink({ href, label, icon }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover hover:underline"
      title={label}
    >
      {icon || <LinkIcon />}
      <span>{label}</span>
    </a>
  )
}

// Status badge component
function StatusBadge({ status }) {
  if (!status) return null
  const tones = {
    'Active': 'pill-ok',
    'Inactive': 'pill-neutral',
    'Archived': 'pill-neutral',
    'Proposing': 'pill-warn',
    'Structuring and Chartering': 'pill-info',
  }
  return (
    <span className={`pill ${tones[status] || 'pill-neutral'}`}>
      {status}
    </span>
  )
}

const ACTIVITY_META = {
  veryActive: {
    key: 'veryActive',
    label: 'Very Active',
    dot: '🟢',
    score: 100,
    badgeClass: 'pill-ok',
  },
  active: {
    key: 'active',
    label: 'Active',
    dot: '🔵',
    score: 70,
    badgeClass: 'pill-info',
  },
  low: {
    key: 'low',
    label: 'Low',
    dot: '🟡',
    score: 35,
    badgeClass: 'pill-warn',
  },
  inactive: {
    key: 'inactive',
    label: 'Stalled',
    dot: '🔴',
    score: 0,
    badgeClass: 'pill-bad',
  },
  unknown: {
    key: 'unknown',
    label: 'Unspecified',
    dot: '⚪',
    score: 50,
    badgeClass: 'pill-neutral',
  },
}

function normalizeActivityLevel(level) {
  if (!level) return 'unknown'
  const raw = String(level).trim()
  const normalized = raw
    .replace(/[🟢🔵🟡🔴]/g, '')
    .trim()
    .toLowerCase()

  if (raw.includes('🟢') || normalized.includes('very active') || normalized === 'high' || normalized.includes('high activity')) {
    return 'veryActive'
  }
  if (raw.includes('🔵') || normalized === 'active' || normalized === 'medium' || normalized.includes('medium activity')) {
    return 'active'
  }
  if (raw.includes('🟡') || normalized === 'low' || normalized.includes('low activity')) {
    return 'low'
  }
  if (raw.includes('🔴') || normalized === 'inactive' || normalized === 'stalled') {
    return 'inactive'
  }
  return 'unknown'
}

function getActivityMeta(level) {
  const key = normalizeActivityLevel(level)
  return ACTIVITY_META[key] || ACTIVITY_META.unknown
}

function formatActivityLevel(level, withDot = false) {
  if (!level) return ''
  const meta = getActivityMeta(level)
  if (meta.key === 'unknown') return String(level).trim()
  return withDot ? `${meta.dot} ${meta.label}` : meta.label
}

// Activity level badge component
function ActivityBadge({ level }) {
  if (!level) return null
  const meta = getActivityMeta(level)
  return (
    <span className={`pill ${meta.badgeClass}`} title="Activity Level (Jira)">
      {meta.key !== 'unknown' && <span className="dot" />}
      {formatActivityLevel(level)}
    </span>
  )
}

// Calculate years active from creation date
function calculateYearsActive(creationDate) {
  if (!creationDate) return null
  const created = new Date(creationDate)
  if (isNaN(created.getTime())) return null
  const now = new Date()
  const diffMs = now - created
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)
  return Math.floor(diffYears * 10) / 10 // Round to 1 decimal
}

// Years active badge component
function YearsActiveBadge({ creationDate }) {
  const years = calculateYearsActive(creationDate)
  if (years === null) return null
  return (
    <span className="pill pill-brand" title="Time since Group Creation Date">
      {years < 1 ? `${Math.round(years * 12)}mo` : `${years}y`}
    </span>
  )
}

// Type class of a governing committee, from its summary (TSC, HC or IC).
function committeeTypeClass(summary) {
  if (!summary) return ''
  if (summary.includes('TSC')) return 't-tsc'
  if (summary.includes('(IC)')) return 't-ic'
  if (summary.includes('(HC)')) return 't-hc'
  return 't-tsc'
}

// Governing Committee Pill with tooltip
function GoverningCommitteePill({ row }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const pillRef = useRef(null)

  if (!row['Linked Issue Summary']) return null

  const hasDetails = row['Linked Issue Chair'] || row['Linked Issue Vice-Chair'] || row['Linked Issue Mailing List'] || row['Linked Issue Participation & Voting Rights']

  const handleMouseEnter = () => {
    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect()
      setTooltipPos({
        top: rect.bottom + 8,
        left: rect.left
      })
    }
    setShowTooltip(true)
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        ref={pillRef}
        className={`pill pill-type ${committeeTypeClass(row['Linked Issue Summary'])} cursor-default`}
      >
        {row['Linked Issue Summary']}
      </span>
      {showTooltip && hasDetails && (
        <div
          className="fixed z-[100] w-72 bg-surface rounded-control shadow-pop border border-line p-4 text-sm"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          <div className="font-semibold text-brand mb-3">{row['Linked Issue Summary']}</div>

          {row['Linked Issue Chair'] && (
            <div className="mb-2">
              <div className="text-xs text-muted uppercase tracking-wide">Chair</div>
              <div className="font-medium text-ink">{row['Linked Issue Chair']}</div>
              {row['Linked Issue Chair Affiliation'] && (
                <div className="text-xs text-muted">{row['Linked Issue Chair Affiliation']}</div>
              )}
            </div>
          )}

          {row['Linked Issue Vice-Chair'] && (
            <div className="mb-2">
              <div className="text-xs text-muted uppercase tracking-wide">Vice-Chair</div>
              <div className="font-medium text-ink">{row['Linked Issue Vice-Chair']}</div>
              {row['Linked Issue Vice-Chair Affiliation'] && (
                <div className="text-xs text-muted">{row['Linked Issue Vice-Chair Affiliation']}</div>
              )}
            </div>
          )}

          {row['Linked Issue Mailing List'] && (
            <div className="mt-3 pt-2 border-t border-line">
              <a
                href={row['Linked Issue Mailing List']}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover hover:underline"
              >
                <LinkIcon />
                <span>Mailing List</span>
              </a>
            </div>
          )}

          {row['Linked Issue Participation & Voting Rights'] && (
            <div className={row['Linked Issue Mailing List'] ? "mt-2" : "mt-3 pt-2 border-t border-line"}>
              <a
                href={row['Linked Issue Participation & Voting Rights']}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover hover:underline"
              >
                <LinkIcon />
                <span>Participants & Voters</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Copy button component
function CopyButton({ row, showEmails }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const years = calculateYearsActive(row['Creation Date'])
    const yearsText = years !== null ? (years < 1 ? `${Math.round(years * 12)} months` : `${years} years`) : ''

    let text = `${row['Summary']} (${row['Issue']})\n`
    text += `Status: ${row['Status'] || 'N/A'}\n`
    if (yearsText) text += `Active: ${yearsText}\n`
    if (row['Activity Level']) text += `Activity Level: ${formatActivityLevel(row['Activity Level'])}\n`
    text += `\n`

    if (row['Chair']) {
      text += `Chair: ${row['Chair']}\n`
      if (row['Chair Affiliation']) text += `  Affiliation: ${row['Chair Affiliation']}\n`
      if (showEmails && row['Chair Email']) text += `  Email: ${row['Chair Email']}\n`
    }

    if (row['Vice-Chair']) {
      text += `Vice-Chair: ${row['Vice-Chair']}\n`
      if (row['Vice-Chair Affiliation']) text += `  Affiliation: ${row['Vice-Chair Affiliation']}\n`
      if (showEmails && row['Vice-Chair Email']) text += `  Email: ${row['Vice-Chair Email']}\n`
    }

    if (row['Linked Issue Summary']) {
      text += `\nGoverning Committee: ${row['Linked Issue Summary']}\n`
      if (row['Linked Issue Chair']) {
        text += `  Chair: ${row['Linked Issue Chair']}\n`
        if (row['Linked Issue Chair Affiliation']) text += `    Affiliation: ${row['Linked Issue Chair Affiliation']}\n`
      }
      if (row['Linked Issue Vice-Chair']) {
        text += `  Vice-Chair: ${row['Linked Issue Vice-Chair']}\n`
        if (row['Linked Issue Vice-Chair Affiliation']) text += `    Affiliation: ${row['Linked Issue Vice-Chair Affiliation']}\n`
      }
    }

    text += `\nResources:\n`
    if (row['Charter']) text += `  Charter: ${row['Charter']}\n`
    if (row['Confluence Space']) text += `  Confluence: ${row['Confluence Space']}\n`
    if (row['Mailing List']) text += `  Mailing List: ${row['Mailing List']}\n`
    if (row['Meeting Notes']) text += `  Meeting Notes: ${row['Meeting Notes']}\n`
    if (row['Participation & Voting Rights']) text += `  Participants & Voters: ${row['Participation & Voting Rights']}\n`
    text += `  Jira: https://riscv.atlassian.net/browse/${row['Issue']}\n`

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`icon-btn ${copied ? 'is-done' : ''}`}
      title="Copy row data"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

// Parse CSV (RFC 4180: quoted fields may contain commas, doubled quotes and newlines)
function parseCSV(text) {
  const records = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); records.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); records.push(row) }
  const nonEmpty = records.filter(r => r.length > 1 || r[0] !== '')
  if (!nonEmpty.length) return []
  const headers = nonEmpty[0].map(h => h.trim())
  return nonEmpty.slice(1).map(values => {
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = (values[idx] || '').trim() })
    return obj
  })
}

// Number of distinct groups in a list of CSV rows (a group with two
// governing committees has two rows).
function countDistinct(rows) {
  return new Set(rows.map(r => r['Issue'])).size
}

// Build mailto link
function buildMailtoLink(row) {
  const toEmails = []
  const ccEmails = []

  if (row['Chair Email']) toEmails.push(row['Chair Email'])
  if (row['Vice-Chair Email']) toEmails.push(row['Vice-Chair Email'])
  if (row['Linked Issue Chair Email']) ccEmails.push(row['Linked Issue Chair Email'])
  if (row['Linked Issue Vice-Chair Email']) ccEmails.push(row['Linked Issue Vice-Chair Email'])

  if (toEmails.length === 0) return null

  let mailto = `mailto:${toEmails.join(',')}`
  const params = []

  if (ccEmails.length > 0) {
    params.push(`cc=${ccEmails.join(',')}`)
  }

  const subject = `[${row['Issue']}] ${row['Summary']}`
  params.push(`subject=${encodeURIComponent(subject)}`)

  // Build email body with all details
  const years = calculateYearsActive(row['Creation Date'])
  const yearsText = years !== null ? (years < 1 ? `${Math.round(years * 12)} months` : `${years} years`) : ''

  let body = `${row['Summary']} (${row['Issue']})\n`
  body += `${'='.repeat(50)}\n\n`

  body += `Status: ${row['Status'] || 'N/A'}\n`
  if (yearsText) body += `Active: ${yearsText}\n`
  if (row['Activity Level']) body += `Activity Level: ${formatActivityLevel(row['Activity Level'])}\n`
  body += `\n`

  // Leadership
  body += `--- Leadership ---\n`
  if (row['Chair']) {
    body += `Chair: ${row['Chair']}${row['Is Acting Chair'] === 'Yes' ? ' (Acting)' : ''}\n`
    if (row['Chair Affiliation']) body += `  Affiliation: ${row['Chair Affiliation']}\n`
    if (row['Chair Email']) body += `  Email: ${row['Chair Email']}\n`
  }
  if (row['Vice-Chair']) {
    body += `Vice-Chair: ${row['Vice-Chair']}${row['Is Acting Vice-Chair'] === 'Yes' ? ' (Acting)' : ''}\n`
    if (row['Vice-Chair Affiliation']) body += `  Affiliation: ${row['Vice-Chair Affiliation']}\n`
    if (row['Vice-Chair Email']) body += `  Email: ${row['Vice-Chair Email']}\n`
  }
  body += `\n`

  // Governing Committee
  if (row['Linked Issue Summary']) {
    body += `--- Governing Committee ---\n`
    body += `${row['Linked Issue Summary']}\n`
    if (row['Linked Issue Chair']) {
      body += `  Chair: ${row['Linked Issue Chair']}\n`
      if (row['Linked Issue Chair Affiliation']) body += `    Affiliation: ${row['Linked Issue Chair Affiliation']}\n`
      if (row['Linked Issue Chair Email']) body += `    Email: ${row['Linked Issue Chair Email']}\n`
    }
    if (row['Linked Issue Vice-Chair']) {
      body += `  Vice-Chair: ${row['Linked Issue Vice-Chair']}\n`
      if (row['Linked Issue Vice-Chair Affiliation']) body += `    Affiliation: ${row['Linked Issue Vice-Chair Affiliation']}\n`
      if (row['Linked Issue Vice-Chair Email']) body += `    Email: ${row['Linked Issue Vice-Chair Email']}\n`
    }
    body += `\n`
  }

  // Resources / Links
  body += `--- Resources ---\n`
  if (row['Charter']) body += `Charter: ${row['Charter']}\n`
  if (row['Confluence Space']) body += `Confluence: ${row['Confluence Space']}\n`
  if (row['Mailing List']) body += `Mailing List: ${row['Mailing List']}\n`
  if (row['Meeting Notes']) body += `Meeting Notes: ${row['Meeting Notes']}\n`
  if (row['Participation & Voting Rights']) body += `Participants & Voters: ${row['Participation & Voting Rights']}\n`
  body += `Jira: https://riscv.atlassian.net/browse/${row['Issue']}\n`
  body += `\n`

  // Elections
  if (row['Next Election Month'] && row['Next Election Year']) {
    body += `--- Elections ---\n`
    body += `Next Election: ${row['Next Election Month']} ${row['Next Election Year']}\n`
    if (row['Last Election Month'] && row['Last Election Year']) {
      body += `Last Election: ${row['Last Election Month']} ${row['Last Election Year']}\n`
    }
    body += `\n`
  }

  params.push(`body=${encodeURIComponent(body)}`)

  if (params.length > 0) {
    mailto += '?' + params.join('&')
  }

  return mailto
}

// Header Component
function Header() {
  return (
    <header className="app-header">
      <div className="brand-block">
        <img
          src="./riscv_logo.png"
          alt="RISC-V"
          className="title-logo"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <span className="brand-divider" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="page-title">RISC-V Technical Committee Dashboard</h1>
          <p className="app-subtitle">Every RISC-V technical group, its leadership, governing committee and history.</p>
        </div>
      </div>
      <div className="header-actions">
        <a className="btn sm link-out" href="https://riscv.github.io/adm-spec-dashboard/" target="_blank" rel="noopener noreferrer" title="RISC-V Specification Dashboard">
          <ExternalIcon />Spec Dashboard
        </a>
        <a className="btn sm link-out" href="https://riscv.github.io/adm-riscv-sde/" target="_blank" rel="noopener noreferrer" title="Specification Development Explorer">
          <ExternalIcon />Development Explorer
        </a>
      </div>
    </header>
  )
}

// Tab Button Component
function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`view-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      title={children}
    >
      {icon}
      <span className="tab-text">{children}</span>
    </button>
  )
}

// Search Box Component
function SearchBox({ value, onChange, onClear }) {
  return (
    <label className="search-shell">
      <SearchIcon />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by issue, summary, chair, or committee..."
        className="search-input"
        aria-label="Search technical committees"
      />
      {value && (
        <button type="button" onClick={onClear} className="clear-btn" title="Clear search" aria-label="Clear search">
          <CloseIcon />
        </button>
      )}
    </label>
  )
}

// Dropdown menu: a firm toggle button with a panel of choices.
function Menu({ label, badge, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className={`btn sm firm menu-toggle ${badge ? 'has-badge' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
        {label}{badge ? <span className="menu-badge">{badge}</span> : null}<ChevronIcon />
      </button>
      {open && (
        <div className="menu-panel" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

// Build Jira issue URL
function buildJiraUrl(issueKey) {
  return `https://riscv.atlassian.net/browse/${issueKey}`
}

// Table Row Component
function IssueRow({ row, showEmails }) {
  const mailto = buildMailtoLink(row)
  const jiraUrl = buildJiraUrl(row['Issue'])

  const hasResources = row['Charter'] || row['Confluence Space'] || row['Mailing List'] || row['Meeting Notes'] || row['Participation & Voting Rights']

  return (
    <tr className="row-hover">
      <td className="!pl-6 sm:!pl-8 !pr-4 !py-3 min-w-[260px]">
        <a
          href={row['Confluence Space'] || jiraUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand hover:text-brand-hover hover:underline"
        >
          {row['Summary']}
        </a>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <StatusBadge status={row['Status']} />
          <YearsActiveBadge creationDate={row['Creation Date']} />
          <ActivityBadge level={row['Activity Level']} />
        </div>
        {hasResources && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <ResourceLink href={row['Charter']} label="Charter" />
            <ResourceLink href={jiraUrl} label="Details" />
            <ResourceLink href={row['Mailing List']} label="Mailing List" />
            <ResourceLink href={row['Meeting Notes']} label="Meeting Notes" />
            <ResourceLink href={row['Participation & Voting Rights']} label="Participants & Voters" />
          </div>
        )}
      </td>
      <td className="!py-3">
        {row['Chair'] && (
          <div>
            <div className="font-medium text-ink">{row['Chair']}</div>
            {row['Chair Affiliation'] && (
              <div className="text-xs text-muted">{row['Chair Affiliation']}</div>
            )}
            {showEmails && row['Chair Email'] && (
              <div className="text-xs text-muted">{row['Chair Email']}</div>
            )}
          </div>
        )}
      </td>
      <td className="!py-3">
        {row['Vice-Chair'] && (
          <div>
            <div className="font-medium text-ink">{row['Vice-Chair']}</div>
            {row['Vice-Chair Affiliation'] && (
              <div className="text-xs text-muted">{row['Vice-Chair Affiliation']}</div>
            )}
            {showEmails && row['Vice-Chair Email'] && (
              <div className="text-xs text-muted">{row['Vice-Chair Email']}</div>
            )}
          </div>
        )}
      </td>
      <td className="!py-3">
        <GoverningCommitteePill row={row} />
      </td>
      {showEmails && (
        <td className="!py-3">
          {row['Linked Issue Chair'] && (
            <div>
              <div className="font-medium text-ink">{row['Linked Issue Chair']}</div>
              {row['Linked Issue Chair Affiliation'] && (
                <div className="text-xs text-muted">{row['Linked Issue Chair Affiliation']}</div>
              )}
              {row['Linked Issue Chair Email'] && (
                <div className="text-xs text-muted">{row['Linked Issue Chair Email']}</div>
              )}
            </div>
          )}
        </td>
      )}
      {showEmails && (
        <td className="!py-3">
          {row['Linked Issue Vice-Chair'] && (
            <div>
              <div className="font-medium text-ink">{row['Linked Issue Vice-Chair']}</div>
              {row['Linked Issue Vice-Chair Affiliation'] && (
                <div className="text-xs text-muted">{row['Linked Issue Vice-Chair Affiliation']}</div>
              )}
              {row['Linked Issue Vice-Chair Email'] && (
                <div className="text-xs text-muted">{row['Linked Issue Vice-Chair Email']}</div>
              )}
            </div>
          )}
        </td>
      )}
      {showEmails && (
        <td className="!py-3">
          {mailto ? (
            <a
              href={mailto}
              className="btn sm link-out"
            >
              <MailIcon />
              <span className="hidden lg:inline">Email</span>
            </a>
          ) : (
            <span className="text-muted text-sm">No email</span>
          )}
        </td>
      )}
      <td className="!py-3 !px-3">
        <div className="flex items-center gap-1.5">
          <CopyButton row={row} showEmails={showEmails} />
          {mailto && (
            <a
              href={mailto}
              className="icon-btn"
              title="Email chairs"
            >
              <SendIcon />
            </a>
          )}
        </div>
      </td>
    </tr>
  )
}

// Group Header Component
function GroupHeader({ title, count, showEmails }) {
  return (
    <tr className="group-row">
      <td colSpan={showEmails ? 8 : 5}>
        <span className={`legend-dot inline-block align-middle mr-2 ${committeeTypeClass(title)}`} aria-hidden="true" />
        <span className="font-semibold text-brand">{title}</span>
        <span className="ml-2 text-xs font-medium text-muted">({count} Technical Committee{count !== 1 ? 's' : ''})</span>
      </td>
    </tr>
  )
}

// Table View Component
function TableView({ data, showEmails, search }) {
  const [typeFilter, setTypeFilter] = useState(null)

  const filteredByType = useMemo(() => {
    if (!typeFilter) return data
    return data.filter(row => {
      const status = row['Status']
      const type = groupType(row)
      if (['TG', 'SIG', 'HC', 'IC'].includes(typeFilter)) return type === typeFilter
      if (typeFilter === 'Proposing') return status === 'Proposing'
      if (typeFilter === 'Structuring') return status === 'Structuring and Chartering'
      return true
    })
  }, [data, typeFilter])

  // Group by Linked Issue Summary
  const grouped = filteredByType.reduce((acc, row) => {
    const group = row['Linked Issue Summary'] || 'No Governing Committee'
    if (!acc[group]) acc[group] = []
    acc[group].push(row)
    return acc
  }, {})

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    if (a === 'Technical Steering Committee (TSC)') return -1
    if (b === 'Technical Steering Committee (TSC)') return 1
    return a.localeCompare(b)
  })

  const filterButtons = [
    { key: null, label: 'All' },
    { key: 'TG', label: 'Task Groups' },
    { key: 'SIG', label: 'Special Interest Groups' },
    { key: 'HC', label: 'Horizontal Committees' },
    { key: 'IC', label: 'ISA Committees' },
    { key: 'Proposing', label: 'Proposing' },
    { key: 'Structuring', label: 'Structuring & Chartering' },
  ]

  const current = filterButtons.find(btn => btn.key === typeFilter) || filterButtons[0]

  return (
    <div>
      <div className="toolbar">
        <h2 className="card-title">Technical Committees</h2>
        {search.resultCount !== null && (
          <span className="count-chip strong" title={`Showing ${search.resultCount} Technical Committee${search.resultCount !== 1 ? 's' : ''}`}>
            {search.resultCount}
          </span>
        )}
        <SearchBox value={search.value} onChange={search.onChange} onClear={search.onClear} />
        <Menu label={`Filter: ${current.label}`} badge={typeFilter ? 1 : 0}>
          <div className="menu-label">Group type</div>
          {filterButtons.slice(0, 5).map(btn => (
            <button key={btn.label} type="button" role="menuitemradio" aria-checked={typeFilter === btn.key} className={`menu-item ${typeFilter === btn.key ? 'is-active' : ''}`} onClick={() => setTypeFilter(btn.key)}>
              {btn.key && <span className={`legend-dot t-${btn.key.toLowerCase()}`} aria-hidden="true" />}
              {btn.label}
            </button>
          ))}
          <div className="menu-sep" />
          <div className="menu-label">Status</div>
          {filterButtons.slice(5).map(btn => (
            <button key={btn.label} type="button" role="menuitemradio" aria-checked={typeFilter === btn.key} className={`menu-item ${typeFilter === btn.key ? 'is-active' : ''}`} onClick={() => setTypeFilter(btn.key)}>
              {btn.label}
            </button>
          ))}
        </Menu>
        {typeFilter && (
          <span className="text-xs text-muted">
            {countDistinct(filteredByType)} of {countDistinct(data)} groups
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-muted border border-line mb-4">
            <SearchIcon />
          </div>
          <p className="text-base">No results found for your search.</p>
        </div>
      ) : (
      <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="!pl-6 sm:!pl-8">Technical Committee</th>
            <th>Chair</th>
            <th>Vice-Chair</th>
            <th>Governing Committee</th>
            {showEmails && <th>Committee Chair</th>}
            {showEmails && <th>Committee Vice-Chair</th>}
            {showEmails && <th>Action</th>}
            <th className="w-10"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map(group => (
            <GroupedRows key={group} group={group} rows={grouped[group]} showEmails={showEmails} />
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
  )
}

function GroupedRows({ group, rows, showEmails }) {
  const sortedRows = [...rows].sort((a, b) =>
    (a['Summary'] || '').localeCompare(b['Summary'] || '')
  )
  return (
    <>
      <GroupHeader title={group} count={sortedRows.length} showEmails={showEmails} />
      {sortedRows.map((row, idx) => (
        <IssueRow key={`${row['Issue']}-${idx}`} row={row} showEmails={showEmails} />
      ))}
    </>
  )
}

// Hierarchy Explorer Component
function GraphView({ data, initialViewMode = 'graph', onViewModeChange }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const [viewMode, setViewModeState] = useState(initialViewMode)
  const setViewMode = (mode) => {
    setViewModeState(mode)
    if (onViewModeChange) onViewModeChange(mode)
  }
  const zoomRef = useRef(null)

  // Same values as the --type-* tokens in index.css (d3 needs literal colours).
  const colorScale = {
    'TSC': '#283272',
    'IC': '#7c5cc4',
    'HC': '#3b82b6',
    'TG': '#1f9d74',
    'SIG': '#d08a14',
  }

  const sizeScale = {
    'TSC': 30,
    'HC': 22,
    'IC': 22,
    'TG': 14,
    'SIG': 14,
  }

  const buildHierarchy = useCallback((data) => {
    const nodes = new Map()
    const links = []
    const linkSet = new Set() // Prevent duplicate links

    // Create TSC as root
    const tscNode = {
      id: 'TSC',
      name: 'Technical Steering Committee (TSC)',
      type: 'TSC',
      chair: '',
      chairEmail: '',
      viceChair: '',
      viceChairEmail: '',
    }
    nodes.set('TSC', tscNode)

    // First pass: collect all unique committees (HC/IC)
    const committees = new Map()
    data.forEach(row => {
      const linkedSummary = row['Linked Issue Summary']
      if (!linkedSummary) return

      // Skip if it's the TSC itself - just update TSC info
      if (linkedSummary.includes('TSC')) {
        if (row['Linked Issue Chair']) {
          tscNode.chair = row['Linked Issue Chair']
          tscNode.chairEmail = row['Linked Issue Chair Email'] || ''
          tscNode.viceChair = row['Linked Issue Vice-Chair'] || ''
          tscNode.viceChairEmail = row['Linked Issue Vice-Chair Email'] || ''
        }
        return
      }

      if (!committees.has(linkedSummary)) {
        const isHC = linkedSummary.includes('(HC)')
        const isIC = linkedSummary.includes('(IC)')

        committees.set(linkedSummary, {
          id: linkedSummary,
          name: linkedSummary,
          type: isHC ? 'HC' : (isIC ? 'IC' : 'HC'),
          chair: row['Linked Issue Chair'] || '',
          chairEmail: row['Linked Issue Chair Email'] || '',
          viceChair: row['Linked Issue Vice-Chair'] || '',
          viceChairEmail: row['Linked Issue Vice-Chair Email'] || '',
        })
      }
    })

    // Add committees to nodes and link to TSC
    committees.forEach((committee, key) => {
      nodes.set(key, committee)
      const linkKey = `TSC->${key}`
      if (!linkSet.has(linkKey)) {
        links.push({ source: 'TSC', target: key })
        linkSet.add(linkKey)
      }
    })

    // Second pass: add TGs and SIGs
    data.forEach(row => {
      const issue = row['Issue']
      const summary = row['Summary']
      const linkedSummary = row['Linked Issue Summary']

      if (!issue || !summary) return
      // Skip HC, IC, and TSC entries themselves
      if (summary.includes('(HC)') || summary.includes('(IC)') || summary.includes('TSC')) return

      const nodeId = `${issue}: ${summary}`

      if (!nodes.has(nodeId)) {
        const t = groupType(row)

        const node = {
          id: nodeId,
          issueKey: issue,
          name: summary,
          type: t === 'SIG' ? 'SIG' : 'TG',
          chair: row['Chair'] || '',
          chairEmail: row['Chair Email'] || '',
          viceChair: row['Vice-Chair'] || '',
          viceChairEmail: row['Vice-Chair Email'] || '',
        }
        nodes.set(nodeId, node)
      }

      // Create link to parent
      if (linkedSummary) {
        let parentId = linkedSummary
        // If parent is TSC, use TSC node
        if (linkedSummary.includes('TSC')) {
          parentId = 'TSC'
        }

        if (nodes.has(parentId)) {
          const linkKey = `${parentId}->${nodeId}`
          if (!linkSet.has(linkKey)) {
            links.push({ source: parentId, target: nodeId })
            linkSet.add(linkKey)
          }
        }
      }
    })

    return { nodes: Array.from(nodes.values()), links }
  }, [])

  const buildTreeData = useCallback((nodes, links) => {
    const nodeMap = new Map()
    nodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }))

    // Track which nodes already have a parent to enforce tree structure
    const hasParent = new Set()

    links.forEach(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source
      const targetId = typeof l.target === 'object' ? l.target.id : l.target
      const parent = nodeMap.get(sourceId)
      const child = nodeMap.get(targetId)
      if (parent && child && !hasParent.has(targetId)) {
        parent.children.push(child)
        hasParent.add(targetId)
      }
    })

    const root = nodeMap.get('TSC')
    if (!root) return null

    // Sort children alphabetically at every level, then clean empty arrays
    const sortAndClean = (node) => {
      if (!node.children || node.children.length === 0) {
        delete node.children
      } else {
        node.children.sort((a, b) => a.name.localeCompare(b.name))
        node.children.forEach(sortAndClean)
      }
      return node
    }
    return sortAndClean(root)
  }, [])

  useEffect(() => {
    if (!data.length || !containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = 650

    const { nodes, links } = buildHierarchy(data)

    // Clear previous content
    d3.select(container).selectAll('*').remove()

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'rounded-lg')

    svgRef.current = svg

    const g = svg.append('g')

    // Zoom behavior (shared)
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)
    zoomRef.current = zoom

    const tooltip = d3.select(tooltipRef.current)

    const attachTooltip = (selection) => {
      selection
        .on('mouseover', (event, d) => {
          tooltip.html(`
            <div class="tt-title">${d.data ? d.data.name : d.name}</div>
            ${(d.data || d).issueKey ? `<div><span class="tt-label">Issue:</span> ${(d.data || d).issueKey}</div>` : ''}
            <div><span class="tt-label">Type:</span> <span class="font-semibold">${(d.data || d).type}</span></div>
            ${(d.data || d).chair ? `<div><span class="tt-label">Chair:</span> ${(d.data || d).chair}</div>` : ''}
            ${(d.data || d).chairEmail ? `<div class="tt-sub">${(d.data || d).chairEmail}</div>` : ''}
            ${(d.data || d).viceChair ? `<div class="mt-1"><span class="tt-label">Vice-Chair:</span> ${(d.data || d).viceChair}</div>` : ''}
            ${(d.data || d).viceChairEmail ? `<div class="tt-sub">${(d.data || d).viceChairEmail}</div>` : ''}
          `)
          tooltip.style('opacity', '1')
          tooltip.style('left', (event.pageX + 15) + 'px')
          tooltip.style('top', (event.pageY - 10) + 'px')
        })
        .on('mousemove', (event) => {
          tooltip.style('left', (event.pageX + 15) + 'px')
          tooltip.style('top', (event.pageY - 10) + 'px')
        })
        .on('mouseout', () => {
          tooltip.style('opacity', '0')
        })
    }

    let simulation = null
    let zoomTimer = null

    if (viewMode === 'graph') {
      // ── Force-directed graph ──
      simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => sizeScale[d.type] + 25))

      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1.5)

      const node = g.append('g')
        .selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node cursor-pointer')
        .call(d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }))

      node.append('circle')
        .attr('r', d => sizeScale[d.type])
        .attr('fill', d => colorScale[d.type])
        .attr('stroke', '#fff')
        .attr('stroke-width', 2.5)

      node.append('text')
        .attr('dy', d => sizeScale[d.type] + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#334155')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .text(d => d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name)

      attachTooltip(node)

      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)

        node.attr('transform', d => `translate(${d.x},${d.y})`)
      })

      // Initial zoom to fit after simulation settles
      zoomTimer = setTimeout(() => {
        const bounds = g.node()?.getBBox()
        if (!bounds || (bounds.width === 0 && bounds.height === 0)) return
        const scale = 0.8 / Math.max(bounds.width / width, bounds.height / height)
        const translate = [
          width / 2 - scale * (bounds.x + bounds.width / 2),
          height / 2 - scale * (bounds.y + bounds.height / 2)
        ]
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        )
      }, 1000)

    } else if (viewMode === 'organogram') {
      // ── Organogram (horizontal tree layout, left → right, pill nodes) ──
      const treeData = buildTreeData(nodes, links)
      if (!treeData) return

      const root = d3.hierarchy(treeData)
      const pillH = 30
      const paddingX = 14
      const paddingY = 8
      // nodeSize([verticalGap, horizontalGap])
      // Wider separation for non-siblings to reduce line crossings
      const treeLayout = d3.tree()
        .nodeSize([pillH + paddingY, 280])
        .separation((a, b) => a.parent === b.parent ? 1 : 1.8)
      treeLayout(root)

      // Measure tree bounds to center it
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      root.each(d => {
        if (d.x < minX) minX = d.x
        if (d.x > maxX) maxX = d.x
        if (d.y < minY) minY = d.y
        if (d.y > maxY) maxY = d.y
      })
      const treeW = maxY - minY + 260
      const treeH = maxX - minX + pillH + paddingY
      const scale = Math.min(1, (width - 40) / treeW, (height - 40) / treeH)
      const offsetX = (width / 2 - scale * (minY + treeW / 2))
      const offsetY = (height / 2 - scale * (minX + treeH / 2))
      svg.call(zoom.transform, d3.zoomIdentity.translate(offsetX, offsetY).scale(scale))

      // Draw nodes first (to measure text), then connectors
      const node = g.append('g')
        .selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node cursor-pointer')
        .attr('transform', d => `translate(${d.y},${d.x})`)

      // Add text first so we can measure it
      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#fff')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .text(d => d.data.name.length > 30 ? d.data.name.substring(0, 27) + '...' : d.data.name)

      // Measure each text and insert a pill rect behind it
      node.each(function (d) {
        const textEl = d3.select(this).select('text')
        const bbox = textEl.node().getBBox()
        const pillW = bbox.width + paddingX * 2
        const pillHt = pillH
        // Store pill width on data for connector attachment
        d._pillW = pillW

        d3.select(this).insert('rect', 'text')
          .attr('x', -pillW / 2)
          .attr('y', -pillHt / 2)
          .attr('width', pillW)
          .attr('height', pillHt)
          .attr('rx', pillHt / 2)
          .attr('ry', pillHt / 2)
          .attr('fill', colorScale[d.data.type])
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
      })

      // Draw smooth bezier connectors (attach to pill edges)
      g.insert('g', ':first-child')
        .selectAll('path')
        .data(root.links())
        .enter()
        .append('path')
        .attr('d', d => {
          const srcX = d.source.y + (d.source._pillW || 0) / 2
          const srcY = d.source.x
          const tgtX = d.target.y - (d.target._pillW || 0) / 2
          const tgtY = d.target.x
          const midX = (srcX + tgtX) / 2
          return `M${srcX},${srcY} C${midX},${srcY} ${midX},${tgtY} ${tgtX},${tgtY}`
        })
        .attr('fill', 'none')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1.5)

      attachTooltip(node)

    } else if (viewMode === 'techorg') {
      // ── Technical Organization (governance structure diagram) ──
      const jiraBase = 'https://riscv.atlassian.net/browse/'
      // Design tokens: surface, brand, text, brand-soft hover.
      const orgBoxFill = '#ffffff'
      const orgStroke = '#283272'
      const orgText = '#0f172a'
      const orgHover = '#eef0f8'
      const orgFontSize = '13px'
      const orgFontFamily = 'Inter, system-ui, -apple-system, sans-serif'

      // Jira key mappings for clickable boxes
      const jiraKeys = {
        'tsc': 'RVG-115',
        'apps_tools_hc': 'RVG-4',
        'priv_sw_hc': 'RVG-39',
        'security_hc': 'RVG-68',
        'technology_hc': 'RVG-104',
        'soc_infra_hc': 'RVG-88',
        'isa_infra_hc': 'RVG-32',
        'priv_spec_ic': 'RVG-59',
        'unpriv_spec_ic': 'RVG-122',
        'arch_review': 'RVG-476',
      }

      // Build lookup: Jira key → leadership info from the CSV data
      // The CSV has rows for TGs/SIGs; their "Linked Issue" fields contain parent HC/IC info.
      // We also check the Issue field directly for committees that appear as rows themselves.
      const orgInfo = {}

      // First, index rows by their own Issue key (covers HC/IC/TG rows that exist directly)
      data.forEach(row => {
        const issueKey = row['Issue']
        if (issueKey && !orgInfo[issueKey]) {
          orgInfo[issueKey] = {
            chair: row['Chair'] || '',
            chairAffiliation: row['Chair Affiliation'] || '',
            viceChair: row['Vice-Chair'] || '',
            viceChairAffiliation: row['Vice-Chair Affiliation'] || '',
            status: row['Status'] || '',
            summary: row['Summary'] || '',
          }
        }
      })

      // Second, fill in from Linked Issue fields (parent committees may not appear as direct rows)
      // Map linked summary patterns → Jira keys so we can associate leadership data
      const linkedSummaryToKey = {
        'Technical Steering Committee (TSC)': 'RVG-115',
        'Applications & Tools (HC)': 'RVG-4',
        'Privileged Software (HC)': 'RVG-39',
        'Security (HC)': 'RVG-68',
        'Technology (HC)': 'RVG-104',
        'SOC Infrastructure (HC)': 'RVG-88',
        'ISA Infrastructure (HC)': 'RVG-32',
        'Privileged ISA Committee (IC)': 'RVG-59',
        'Unprivileged ISA Committee (IC)': 'RVG-122',
        'Architecture Review': 'RVG-476',
      }
      data.forEach(row => {
        const linkedSummary = row['Linked Issue Summary']
        if (!linkedSummary) return
        const mappedKey = linkedSummaryToKey[linkedSummary]
        if (mappedKey && !orgInfo[mappedKey]) {
          orgInfo[mappedKey] = {
            chair: row['Linked Issue Chair'] || '',
            chairAffiliation: row['Linked Issue Chair Affiliation'] || '',
            viceChair: row['Linked Issue Vice-Chair'] || '',
            viceChairAffiliation: row['Linked Issue Vice-Chair Affiliation'] || '',
            status: '',
            summary: linkedSummary,
          }
        }
      })

      // Helper to get display info for a Jira key
      const getInfo = (jiraKey) => orgInfo[jiraKey] || null

      // Fit-to-screen will be applied after all elements are drawn

      // Helper: draw a box (optionally clickable via jiraKey, with tooltip from data)
      const drawBox = (x, y, w, h, label, jiraKey, opts = {}) => {
        const clickUrl = jiraKey ? jiraBase + jiraKey : opts.url || null
        const group = g.append('g').attr('class', clickUrl ? 'cursor-pointer' : '')
        const info = jiraKey ? getInfo(jiraKey) : null

        if (clickUrl && !jiraKey) {
          group.on('click', () => window.open(clickUrl, '_blank'))
          group.on('mouseover', function() {
            d3.select(this).select('rect').attr('fill', orgHover)
          })
          group.on('mouseout', function() {
            d3.select(this).select('rect').attr('fill', orgBoxFill)
          })
        }
        if (jiraKey) {
          group.on('click', () => window.open(clickUrl, '_blank'))
          group.on('mouseover', function(event) {
            d3.select(this).select('rect').attr('fill', orgHover)
            // Show tooltip with leadership info
            let html = `<div class="tt-title" style="margin-bottom:2px">${label}</div>`
            html += `<div class="tt-sub mb-2">${jiraKey}</div>`
            if (info) {
              if (info.chair) {
                html += `<div><span class="tt-label">Chair:</span> ${info.chair}</div>`
                if (info.chairAffiliation) html += `<div class="tt-sub ml-2">${info.chairAffiliation}</div>`
              }
              if (info.viceChair) {
                html += `<div class="mt-1"><span class="tt-label">Vice-Chair:</span> ${info.viceChair}</div>`
                if (info.viceChairAffiliation) html += `<div class="tt-sub ml-2">${info.viceChairAffiliation}</div>`
              }
              if (!info.chair && !info.viceChair) {
                html += `<div class="tt-sub italic">No leadership data available</div>`
              }
            }
            tooltip.html(html)
            tooltip.style('opacity', '1')
            tooltip.style('left', (event.pageX + 15) + 'px')
            tooltip.style('top', (event.pageY - 10) + 'px')
          })
          group.on('mousemove', function(event) {
            tooltip.style('left', (event.pageX + 15) + 'px')
            tooltip.style('top', (event.pageY - 10) + 'px')
          })
          group.on('mouseout', function() {
            d3.select(this).select('rect').attr('fill', orgBoxFill)
            tooltip.style('opacity', '0')
          })
        }

        group.append('rect')
          .attr('x', x).attr('y', y).attr('width', w).attr('height', h)
          .attr('fill', orgBoxFill)
          .attr('stroke', orgStroke)
          .attr('stroke-width', 1)
          .attr('rx', 6)

        const fontSize = opts.fontSize || orgFontSize
        const fontWeight = opts.fontWeight || '600'
        const textY = opts.vertical ? undefined : y + h / 2

        if (opts.vertical) {
          group.append('text')
            .attr('x', x + w / 2)
            .attr('y', y + h / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', fontSize)
            .attr('font-weight', fontWeight)
            .attr('fill', orgText)
            .attr('font-family', orgFontFamily)
            .attr('transform', `rotate(-90, ${x + w / 2}, ${y + h / 2})`)
            .text(label)

          // Chair/Vice-Chair horizontal text near bottom of vertical box
          if (info && info.chair) {
            group.append('text')
              .attr('x', x + w / 2)
              .attr('y', y + h - 28)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'central')
              .attr('font-size', '9px')
              .attr('font-weight', '400')
              .attr('fill', '#475569')
              .attr('font-family', orgFontFamily)
              .text(`Chair: ${info.chair}${info.chairAffiliation ? ' (' + info.chairAffiliation + ')' : ''}`)
          }
          if (info && info.viceChair) {
            group.append('text')
              .attr('x', x + w / 2)
              .attr('y', y + h - 14)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'central')
              .attr('font-size', '9px')
              .attr('font-weight', '400')
              .attr('fill', '#64748b')
              .attr('font-family', orgFontFamily)
              .text(`Vice-Chair: ${info.viceChair}${info.viceChairAffiliation ? ' (' + info.viceChairAffiliation + ')' : ''}`)
          }
        } else {
          const hasLeadership = info && (info.chair || info.viceChair)
          // Shift label up if we have leadership info to show
          group.append('text')
            .attr('x', x + w / 2)
            .attr('y', hasLeadership ? y + h / 2 - 12 : y + h / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', fontSize)
            .attr('font-weight', fontWeight)
            .attr('fill', orgText)
            .attr('font-family', orgFontFamily)
            .text(label)

          // Show Chair and Vice-Chair below the label
          if (info && info.chair) {
            group.append('text')
              .attr('x', x + w / 2)
              .attr('y', y + h / 2 + 2)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'central')
              .attr('font-size', '10px')
              .attr('font-weight', '400')
              .attr('fill', '#475569')
              .attr('font-family', orgFontFamily)
              .text(`Chair: ${info.chair}${info.chairAffiliation ? ' (' + info.chairAffiliation + ')' : ''}`)
          }
          if (info && info.viceChair) {
            group.append('text')
              .attr('x', x + w / 2)
              .attr('y', y + h / 2 + 14)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'central')
              .attr('font-size', '10px')
              .attr('font-weight', '400')
              .attr('fill', '#64748b')
              .attr('font-family', orgFontFamily)
              .text(`Vice-Chair: ${info.viceChair}${info.viceChairAffiliation ? ' (' + info.viceChairAffiliation + ')' : ''}`)
          }
        }

        return group
      }

      // Layout constants — nested container approach
      const pad = 15           // padding inside each container
      const hcBoxH = 52       // HC box height (fits Chair + Vice-Chair)
      const hcGap = 6
      const staffW = 120

      // Pre-calculate inner content height
      const hcCount = 6
      const contentH = hcCount * (hcBoxH + hcGap) - hcGap  // HC stack height

      // TSC inner area
      const tscInnerH = contentH + 90  // room for Arch Profiles row + HC/IC area
      const tscPad = pad

      // Nesting dimensions (outside-in)
      const bodX = 40
      const bodY = 55
      const bodW = 1100
      const bodH = tscInnerH + 2 * pad + 30 + 2 * tscPad  // TSC height + BoD label + padding

      // Title (centered with BoD)
      g.append('text')
        .attr('x', bodX + bodW / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '22px')
        .attr('font-weight', '700')
        .attr('fill', orgText)
        .attr('font-family', orgFontFamily)
        .text('Technical Organization')

      const tscX = bodX + pad
      const tscY = bodY + 30  // below BoD label
      const tscW = bodW - 2 * pad
      const tscH = bodH - 30 - pad

      // ── Draw nested containers (back to front) ──

      // RISC-V Staff (inside BoD, right side, crossing TSC)
      const staffX = bodX + bodW - pad - staffW - 10  // inset so TSC border is visible
      const staffY = bodY + 8  // above TSC, inside BoD
      const staffH = bodH - 16  // extends past TSC bottom into BoD padding

      // BoD container (outermost, clickable)
      const bodGroup = g.append('g').attr('class', 'cursor-pointer')
      bodGroup.on('click', () => window.open('https://riscv.org/about/board/', '_blank'))
      bodGroup.on('mouseover', function() { d3.select(this).select('rect').attr('fill', orgHover) })
      bodGroup.on('mouseout', function() { d3.select(this).select('rect').attr('fill', 'none') })
      bodGroup.append('rect')
        .attr('x', bodX).attr('y', bodY).attr('width', bodW).attr('height', bodH)
        .attr('fill', 'none')
        .attr('stroke', orgStroke)
        .attr('stroke-width', 1.5)
        .attr('rx', 10)
      bodGroup.append('text')
        .attr('x', bodX + bodW / 2).attr('y', bodY + 16)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .attr('fill', orgText)
        .attr('font-family', orgFontFamily)
        .text('Board of Directors (BoD)')

      // TSC container (nested inside BoD)
      const tscGroup = g.append('g').attr('class', 'cursor-pointer')
      tscGroup.on('click', () => window.open('https://riscv.org/about/technical-steering-committee/', '_blank'))
      tscGroup.on('mouseover', function() { d3.select(this).select('rect').attr('fill', orgHover) })
      tscGroup.on('mouseout', function() { d3.select(this).select('rect').attr('fill', '#f8fafc') })
      tscGroup.append('rect')
        .attr('x', tscX).attr('y', tscY).attr('width', tscW).attr('height', tscH)
        .attr('fill', '#f8fafc')
        .attr('stroke', orgStroke)
        .attr('stroke-width', 1.5)
        .attr('rx', 10)

      // TSC label + leadership
      const tscInfo = getInfo(jiraKeys.tsc)
      const tscLabelGroup = tscGroup.append('g')
      tscLabelGroup.append('text')
        .attr('x', tscX + tscW / 2).attr('y', tscY + 14)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .attr('fill', orgText)
        .attr('font-family', orgFontFamily)
        .text('Technical Steering Committee (TSC)')
      if (tscInfo && tscInfo.chair) {
        tscLabelGroup.append('text')
          .attr('x', tscX + tscW / 2).attr('y', tscY + 34)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', '#475569')
          .attr('font-family', orgFontFamily)
          .text(`Chair: ${tscInfo.chair}${tscInfo.chairAffiliation ? ' (' + tscInfo.chairAffiliation + ')' : ''}${tscInfo.viceChair ? '  |  Vice-Chair: ' + tscInfo.viceChair + (tscInfo.viceChairAffiliation ? ' (' + tscInfo.viceChairAffiliation + ')' : '') : ''}`)
      }

      // RISC-V Staff (inside BoD, right side, drawn on top of TSC so it crosses it)
      drawBox(staffX, staffY, staffW, staffH, 'RISC-V Staff', null, { vertical: true, url: 'https://riscv.org/about/staff/' })

      // ── Content inside TSC ──
      const innerY = tscY + 42

      // Architecture Profiles & SW Platforms
      const subBoxW = 200
      drawBox(tscX + tscW / 2 - subBoxW - 20, innerY, subBoxW, 32, 'Architecture Profiles', null, { fontSize: '11px' })
      drawBox(tscX + tscW / 2 + 20, innerY, subBoxW, 32, 'SW Platforms', null, { fontSize: '11px' })

      // HC/IC area starts below
      const hcAreaY = innerY + 48

      // Horizontal label (rotated)
      const hcStackX = tscX + 50
      const hcBoxW = 460
      g.append('text')
        .attr('x', tscX + 18)
        .attr('y', hcAreaY + contentH / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '13px')
        .attr('font-weight', '700')
        .attr('fill', orgText)
        .attr('font-family', orgFontFamily)
        .attr('transform', `rotate(-90, ${tscX + 18}, ${hcAreaY + contentH / 2})`)
        .text('Horizontal Committees')

      // HC stack (6 boxes)
      const hcItems = [
        { label: 'Applications & Tools HC', key: jiraKeys.apps_tools_hc },
        { label: 'Privileged Software HC', key: jiraKeys.priv_sw_hc },
        { label: 'Security HC', key: jiraKeys.security_hc },
        { label: 'Technology HC', key: jiraKeys.technology_hc },
        { label: 'SOC Infrastructure HC', key: jiraKeys.soc_infra_hc },
        { label: 'ISA Infrastructure HC', key: jiraKeys.isa_infra_hc },
      ]
      hcItems.forEach((item, i) => {
        drawBox(hcStackX, hcAreaY + i * (hcBoxH + hcGap), hcBoxW, hcBoxH, item.label, item.key)
      })

      // IC columns (inside TSC, right side)
      const icX = hcStackX + hcBoxW + 20
      const icW = 190
      const icGap = 16
      const uicX = icX + icW + icGap
      const icH = contentH

      drawBox(icX, hcAreaY, icW, icH, 'Privileged Spec IC', jiraKeys.priv_spec_ic, { vertical: true })
      drawBox(uicX, hcAreaY, icW, icH, 'Unprivileged Spec IC', jiraKeys.unpriv_spec_ic, { vertical: true })

      // Architecture Review (inside IC area, drawn on top)
      const arW = uicX + icW - icX - 16
      const arY = hcAreaY + 35
      drawBox(icX + 8, arY, arW, 38, 'Architecture Review', jiraKeys.arch_review, { fontSize: '11px' })

      // Connector bars (dashed lines from HC boxes toward Staff column)
      const connectorG = g.append('g')
      hcItems.forEach((_, i) => {
        const barY = hcAreaY + i * (hcBoxH + hcGap) + hcBoxH / 2
        connectorG.append('line')
          .attr('x1', hcStackX + hcBoxW)
          .attr('y1', barY)
          .attr('x2', staffX)
          .attr('y2', barY)
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,3')
      })

      // Fit diagram to container based on actual rendered bounding box
      const bbox = g.node().getBBox()
      const padFit = 20
      const fitScale = Math.min(
        (width - padFit * 2) / bbox.width,
        (height - padFit * 2) / bbox.height
      )
      const fitX = (width - bbox.width * fitScale) / 2 - bbox.x * fitScale
      const fitY = (height - bbox.height * fitScale) / 2 - bbox.y * fitScale
      const fitTransform = d3.zoomIdentity.translate(fitX, fitY).scale(fitScale)
      svg.call(zoom.transform, fitTransform)

      // Store fit transform so Reset View can restore it
      zoomRef.current._fitTransform = fitTransform
    }

    // Cleanup: stop simulation and clear pending timers when deps change
    return () => {
      if (simulation) simulation.stop()
      if (zoomTimer) clearTimeout(zoomTimer)
    }

  }, [data, viewMode, buildHierarchy, buildTreeData])

  return (
    <div className="relative">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="seg" role="group" aria-label="Hierarchy view">
          <button type="button" onClick={() => setViewMode('graph')} className={viewMode === 'graph' ? 'is-active' : ''} aria-pressed={viewMode === 'graph'}>Graph</button>
          <button type="button" onClick={() => setViewMode('organogram')} className={viewMode === 'organogram' ? 'is-active' : ''} aria-pressed={viewMode === 'organogram'}>Organogram</button>
          <button type="button" onClick={() => setViewMode('techorg')} className={viewMode === 'techorg' ? 'is-active' : ''} aria-pressed={viewMode === 'techorg'}>Tech Org</button>
        </div>

        <span className="w-px h-6 bg-line hidden sm:block" aria-hidden="true" />

        <button
          type="button"
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              svgRef.current.transition().call(zoomRef.current.scaleBy, 1.3)
            }
          }}
          className="btn sm firm"
        >
          + Zoom In
        </button>
        <button
          type="button"
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              svgRef.current.transition().call(zoomRef.current.scaleBy, 0.7)
            }
          }}
          className="btn sm firm"
        >
          - Zoom Out
        </button>
        <button
          type="button"
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              const resetTransform = zoomRef.current._fitTransform || d3.zoomIdentity
              svgRef.current.transition().call(zoomRef.current.transform, resetTransform)
            }
          }}
          className="btn sm firm"
        >
          Reset View
        </button>

        <div className="flex-1" />

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          {[['tsc', 'TSC'], ['ic', 'IC'], ['hc', 'HC'], ['tg', 'TG'], ['sig', 'SIG']].map(([k, label]) => (
            <span key={k} className={`inline-flex items-center gap-1.5 t-${k}`}>
              <span className="legend-dot" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="canvas"
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="tooltip-card opacity-0 transition-opacity"
        style={{ left: 0, top: 0 }}
      />
    </div>
  )
}

// Footer Component
function Footer() {
  return (
    <footer className="app-footer">
      RISC-V Technical Committee Dashboard. Data from the RVG and RVC projects in RISC-V Jira.
    </footer>
  )
}

// Main App Component
function App() {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState(() => {
    const search = window.location.search
    if (search.includes('committees')) return 'table'
    if (search.includes('hierarchy') || search.includes('organogram') || search.includes('techorg')) return 'graph'
    if (search.includes('statistics')) return 'stats'
    if (search.includes('trend') || search.includes('history')) return 'trend' // ?history is the tab's current name
    return 'table'
  })
  const [graphViewMode, setGraphViewMode] = useState(() => {
    const search = window.location.search
    if (search.includes('organogram')) return 'organogram'
    if (search.includes('techorg')) return 'techorg'
    return 'graph'
  })

  useEffect(() => {
    const handlePopState = () => {
      const search = window.location.search
      if (search.includes('committees')) setActiveTab('table')
      else if (search.includes('organogram')) { setActiveTab('graph'); setGraphViewMode('organogram') }
      else if (search.includes('techorg')) { setActiveTab('graph'); setGraphViewMode('techorg') }
      else if (search.includes('hierarchy')) { setActiveTab('graph'); setGraphViewMode('graph') }
      else if (search.includes('statistics')) setActiveTab('stats')
      else if (search.includes('trend') || search.includes('history')) setActiveTab('trend')
      else setActiveTab('table')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let queryParam = ''
    switch (activeTab) {
      case 'table': queryParam = '?committees'; break;
      case 'graph':
        if (graphViewMode === 'organogram') queryParam = '?organogram'
        else if (graphViewMode === 'techorg') queryParam = '?techorg'
        else queryParam = '?hierarchy'
        break;
      case 'stats': queryParam = '?statistics'; break;
      case 'trend': queryParam = '?history'; break;
      default: queryParam = '?committees';
    }

    if (window.location.search !== queryParam) {
      const newUrl = window.location.pathname + queryParam
      window.history.pushState(null, '', newUrl)
    }
  }, [activeTab, graphViewMode])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('./rvg-grouped.csv')
        if (!response.ok) throw new Error('Failed to load data')
        const text = await response.text()
        const parsed = parseCSV(text)
        setData(parsed)
        setFilteredData(parsed)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(data)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = data.filter(row => {
      return (
        (row['Issue'] || '').toLowerCase().includes(term) ||
        (row['Summary'] || '').toLowerCase().includes(term) ||
        (row['Chair'] || '').toLowerCase().includes(term) ||
        (row['Vice-Chair'] || '').toLowerCase().includes(term) ||
        (row['Linked Issue Summary'] || '').toLowerCase().includes(term) ||
        (row['Linked Issue Chair'] || '').toLowerCase().includes(term)
      )
    })
    setFilteredData(filtered)
  }, [searchTerm, data])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="page flex-1">
      <Header />

      {/* Tab Navigation */}
      <nav className="view-tabs" aria-label="Views">
        <TabButton
          active={activeTab === 'table'}
          onClick={() => setActiveTab('table')}
          icon={<TableIcon />}
        >
          Technical Committees
        </TabButton>
        <TabButton
          active={activeTab === 'graph'}
          onClick={() => setActiveTab('graph')}
          icon={<GraphIcon />}
        >
          Hierarchy Explorer
        </TabButton>
        <TabButton
          active={activeTab === 'stats'}
          onClick={() => setActiveTab('stats')}
          icon={<ChartIcon />}
        >
          Statistics
        </TabButton>
        <TabButton
          active={activeTab === 'trend'}
          onClick={() => setActiveTab('trend')}
          icon={<TrendIcon />}
        >
          History
        </TabButton>
      </nav>

      {/* Main Content */}
      <main className="w-full">
        {loading ? (
          <div className="card p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-9 w-9 border-[3px] border-brand border-t-transparent mb-4" />
            <p className="text-muted">Loading data...</p>
          </div>
        ) : error ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 bg-bad-bg text-bad rounded-full flex items-center justify-center mx-auto mb-4">
              <CloseIcon />
            </div>
            <p className="text-bad font-semibold">Error loading data</p>
            <p className="text-muted text-sm mt-2">{error}</p>
          </div>
        ) : (
          <>
            {activeTab === 'table' && (
              <div className="card">
                <TableView
                  data={filteredData.filter(row => ['Active', 'Proposing', 'Structuring and Chartering'].includes(row['Status']))}
                  showEmails={SHOW_EMAILS}
                  search={{
                    value: searchTerm,
                    onChange: setSearchTerm,
                    onClear: () => setSearchTerm(''),
                    resultCount: countDistinct(filteredData.filter(row => ['Active', 'Proposing', 'Structuring and Chartering'].includes(row['Status']))),
                  }}
                />
              </div>
            )}
            {activeTab === 'graph' && (
              <div className="card p-4 sm:p-5">
                <GraphView data={data.filter(row => row['Status'] === 'Active')} initialViewMode={graphViewMode} onViewModeChange={setGraphViewMode} />
              </div>
            )}
            {activeTab === 'stats' && <StatisticsView rows={data} />}
            {activeTab === 'trend' && <HistoryView rows={data} />}
          </>
        )}
      </main>
      </div>

      <Footer />
    </div>
  )
}

export default App
