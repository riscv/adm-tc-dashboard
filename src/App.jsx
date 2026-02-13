import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as d3 from 'd3'

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
      className="inline-flex items-center gap-1 text-xs text-berkeley-blue-light hover:text-california-gold transition-colors"
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
  const colors = {
    'Active': 'bg-green-100 text-green-700',
    'Inactive': 'bg-gray-100 text-gray-600',
    'Archived': 'bg-gray-100 text-gray-500',
    'Proposing': 'bg-orange-100 text-orange-700',
    'Structuring and Chartering': 'bg-blue-100 text-blue-700',
  }
  const colorClass = colors[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${colorClass}`}>
      {status}
    </span>
  )
}

// Activity level badge component
function ActivityBadge({ level }) {
  if (!level) return null
  const colors = {
    'High': 'bg-green-100 text-green-700',
    'Medium': 'bg-yellow-100 text-yellow-700',
    'Low': 'bg-orange-100 text-orange-700',
    'Inactive': 'bg-gray-100 text-gray-500',
  }
  const colorClass = colors[level] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${colorClass}`}>
      {level}
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
    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-berkeley-blue/10 text-berkeley-blue">
      {years < 1 ? `${Math.round(years * 12)}mo` : `${years}y`}
    </span>
  )
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
        className="inline-block px-3 py-1 bg-berkeley-blue/10 text-berkeley-blue text-sm rounded-full font-medium cursor-pointer hover:bg-berkeley-blue/20 transition-colors whitespace-nowrap"
      >
        {row['Linked Issue Summary']}
      </span>
      {showTooltip && hasDetails && (
        <div
          className="fixed z-[100] w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 text-sm"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          <div className="font-semibold text-berkeley-blue mb-3">{row['Linked Issue Summary']}</div>

          {row['Linked Issue Chair'] && (
            <div className="mb-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Chair</div>
              <div className="font-medium text-gray-800">{row['Linked Issue Chair']}</div>
              {row['Linked Issue Chair Affiliation'] && (
                <div className="text-xs text-gray-500">{row['Linked Issue Chair Affiliation']}</div>
              )}
            </div>
          )}

          {row['Linked Issue Vice-Chair'] && (
            <div className="mb-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Vice-Chair</div>
              <div className="font-medium text-gray-800">{row['Linked Issue Vice-Chair']}</div>
              {row['Linked Issue Vice-Chair Affiliation'] && (
                <div className="text-xs text-gray-500">{row['Linked Issue Vice-Chair Affiliation']}</div>
              )}
            </div>
          )}

          {row['Linked Issue Mailing List'] && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <a
                href={row['Linked Issue Mailing List']}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-berkeley-blue-light hover:text-california-gold"
              >
                <LinkIcon />
                <span>Mailing List</span>
              </a>
            </div>
          )}

          {row['Linked Issue Participation & Voting Rights'] && (
            <div className={row['Linked Issue Mailing List'] ? "mt-2" : "mt-3 pt-2 border-t border-gray-100"}>
              <a
                href={row['Linked Issue Participation & Voting Rights']}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-berkeley-blue-light hover:text-california-gold"
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
    if (row['Activity Level']) text += `Activity Level: ${row['Activity Level']}\n`
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
      className={`p-1.5 rounded transition-colors ${copied ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-berkeley-blue hover:bg-gray-100'}`}
      title="Copy row data"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

// Parse CSV
function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = parseCSVLine(lines[0])
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }
  return data
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
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
  if (row['Activity Level']) body += `Activity Level: ${row['Activity Level'].replace(/🔵|🟡|🔴/g, '').trim()}\n`
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
    <header className="bg-gray-50 border-b-4 border-california-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-4">
          <img
            src="./riscv_logo.png"
            alt="RISC-V Logo"
            className="h-10 w-auto"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-berkeley-blue">
              Tech Committees Explorer
            </h1>
            <p className="text-gray-600 text-sm hidden sm:block">
              Explore all Technical Committees at RISC-V International
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

// Tab Button Component
function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-medium transition-all relative
        ${active
          ? 'text-california-gold'
          : 'text-berkeley-blue-light hover:text-white'
        }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-1 bg-california-gold rounded-t-full" />
      )}
    </button>
  )
}

// Search Box Component
function SearchBox({ value, onChange, onClear, resultCount }) {
  return (
    <div className="relative max-w-xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by issue, summary, chair, or committee..."
          className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-200 rounded-full
                     focus:border-california-gold focus:ring-4 focus:ring-california-gold/20
                     outline-none transition-all text-gray-800 placeholder-gray-400"
        />
        {value && (
          <button
            onClick={onClear}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <CloseIcon />
          </button>
        )}
      </div>
      <div className="text-center mt-2 text-sm text-gray-500">
        {resultCount !== null && (
          <span>
            Showing <span className="font-semibold text-berkeley-blue">{resultCount}</span> Technical Committee{resultCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
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
    <tr className="hover:bg-california-gold/5 transition-colors">
      <td className="pl-10 pr-4 py-4">
        <a
          href={row['Confluence Space'] || jiraUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-berkeley-blue hover:text-california-gold transition-colors hover:underline"
        >
          {row['Summary']}
        </a>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={row['Status']} />
          <YearsActiveBadge creationDate={row['Creation Date']} />
          <ActivityBadge level={row['Activity Level']} />
        </div>
        {hasResources && (
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <ResourceLink href={row['Charter']} label="Charter" />
            <ResourceLink href={jiraUrl} label="Details" />
            <ResourceLink href={row['Mailing List']} label="Mailing List" />
            <ResourceLink href={row['Meeting Notes']} label="Meeting Notes" />
            <ResourceLink href={row['Participation & Voting Rights']} label="Participants & Voters" />
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        {row['Chair'] && (
          <div>
            <div className="font-medium text-gray-800">{row['Chair']}</div>
            {row['Chair Affiliation'] && (
              <div className="text-xs text-gray-500">{row['Chair Affiliation']}</div>
            )}
            {showEmails && row['Chair Email'] && (
              <div className="text-xs text-gray-400">{row['Chair Email']}</div>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        {row['Vice-Chair'] && (
          <div>
            <div className="font-medium text-gray-800">{row['Vice-Chair']}</div>
            {row['Vice-Chair Affiliation'] && (
              <div className="text-xs text-gray-500">{row['Vice-Chair Affiliation']}</div>
            )}
            {showEmails && row['Vice-Chair Email'] && (
              <div className="text-xs text-gray-400">{row['Vice-Chair Email']}</div>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        <GoverningCommitteePill row={row} />
      </td>
      {showEmails && (
        <td className="px-4 py-4">
          {row['Linked Issue Chair'] && (
            <div>
              <div className="font-medium text-gray-800">{row['Linked Issue Chair']}</div>
              {row['Linked Issue Chair Affiliation'] && (
                <div className="text-xs text-gray-500">{row['Linked Issue Chair Affiliation']}</div>
              )}
              {row['Linked Issue Chair Email'] && (
                <div className="text-xs text-gray-400">{row['Linked Issue Chair Email']}</div>
              )}
            </div>
          )}
        </td>
      )}
      {showEmails && (
        <td className="px-4 py-4">
          {row['Linked Issue Vice-Chair'] && (
            <div>
              <div className="font-medium text-gray-800">{row['Linked Issue Vice-Chair']}</div>
              {row['Linked Issue Vice-Chair Affiliation'] && (
                <div className="text-xs text-gray-500">{row['Linked Issue Vice-Chair Affiliation']}</div>
              )}
              {row['Linked Issue Vice-Chair Email'] && (
                <div className="text-xs text-gray-400">{row['Linked Issue Vice-Chair Email']}</div>
              )}
            </div>
          )}
        </td>
      )}
      {showEmails && (
        <td className="px-4 py-4">
          {mailto ? (
            <a
              href={mailto}
              className="inline-flex items-center gap-2 px-4 py-2 bg-california-gold text-berkeley-blue
                         font-medium rounded-lg hover:bg-gold-light transition-colors shadow-sm"
            >
              <MailIcon />
              <span className="hidden lg:inline">Email</span>
            </a>
          ) : (
            <span className="text-gray-400 text-sm">No email</span>
          )}
        </td>
      )}
      <td className="px-2 py-4">
        <div className="flex items-center gap-1">
          <CopyButton row={row} showEmails={showEmails} />
          {mailto && (
            <a
              href={mailto}
              className="p-1.5 rounded transition-colors text-gray-400 hover:text-berkeley-blue hover:bg-gray-100"
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
    <tr className="bg-gradient-to-r from-california-gold/20 to-california-gold/5">
      <td colSpan={showEmails ? 8 : 5} className="px-4 py-3">
        <span className="font-bold text-berkeley-blue">{title}</span>
        <span className="ml-2 text-sm text-gray-600">({count} Technical Committee{count !== 1 ? 's' : ''})</span>
      </td>
    </tr>
  )
}

// Table View Component
function TableView({ data, showEmails }) {
  const [typeFilter, setTypeFilter] = useState(null)

  const filteredByType = useMemo(() => {
    if (!typeFilter) return data
    return data.filter(row => {
      const summary = (row['Summary'] || '').trim()
      const status = row['Status']
      if (typeFilter === 'TG') return summary.endsWith('TG')
      if (typeFilter === 'SIG') return summary.endsWith('SIG')
      if (typeFilter === 'HC') return summary.includes('(HC)')
      if (typeFilter === 'IC') return summary.includes('(IC)')
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

  if (data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <SearchIcon />
        </div>
        <p className="text-gray-500 text-lg">No results found for your search.</p>
      </div>
    )
  }

  const filterButtons = [
    { key: null, label: 'All' },
    { key: 'TG', label: 'Task Groups' },
    { key: 'SIG', label: 'Special Interest Groups' },
    { key: 'HC', label: 'Horizontal Committees' },
    { key: 'IC', label: 'ISA Committees' },
    { key: 'Proposing', label: 'Proposing' },
    { key: 'Structuring', label: 'Structuring & Chartering' },
  ]

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-600 mr-1">Filter:</span>
        {filterButtons.map(btn => (
          <button
            key={btn.label}
            onClick={() => setTypeFilter(btn.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              typeFilter === btn.key
                ? 'bg-berkeley-blue text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {btn.label}
          </button>
        ))}
        {typeFilter && (
          <span className="ml-2 text-xs text-gray-500">
            {filteredByType.length} of {data.length} committees
          </span>
        )}
      </div>
      <table className="w-full">
        <thead className="bg-berkeley-blue text-white sticky top-0">
          <tr>
            <th className="px-4 py-4 text-left font-semibold">Technical Committee</th>
            <th className="px-4 py-4 text-left font-semibold">Chair</th>
            <th className="px-4 py-4 text-left font-semibold">Vice-Chair</th>
            <th className="px-4 py-4 text-left font-semibold">Governing Committee</th>
            {showEmails && <th className="px-4 py-4 text-left font-semibold">Committee Chair</th>}
            {showEmails && <th className="px-4 py-4 text-left font-semibold">Committee Vice-Chair</th>}
            {showEmails && <th className="px-4 py-4 text-left font-semibold">Action</th>}
            <th className="px-2 py-4 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedGroups.map(group => (
            <GroupedRows key={group} group={group} rows={grouped[group]} showEmails={showEmails} />
          ))}
        </tbody>
      </table>
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
function GraphView({ data }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const [viewMode, setViewMode] = useState('graph')
  const zoomRef = useRef(null)

  const colorScale = {
    'TSC': '#003262',  // Berkeley Blue
    'HC': '#3B7EA1',   // Berkeley Blue Light
    'IC': '#3B7EA1',
    'TG': '#34a853',
    'SIG': '#FDB515',  // California Gold
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
        const isTG = summary.includes(' TG') || summary.toLowerCase().includes('task group')
        const isSIG = summary.includes(' SIG') || summary.toLowerCase().includes('sig')

        const node = {
          id: nodeId,
          issueKey: issue,
          name: summary,
          type: isTG ? 'TG' : (isSIG ? 'SIG' : 'TG'),
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
            <div class="font-bold text-berkeley-blue mb-2">${d.data ? d.data.name : d.name}</div>
            ${(d.data || d).issueKey ? `<div class="text-sm"><span class="text-gray-500">Issue:</span> ${(d.data || d).issueKey}</div>` : ''}
            <div class="text-sm"><span class="text-gray-500">Type:</span> <span class="font-medium">${(d.data || d).type}</span></div>
            ${(d.data || d).chair ? `<div class="text-sm"><span class="text-gray-500">Chair:</span> ${(d.data || d).chair}</div>` : ''}
            ${(d.data || d).chairEmail ? `<div class="text-xs text-gray-400">${(d.data || d).chairEmail}</div>` : ''}
            ${(d.data || d).viceChair ? `<div class="text-sm mt-1"><span class="text-gray-500">Vice-Chair:</span> ${(d.data || d).viceChair}</div>` : ''}
            ${(d.data || d).viceChairEmail ? `<div class="text-xs text-gray-400">${(d.data || d).viceChairEmail}</div>` : ''}
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
        .attr('stroke', '#dadce0')
        .attr('stroke-width', 2)

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
        .attr('stroke-width', 3)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')

      node.append('text')
        .attr('dy', d => sizeScale[d.type] + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#374151')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
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

    } else {
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
          .attr('stroke-width', 2)
          .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))')
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
        .attr('stroke', '#c8cfd8')
        .attr('stroke-width', 1.5)

      attachTooltip(node)
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* View mode toggle */}
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('graph')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'graph'
                ? 'bg-berkeley-blue text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Graph
          </button>
          <button
            onClick={() => setViewMode('organogram')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'organogram'
                ? 'bg-berkeley-blue text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Organogram
          </button>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        <button
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              svgRef.current.transition().call(zoomRef.current.scaleBy, 1.3)
            }
          }}
          className="btn-secondary text-sm"
        >
          + Zoom In
        </button>
        <button
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              svgRef.current.transition().call(zoomRef.current.scaleBy, 0.7)
            }
          }}
          className="btn-secondary text-sm"
        >
          - Zoom Out
        </button>
        <button
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              svgRef.current.transition().call(zoomRef.current.transform, d3.zoomIdentity)
            }
          }}
          className="btn-secondary text-sm"
        >
          Reset View
        </button>

        <div className="flex-1" />

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-berkeley-blue" />
            <span className="text-gray-600">TSC</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-berkeley-blue-light" />
            <span className="text-gray-600">HC/IC</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">TG</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-california-gold" />
            <span className="text-gray-600">SIG</span>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="w-full h-[650px] bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-100"
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed bg-white rounded-xl shadow-xl border border-gray-200 p-4 pointer-events-none
                   opacity-0 transition-opacity z-50 max-w-xs"
        style={{ left: 0, top: 0 }}
      />
    </div>
  )
}

// Statistics View Component
function StatisticsView({ data }) {
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [companySearch, setCompanySearch] = useState('')

  // Calculate positions per company with detailed member info
  const companyPositions = useMemo(() => {
    const companies = {}
    data.forEach(row => {
      // Chair affiliations
      if (row['Chair Affiliation']) {
        const company = row['Chair Affiliation']
        if (!companies[company]) companies[company] = { chairs: [], viceChairs: [] }
        companies[company].chairs.push({
          name: row['Chair'] || 'Unknown',
          email: row['Chair Email'] || '',
          group: row['Summary'],
          groupKey: row['Issue'],
          governingCommittee: row['Linked Issue Summary'] || ''
        })
      }
      // Vice-Chair affiliations
      if (row['Vice-Chair Affiliation']) {
        const company = row['Vice-Chair Affiliation']
        if (!companies[company]) companies[company] = { chairs: [], viceChairs: [] }
        companies[company].viceChairs.push({
          name: row['Vice-Chair'] || 'Unknown',
          email: row['Vice-Chair Email'] || '',
          group: row['Summary'],
          groupKey: row['Issue'],
          governingCommittee: row['Linked Issue Summary'] || ''
        })
      }
    })
    return Object.entries(companies)
      .map(([company, positions]) => ({
        company,
        chairs: positions.chairs,
        viceChairs: positions.viceChairs,
        chairCount: positions.chairs.length,
        viceChairCount: positions.viceChairs.length,
        total: positions.chairs.length + positions.viceChairs.length
      }))
      .sort((a, b) => b.total - a.total)
  }, [data])

  // Filter company positions based on search
  const filteredCompanyPositions = useMemo(() => {
    if (!companySearch.trim()) return companyPositions
    const term = companySearch.toLowerCase()
    return companyPositions.filter(item =>
      item.company.toLowerCase().includes(term) ||
      item.chairs.some(c => c.name.toLowerCase().includes(term) || c.group.toLowerCase().includes(term)) ||
      item.viceChairs.some(c => c.name.toLowerCase().includes(term) || c.group.toLowerCase().includes(term))
    )
  }, [companyPositions, companySearch])

  // Calculate TGs approaching 2 years
  // Uses the most recent date between Recharter Approval Date and Group Creation Date.
  // If Recharter Approval Date is empty, falls back to Group Creation Date.
  // If both are empty, the item is excluded.
  const tgsApproaching2Years = useMemo(() => {
    const now = new Date()
    const results = { oneMonth: [], twoMonths: [], threeMonths: [], sixMonths: [] }

    data.forEach(row => {
      const creationDateStr = row['Creation Date']
      const recharterDateStr = row['Recharter Approval Date']

      // Skip if both dates are empty
      if (!creationDateStr && !recharterDateStr) return

      // Parse both dates
      const creationDate = creationDateStr ? new Date(creationDateStr) : null
      const recharterDate = recharterDateStr ? new Date(recharterDateStr) : null

      // Validate parsed dates
      const validCreation = creationDate && !isNaN(creationDate.getTime()) ? creationDate : null
      const validRecharter = recharterDate && !isNaN(recharterDate.getTime()) ? recharterDate : null

      // Skip if no valid dates
      if (!validCreation && !validRecharter) return

      // Pick the most recent date between the two
      let referenceDate
      if (validRecharter && validCreation) {
        referenceDate = validRecharter > validCreation ? validRecharter : validCreation
      } else {
        referenceDate = validCreation || validRecharter
      }

      // Calculate when they hit 2 years from the reference date
      const twoYearDate = new Date(referenceDate)
      twoYearDate.setFullYear(twoYearDate.getFullYear() + 2)

      const diffMs = twoYearDate - now
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (diffDays > 0 && diffDays <= 30) {
        results.oneMonth.push({ ...row, daysUntil: Math.ceil(diffDays), twoYearDate, referenceDate })
      } else if (diffDays > 30 && diffDays <= 60) {
        results.twoMonths.push({ ...row, daysUntil: Math.ceil(diffDays), twoYearDate, referenceDate })
      } else if (diffDays > 60 && diffDays <= 90) {
        results.threeMonths.push({ ...row, daysUntil: Math.ceil(diffDays), twoYearDate, referenceDate })
      } else if (diffDays > 90 && diffDays <= 180) {
        results.sixMonths.push({ ...row, daysUntil: Math.ceil(diffDays), twoYearDate, referenceDate })
      }
    })

    return results
  }, [data])

  // Calculate upcoming elections
  const upcomingElections = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1 // 1-12
    const currentYear = now.getFullYear()
    const results = { now: [], oneMonth: [], twoMonths: [], threeMonths: [] }

    const monthNames = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    }

    const monthNamesReverse = Object.fromEntries(
      Object.entries(monthNames).map(([k, v]) => [v, k])
    )

    data.forEach(row => {
      const nextElectionMonth = row['Next Election Month']
      const nextElectionYear = row['Next Election Year']
      const lastElectionMonth = row['Last Election Month']
      const lastElectionYear = row['Last Election Year']

      // Check if election should be happening NOW
      // Condition 1: Next election is current month or has passed
      // Condition 2: Last election was more than 12 months ago
      let shouldBeNow = false
      let reason = ''

      if (nextElectionMonth && nextElectionYear) {
        const nextMonthNum = monthNames[nextElectionMonth] || parseInt(nextElectionMonth)
        const nextYearNum = parseInt(nextElectionYear)

        if (nextMonthNum && nextYearNum) {
          const monthsUntilNext = (nextYearNum - currentYear) * 12 + (nextMonthNum - currentMonth)

          // Election is this month or overdue
          if (monthsUntilNext <= 0) {
            shouldBeNow = true
            reason = monthsUntilNext === 0 ? 'Election this month' : 'Election overdue'
          } else if (monthsUntilNext === 1) {
            results.oneMonth.push({ ...row, monthsUntil: monthsUntilNext, electionMonth: nextElectionMonth, electionYear: nextYearNum })
          } else if (monthsUntilNext === 2) {
            results.twoMonths.push({ ...row, monthsUntil: monthsUntilNext, electionMonth: nextElectionMonth, electionYear: nextYearNum })
          } else if (monthsUntilNext === 3) {
            results.threeMonths.push({ ...row, monthsUntil: monthsUntilNext, electionMonth: nextElectionMonth, electionYear: nextYearNum })
          }
        }
      }

      // Check if last election was more than 12 months ago
      if (!shouldBeNow && lastElectionMonth && lastElectionYear) {
        const lastMonthNum = monthNames[lastElectionMonth] || parseInt(lastElectionMonth)
        const lastYearNum = parseInt(lastElectionYear)

        if (lastMonthNum && lastYearNum) {
          const monthsSinceLast = (currentYear - lastYearNum) * 12 + (currentMonth - lastMonthNum)

          if (monthsSinceLast >= 12) {
            shouldBeNow = true
            reason = `Last election ${monthsSinceLast} months ago`
          }
        }
      }

      if (shouldBeNow) {
        results.now.push({
          ...row,
          reason,
          lastElectionMonth,
          lastElectionYear,
          nextElectionMonth,
          nextElectionYear
        })
      }
    })

    return results
  }, [data])

  // Calculate longest running groups
  const longestRunning = useMemo(() => {
    const now = new Date()
    const groupsWithAge = data
      .filter(row => row['Creation Date'])
      .map(row => {
        const created = new Date(row['Creation Date'])
        if (isNaN(created.getTime())) return null
        const diffMs = now - created
        const years = diffMs / (1000 * 60 * 60 * 24 * 365.25)
        const summary = row['Summary'] || ''

        // Determine type
        let type = 'TG'
        if (summary.includes(' SIG') || summary.toLowerCase().includes('special interest')) {
          type = 'SIG'
        } else if (summary.includes('(HC)') || summary.includes('(IC)') || summary.includes('Committee')) {
          type = 'Committee'
        }

        return {
          ...row,
          years: Math.round(years * 10) / 10,
          createdDate: created,
          type
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.years - a.years)

    return {
      tgs: groupsWithAge.filter(g => g.type === 'TG').slice(0, 5),
      sigs: groupsWithAge.filter(g => g.type === 'SIG').slice(0, 5),
      committees: groupsWithAge.filter(g => g.type === 'Committee').slice(0, 5)
    }
  }, [data])

  const maxPositions = Math.max(...filteredCompanyPositions.map(c => c.total), 1)

  return (
    <div className="space-y-8">
      {/* Company Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCompany(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-berkeley-blue text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{selectedCompany.company}</h3>
                <p className="text-berkeley-blue-light text-sm">
                  {selectedCompany.chairCount} Chair · {selectedCompany.viceChairCount} Vice-Chair positions
                </p>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(80vh-80px)]">
              {/* Chairs */}
              {selectedCompany.chairs.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-berkeley-blue mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-berkeley-blue rounded" />
                    Chair Positions ({selectedCompany.chairs.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedCompany.chairs.map((pos, idx) => (
                      <div key={`chair-${idx}`} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-gray-800">{pos.name}</div>
                            <a
                              href={`https://riscv.atlassian.net/browse/${pos.groupKey}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-berkeley-blue-light hover:text-california-gold"
                            >
                              {pos.group}
                            </a>
                            {pos.governingCommittee && (
                              <div className="text-xs text-gray-500 mt-1">{pos.governingCommittee}</div>
                            )}
                          </div>
                          <span className="text-xs bg-berkeley-blue text-white px-2 py-1 rounded">Chair</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vice-Chairs */}
              {selectedCompany.viceChairs.length > 0 && (
                <div>
                  <h4 className="font-semibold text-berkeley-blue mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-california-gold rounded" />
                    Vice-Chair Positions ({selectedCompany.viceChairs.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedCompany.viceChairs.map((pos, idx) => (
                      <div key={`vc-${idx}`} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-gray-800">{pos.name}</div>
                            <a
                              href={`https://riscv.atlassian.net/browse/${pos.groupKey}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-berkeley-blue-light hover:text-california-gold"
                            >
                              {pos.group}
                            </a>
                            {pos.governingCommittee && (
                              <div className="text-xs text-gray-500 mt-1">{pos.governingCommittee}</div>
                            )}
                          </div>
                          <span className="text-xs bg-california-gold text-berkeley-blue px-2 py-1 rounded">Vice-Chair</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Company Positions */}
      {import.meta.env.VITE_ENABLE_POSITIONS_BY_COMPANY === 'true' && (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-berkeley-blue">Positions by Company</h2>
            <p className="text-gray-600 text-sm">Number of Chair and Vice-Chair positions held by each company. Click a bar or row to see details.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search company, name, group..."
              className="w-full pl-10 pr-8 py-2 bg-white border border-gray-300 rounded-lg
                         focus:border-california-gold focus:ring-2 focus:ring-california-gold/20
                         outline-none transition-all text-sm"
            />
            {companySearch && (
              <button
                onClick={() => setCompanySearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="bg-gray-50 rounded-xl p-6 flex flex-col h-[500px]">
            <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden">
              {filteredCompanyPositions.map((item, idx) => (
                <div
                  key={item.company}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 rounded-lg p-1 -m-1 transition-colors"
                  onClick={() => setSelectedCompany(item)}
                >
                  <div className="w-32 text-sm text-gray-700 truncate" title={item.company}>
                    {item.company}
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <div
                      className="h-6 bg-berkeley-blue rounded-l hover:bg-berkeley-blue-light transition-colors"
                      style={{ width: `${(item.chairCount / maxPositions) * 100}%`, minWidth: item.chairCount > 0 ? '4px' : '0' }}
                      title={`Chair: ${item.chairCount}`}
                    />
                    <div
                      className="h-6 bg-california-gold rounded-r hover:opacity-80 transition-opacity"
                      style={{ width: `${(item.viceChairCount / maxPositions) * 100}%`, minWidth: item.viceChairCount > 0 ? '4px' : '0' }}
                      title={`Vice-Chair: ${item.viceChairCount}`}
                    />
                  </div>
                  <div className="w-12 text-right text-sm font-semibold text-gray-700">
                    {item.total}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-berkeley-blue rounded" />
                <span className="text-sm text-gray-600">Chair</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-california-gold rounded" />
                <span className="text-sm text-gray-600">Vice-Chair</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[500px] overflow-hidden">
            <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-berkeley-blue text-white sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Company</th>
                  <th className="px-3 py-2 text-center">Chair</th>
                  <th className="px-3 py-2 text-center">Vice-Chair</th>
                  <th className="px-3 py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCompanyPositions.map((item, idx) => (
                  <tr
                    key={item.company}
                    className={`cursor-pointer hover:bg-california-gold/20 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    onClick={() => setSelectedCompany(item)}
                  >
                    <td className="px-3 py-2">{item.company}</td>
                    <td className="px-3 py-2 text-center">{item.chairCount}</td>
                    <td className="px-3 py-2 text-center">{item.viceChairCount}</td>
                    <td className="px-3 py-2 text-center font-semibold">{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* TGs Approaching 2 Years */}
      <div>
        <h2 className="text-xl font-bold text-berkeley-blue mb-4">Groups Approaching 2 Years</h2>
        <p className="text-gray-600 text-sm mb-6">Technical Groups that will reach their 2-year milestone soon (based on most recent of Recharter Approval Date or Group Creation Date)</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1 Month */}
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                {tgsApproaching2Years.oneMonth.length}
              </span>
              <span className="font-semibold text-red-700">Within 1 Month</span>
            </div>
            <div className="space-y-2">
              {tgsApproaching2Years.oneMonth.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No groups</p>
              ) : (
                tgsApproaching2Years.oneMonth.map(row => (
                  <div key={row['Issue']} className="text-sm bg-white rounded p-2">
                    <a
                      href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-red-600"
                    >
                      {row['Summary']}
                    </a>
                    <div className="text-xs text-gray-500">{row.daysUntil} days</div>
                    <div className="text-xs text-gray-400">
                      {row['Recharter Approval Date'] && new Date(row['Recharter Approval Date']).getTime() === row.referenceDate.getTime()
                        ? `Rechartered: ${row['Recharter Approval Date']}`
                        : `Created: ${row['Creation Date']}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2 Months */}
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                {tgsApproaching2Years.twoMonths.length}
              </span>
              <span className="font-semibold text-yellow-700">Within 2 Months</span>
            </div>
            <div className="space-y-2">
              {tgsApproaching2Years.twoMonths.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No groups</p>
              ) : (
                tgsApproaching2Years.twoMonths.map(row => (
                  <div key={row['Issue']} className="text-sm bg-white rounded p-2">
                    <a
                      href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-yellow-600"
                    >
                      {row['Summary']}
                    </a>
                    <div className="text-xs text-gray-500">{row.daysUntil} days</div>
                    <div className="text-xs text-gray-400">
                      {row['Recharter Approval Date'] && new Date(row['Recharter Approval Date']).getTime() === row.referenceDate.getTime()
                        ? `Rechartered: ${row['Recharter Approval Date']}`
                        : `Created: ${row['Creation Date']}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3 Months */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                {tgsApproaching2Years.threeMonths.length}
              </span>
              <span className="font-semibold text-green-700">Within 3 Months</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tgsApproaching2Years.threeMonths.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No groups</p>
              ) : (
                tgsApproaching2Years.threeMonths.map(row => (
                  <div key={row['Issue']} className="text-sm bg-white rounded p-2">
                    <a
                      href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-green-600"
                    >
                      {row['Summary']}
                    </a>
                    <div className="text-xs text-gray-500">{row.daysUntil} days</div>
                    <div className="text-xs text-gray-400">
                      {row['Recharter Approval Date'] && new Date(row['Recharter Approval Date']).getTime() === row.referenceDate.getTime()
                        ? `Rechartered: ${row['Recharter Approval Date']}`
                        : `Created: ${row['Creation Date']}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 6 Months */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                {tgsApproaching2Years.sixMonths.length}
              </span>
              <span className="font-semibold text-blue-700">Within 6 Months</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tgsApproaching2Years.sixMonths.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No groups</p>
              ) : (
                tgsApproaching2Years.sixMonths.map(row => (
                  <div key={row['Issue']} className="text-sm bg-white rounded p-2">
                    <a
                      href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-blue-600"
                    >
                      {row['Summary']}
                    </a>
                    <div className="text-xs text-gray-500">{row.daysUntil} days</div>
                    <div className="text-xs text-gray-400">
                      {row['Recharter Approval Date'] && new Date(row['Recharter Approval Date']).getTime() === row.referenceDate.getTime()
                        ? `Rechartered: ${row['Recharter Approval Date']}`
                        : `Created: ${row['Creation Date']}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Elections */}
      <div>
        <h2 className="text-xl font-bold text-berkeley-blue mb-4">Upcoming Elections</h2>
        <p className="text-gray-600 text-sm mb-6">TGs and SIGs with scheduled elections. "Now" shows groups that should be running elections (overdue or last election was 12+ months ago).</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Now - Elections that should be happening */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold animate-pulse">
                {upcomingElections.now.length}
              </span>
              <span className="font-semibold text-purple-700">Now</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {upcomingElections.now.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No overdue elections</p>
              ) : (
                upcomingElections.now.map(row => (
                  <div key={row['Issue']} className="text-sm bg-white rounded p-2 border-l-2 border-purple-400">
                    <a
                      href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-purple-600"
                    >
                      {row['Summary']}
                    </a>
                    <div className="text-xs text-purple-600 font-medium">{row.reason}</div>
                    {row.lastElectionMonth && row.lastElectionYear && (
                      <div className="text-xs text-gray-500">Last: {row.lastElectionMonth} {row.lastElectionYear}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 1 Month */}
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                {upcomingElections.oneMonth.length}
              </span>
              <span className="font-semibold text-red-700">Next Month</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {upcomingElections.oneMonth.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No elections</p>
              ) : (
                upcomingElections.oneMonth.map(row => (
                  <div key={row['Issue']} className="text-sm bg-white rounded p-2">
                    <a
                      href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-red-600"
                    >
                      {row['Summary']}
                    </a>
                    <div className="text-xs text-gray-500">{row.electionMonth} {row.electionYear}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2 Months */}
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                {upcomingElections.twoMonths.length}
              </span>
              <span className="font-semibold text-yellow-700">In 2 Months</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {upcomingElections.twoMonths.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No elections</p>
              ) : (
                upcomingElections.twoMonths.map(row => (
                  <div key={row['Issue']} className="text-sm bg-white rounded p-2">
                    <a
                      href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-yellow-600"
                    >
                      {row['Summary']}
                    </a>
                    <div className="text-xs text-gray-500">{row.electionMonth} {row.electionYear}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3 Months */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                {upcomingElections.threeMonths.length}
              </span>
              <span className="font-semibold text-green-700">In 3 Months</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {upcomingElections.threeMonths.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No elections</p>
              ) : (
                upcomingElections.threeMonths.map(row => (
                  <div key={row['Issue']} className="text-sm bg-white rounded p-2">
                    <a
                      href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-green-600"
                    >
                      {row['Summary']}
                    </a>
                    <div className="text-xs text-gray-500">{row.electionMonth} {row.electionYear}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Longest Running Technical Committees */}
      <div>
        <h2 className="text-xl font-bold text-berkeley-blue mb-4">Longest Running Technical Committees</h2>
        <p className="text-gray-600 text-sm mb-6">Top 5 oldest groups by category based on creation date</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Task Groups */}
          <div className="bg-gradient-to-br from-berkeley-blue/5 to-berkeley-blue/10 rounded-xl p-4 border border-berkeley-blue/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-berkeley-blue text-white rounded-full flex items-center justify-center text-sm font-bold">TG</span>
              <span className="font-semibold text-berkeley-blue">Task Groups</span>
            </div>
            <div className="space-y-2">
              {longestRunning.tgs.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No data available</p>
              ) : (
                longestRunning.tgs.map((row, idx) => (
                  <div key={row['Issue']} className="flex items-start gap-2 text-sm bg-white rounded p-2">
                    <span className="w-5 h-5 bg-berkeley-blue/10 text-berkeley-blue rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-800 hover:text-berkeley-blue block truncate"
                        title={row['Summary']}
                      >
                        {row['Summary']}
                      </a>
                      <div className="text-xs text-berkeley-blue font-semibold">{row.years} years</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SIGs */}
          <div className="bg-gradient-to-br from-california-gold/5 to-california-gold/10 rounded-xl p-4 border border-california-gold/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-california-gold text-berkeley-blue rounded-full flex items-center justify-center text-sm font-bold">SIG</span>
              <span className="font-semibold text-yellow-700">Special Interest Groups</span>
            </div>
            <div className="space-y-2">
              {longestRunning.sigs.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No data available</p>
              ) : (
                longestRunning.sigs.map((row, idx) => (
                  <div key={row['Issue']} className="flex items-start gap-2 text-sm bg-white rounded p-2">
                    <span className="w-5 h-5 bg-california-gold/20 text-yellow-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-800 hover:text-yellow-600 block truncate"
                        title={row['Summary']}
                      >
                        {row['Summary']}
                      </a>
                      <div className="text-xs text-yellow-700 font-semibold">{row.years} years</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Committees */}
          <div className="bg-gradient-to-br from-berkeley-blue-light/5 to-berkeley-blue-light/10 rounded-xl p-4 border border-berkeley-blue-light/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-berkeley-blue-light text-white rounded-full flex items-center justify-center text-sm font-bold">HC</span>
              <span className="font-semibold text-berkeley-blue-light">Committees</span>
            </div>
            <div className="space-y-2">
              {longestRunning.committees.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No data available</p>
              ) : (
                longestRunning.committees.map((row, idx) => (
                  <div key={row['Issue']} className="flex items-start gap-2 text-sm bg-white rounded p-2">
                    <span className="w-5 h-5 bg-berkeley-blue-light/20 text-berkeley-blue-light rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`https://riscv.atlassian.net/browse/${row['Issue']}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-800 hover:text-berkeley-blue-light block truncate"
                        title={row['Summary']}
                      >
                        {row['Summary']}
                      </a>
                      <div className="text-xs text-berkeley-blue-light font-semibold">{row.years} years</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-berkeley-blue text-white rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">{data.length}</div>
          <div className="text-sm opacity-80">Total Groups</div>
        </div>
        <div className="bg-berkeley-blue-light text-white rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">{companyPositions.length}</div>
          <div className="text-sm opacity-80">Companies</div>
        </div>
        <div className="bg-california-gold text-berkeley-blue rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">
            {tgsApproaching2Years.oneMonth.length + tgsApproaching2Years.twoMonths.length + tgsApproaching2Years.threeMonths.length + tgsApproaching2Years.sixMonths.length}
          </div>
          <div className="text-sm opacity-80">Approaching 2 Years</div>
        </div>
        <div className="bg-purple-600 text-white rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">{upcomingElections.now.length}</div>
          <div className="text-sm opacity-80">Elections Now</div>
        </div>
        <div className="bg-green-500 text-white rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">
            {upcomingElections.oneMonth.length + upcomingElections.twoMonths.length + upcomingElections.threeMonths.length}
          </div>
          <div className="text-sm opacity-80">Upcoming Elections</div>
        </div>
      </div>
    </div>
  )
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-berkeley-blue-dark text-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-berkeley-blue-light text-sm">
          Tech Committees Explorer
        </p>
      </div>
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
    if (search.includes('hierarchy')) return 'graph'
    if (search.includes('statistics')) return 'stats'
    return 'table'
  })

  useEffect(() => {
    const handlePopState = () => {
      const search = window.location.search
      if (search.includes('committees')) setActiveTab('table')
      else if (search.includes('hierarchy')) setActiveTab('graph')
      else if (search.includes('statistics')) setActiveTab('stats')
      else setActiveTab('table')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let queryParam = ''
    switch (activeTab) {
      case 'table': queryParam = '?committees'; break;
      case 'graph': queryParam = '?hierarchy'; break;
      case 'stats': queryParam = '?statistics'; break;
      default: queryParam = '?committees';
    }

    if (window.location.search !== queryParam) {
      const newUrl = window.location.pathname + queryParam
      window.history.pushState(null, '', newUrl)
    }
  }, [activeTab])
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Tab Navigation */}
      <div className="bg-berkeley-blue-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
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
          </div>
        </div>
      </div>

      {/* Search - only show in table view */}
      {activeTab === 'table' && (
        <div className="bg-white shadow-sm border-b border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SearchBox
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              resultCount={loading ? null : filteredData.filter(row => ['Active', 'Proposing', 'Structuring and Chartering'].includes(row['Status'])).length}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="card p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-california-gold border-t-transparent mb-4" />
            <p className="text-gray-500">Loading data...</p>
          </div>
        ) : error ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CloseIcon />
            </div>
            <p className="text-red-600 font-medium">Error loading data</p>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
          </div>
        ) : (
          <div className="card">
            {activeTab === 'table' && (
              <TableView data={filteredData.filter(row => ['Active', 'Proposing', 'Structuring and Chartering'].includes(row['Status']))} showEmails={SHOW_EMAILS} />
            )}
            {activeTab === 'graph' && (
              <div className="p-6">
                <GraphView data={data.filter(row => row['Status'] === 'Active')} />
              </div>
            )}
            {activeTab === 'stats' && (
              <div className="p-6">
                <StatisticsView data={data.filter(row => row['Status'] === 'Active')} />
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default App
