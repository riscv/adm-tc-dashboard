// Pure data logic for the Statistics and History views.
//
// Every number on those views is computed here from the rows of
// rvg-grouped.csv (written by get-rvg-issues.py). Rules that are not obvious
// from the field names are documented next to the code that applies them.

export const DASHBOARD_STATUSES = ['Active', 'Proposing', 'Structuring and Chartering']
export const CLOSED_STATUSES = ['Archived', 'Cancelled']

// How far ahead "ending soon" looks, in days.
export const TERM_WINDOW_DAYS = 90
// How far ahead the TG 2-year list looks, in days.
export const TWO_YEAR_WINDOW_DAYS = 180
// History events are counted from this date. Earlier changelog entries are
// dominated by two bulk workflow migrations (2023-11-14/16 and 2025-02-14/18)
// that renamed or reset statuses of many groups at once, so they do not
// describe when groups actually started or closed.
export const HISTORY_START = '2025-04-01'

// Decisions that explain why a seat looks like it needs a call but does not.
// Seats listed here are still counted as vacant or lapsed; they are only left
// out of the "needs a call" list, and the reason is shown next to them.
export const KNOWN_DECISIONS = {
  'RVG-160': { seats: ['vc'], note: 'No Vice-Chair call by decision (2026-09-29).' },
  'RVG-42': { seats: ['chair', 'vc'], note: 'Rechartering; the Chair/Vice-Chair call follows the recharter.' },
  'RVG-48': { seats: ['chair', 'vc'], note: 'Rechartering; the Chair/Vice-Chair call follows the recharter.' },
  'RVG-49': { seats: ['chair', 'vc'], note: 'Rechartering; the Chair/Vice-Chair call follows the recharter.' },
}

// Groups whose leadership is not elected through a call for candidates.
// Architecture Review is led by the Chief Architect, who is appointed by the
// Board, so it has no Chair/Vice-Chair seats in Jira.
export const NOT_ELECTED = {
  'RVG-476': 'Led by the Chief Architect (appointed by the Board), not elected.',
}

// ---------- dates (day numbers, no time zones) ----------

const DAY_MS = 86400000

// 'YYYY-MM-DD...' -> integer day number (days since 1970-01-01), or null.
export function parseDay(value) {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim())
  if (!m) return null
  return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS)
}

// Today's calendar date in the viewer's time zone, as a day number.
export function todayDay(now = new Date()) {
  return Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS)
}

export function dayToISO(day) {
  if (day === null || day === undefined) return ''
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

export function addYears(day, years) {
  const d = new Date(day * DAY_MS)
  return Math.round(Date.UTC(d.getUTCFullYear() + years, d.getUTCMonth(), d.getUTCDate()) / DAY_MS)
}

// Age as "Xy YYm", e.g. "3y 04m".
export function formatAge(fromDay, toDay) {
  if (fromDay === null || toDay === null) return ''
  const a = new Date(fromDay * DAY_MS)
  const b = new Date(toDay * DAY_MS)
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  if (b.getUTCDate() < a.getUTCDate()) months -= 1
  if (months < 0) months = 0
  return `${Math.floor(months / 12)}y ${String(months % 12).padStart(2, '0')}m`
}

export function quarterOf(day) {
  const d = new Date(day * DAY_MS)
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`
}

// ---------- classification ----------

export const TYPE_ORDER = ['GC', 'IC', 'HC', 'TG', 'SIG', 'Other']
export const TYPE_LABELS = {
  GC: 'Governance Committee',
  IC: 'ISA Committee',
  HC: 'Horizontal Committee',
  TG: 'Task Group',
  SIG: 'Special Interest Group',
  Other: 'Other (no Group Type set)',
}

// Group Type comes from the Jira field (customfield_10085). The summary is
// only used as a fallback for CSVs produced before that column existed.
export function groupType(row) {
  const t = (row['Group Type'] || '').trim()
  const m = /\((GC|IC|HC|TG|SIG)\)\s*$/.exec(t)
  if (m) return m[1]
  if (t) return 'Other'
  const s = (row['Summary'] || '').trim()
  if (/\(TSC\)$/.test(s)) return 'GC'
  if (/\(IC\)$/.test(s)) return 'IC'
  if (/\(HC\)$/.test(s)) return 'HC'
  if (/\bSIG$/.test(s)) return 'SIG'
  if (/\bTG$/.test(s)) return 'TG'
  return 'Other'
}

export function activityKey(level) {
  const raw = String(level || '')
  if (raw.includes('🟢')) return 'veryActive'
  if (raw.includes('🔵')) return 'active'
  if (raw.includes('🟡')) return 'low'
  if (raw.includes('🔴')) return 'stalled'
  return 'unknown'
}

export const ACTIVITY_LABELS = {
  veryActive: '🟢 Very Active',
  active: '🔵 Active',
  low: '🟡 Low',
  stalled: '🔴 Stalled',
  unknown: '⚪️ Unknown or not set',
}

// "2025-05-20:Proposing;2026-03-23:Active" -> [{day, status}]
export function parseHistory(value) {
  if (!value) return []
  return String(value)
    .split(';')
    .map(part => {
      const i = part.indexOf(':')
      if (i < 0) return null
      const day = parseDay(part.slice(0, i))
      if (day === null) return null
      return { day, status: part.slice(i + 1).trim() }
    })
    .filter(Boolean)
}

// ---------- groups ----------

// The CSV has one row per (group, governing committee) pair. Collapse it to
// one object per group so nothing is counted twice.
export function buildGroups(rows) {
  const byKey = new Map()
  rows.forEach(row => {
    const key = row['Issue']
    if (!key) return
    let g = byKey.get(key)
    if (!g) {
      g = {
        key,
        summary: row['Summary'] || key,
        status: row['Status'] || '',
        type: groupType(row),
        parents: [],
        chair: (row['Chair'] || '').trim(),
        chairAffiliation: row['Chair Affiliation'] || '',
        actingChair: row['Is Acting Chair'] === 'Yes',
        chairStart: parseDay(row['Chair Start Date']),
        chairEnd: parseDay(row['Chair End Date']),
        vc: (row['Vice-Chair'] || '').trim(),
        vcAffiliation: row['Vice-Chair Affiliation'] || '',
        actingVc: row['Is Acting Vice-Chair'] === 'Yes',
        vcStart: parseDay(row['Vice-Chair Start Date']),
        vcEnd: parseDay(row['Vice-Chair End Date']),
        electionStatus: row['Election Status'] || '',
        // Open RVC issues (calls for candidates not in a Done status).
        openElections: String(row['Open Elections'] || '').split('|').filter(Boolean).map(x => {
          const i = x.indexOf(':')
          return { key: x.slice(0, i), status: x.slice(i + 1) }
        }),
        hasElectionColumn: 'Open Elections' in row,
        lifecycleStart: parseDay(row['Lifecycle Starting Date']),
        nextElection: monthIndex(row['Next Election Month'], row['Next Election Year']),
        lastElection: monthIndex(row['Last Election Month'], row['Last Election Year']),
        nextElectionLabel: [row['Next Election Month'], row['Next Election Year']].filter(Boolean).join(' ').trim(),
        lastElectionLabel: [row['Last Election Month'], row['Last Election Year']].filter(Boolean).join(' ').trim(),
        creation: parseDay(row['Creation Date']),
        recharter: parseDay(row['Recharter Approval Date']),
        twoYearsField: row['2+ Years Active'] || '',
        extension: row['Extension Request'] || '',
        extensionDecision: parseDay(row['Extension Decision Date']),
        activity: activityKey(row['Activity Level']),
        activityRaw: row['Activity Level'] || '',
        history: parseHistory(row['Status History']),
        hasExtendedColumns: 'Group Type' in row,
        fetchedAt: row['Data Fetched At'] || '',
      }
      byKey.set(key, g)
    }
    if (row['Linked Issue Summary']) {
      const pk = row['Linked Issue Key'] || row['Linked Issue Summary']
      if (!g.parents.some(p => p.key === pk)) g.parents.push({ key: pk, summary: row['Linked Issue Summary'] })
    }
  })
  return Array.from(byKey.values()).sort((a, b) => a.summary.localeCompare(b.summary))
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function monthIndex(month, year) {
  const m = MONTHS.indexOf((month || '').trim())
  const y = parseInt(year, 10)
  if (m < 0 || !y) return null
  return y * 12 + m
}

export function dataFetchedAt(groups) {
  const g = groups.find(x => x.fetchedAt)
  return g ? g.fetchedAt : ''
}

// ---------- counts ----------

// Distinct groups per type and status.
export function countsByType(groups) {
  const table = {}
  TYPE_ORDER.forEach(t => {
    table[t] = {}
    DASHBOARD_STATUSES.forEach(s => { table[t][s] = [] })
  })
  groups.forEach(g => {
    if (!DASHBOARD_STATUSES.includes(g.status)) return
    table[g.type][g.status].push(g)
  })
  return table
}

// Active groups under each governing committee. A group with two governing
// committees is listed under both, so the column total can exceed the number
// of distinct groups; `shared` reports how many such groups there are.
export function countsByGoverning(groups) {
  const map = new Map()
  let shared = 0
  groups.forEach(g => {
    if (!DASHBOARD_STATUSES.includes(g.status)) return
    if (g.parents.length > 1) shared += 1
    const parents = g.parents.length ? g.parents : [{ key: '', summary: 'No governing committee' }]
    parents.forEach(p => {
      if (!map.has(p.summary)) map.set(p.summary, { key: p.key, summary: p.summary, groups: [] })
      map.get(p.summary).groups.push(g)
    })
  })
  const list = Array.from(map.values())
  list.sort((a, b) => b.groups.length - a.groups.length || a.summary.localeCompare(b.summary))
  return { list, shared }
}

// ---------- leadership ----------

// Seat states, evaluated on Active and Structuring-and-Chartering groups.
// Proposing groups are left out: they have no elected leadership yet by
// design (their proposer is recorded as Acting Chair).
//   vacant  - no person in the seat
//   acting  - "Is Acting Chair?" / "Is Acting Vice-Chair?" is Yes
//   lapsed  - person in the seat and the term end date is before today
//   ending  - term end date within the next TERM_WINDOW_DAYS days
//   noTerm  - person in the seat but no term end date recorded
// Term end dates already encode the term rules (IC terms run exactly one
// year; HC/TG/SIG terms usually end on July 31), so they are used as-is
// instead of the Next/Last Election fields, which are not rolled forward
// when a call closes.
export function leadershipSeats(groups, today) {
  const seats = []
  groups.forEach(g => {
    if (!['Active', 'Structuring and Chartering'].includes(g.status)) return
    if (NOT_ELECTED[g.key]) return
    ;[
      { seat: 'chair', label: 'Chair', name: g.chair, acting: g.actingChair, start: g.chairStart, end: g.chairEnd },
      { seat: 'vc', label: 'Vice-Chair', name: g.vc, acting: g.actingVc, start: g.vcStart, end: g.vcEnd },
    ].forEach(s => {
      const states = []
      if (!s.name) states.push('vacant')
      else {
        if (s.acting) states.push('acting')
        if (s.end === null) states.push('noTerm')
        else if (s.end < today) states.push('lapsed')
        else if (s.end - today <= TERM_WINDOW_DAYS) states.push('ending')
      }
      const decision = KNOWN_DECISIONS[g.key]
      seats.push({
        group: g,
        ...s,
        states,
        daysLeft: s.end === null ? null : s.end - today,
        decision: decision && decision.seats.includes(s.seat) ? decision.note : '',
      })
    })
  })
  return seats
}

// An election is in progress when an RVC issue linked to the group is open and
// has candidates (In Progress or Voting). The RVC project is the source of
// truth; the RVG Election Status field is only used for CSVs that predate the
// "Open Elections" column.
export function runningElections(g) {
  return g.openElections.filter(e => !/No Candidates/i.test(e.status))
}

export function electionInProgress(g) {
  if (g.hasElectionColumn) return runningElections(g).length > 0
  return /Open|Voting/i.test(g.electionStatus)
}

export function noCandidateCalls(g) {
  return g.openElections.filter(e => /No Candidates/i.test(e.status))
}

// Seats that need a call for candidates: vacant, lapsed, or ending within the
// window, in a group with no call open or vote running, and not covered by a
// known decision.
export function seatsNeedingCall(seats) {
  return seats.filter(s =>
    (s.states.includes('vacant') || s.states.includes('lapsed') || s.states.includes('ending')) &&
    !electionInProgress(s.group) &&
    !s.decision
  )
}

// ---------- TG 2-year counter ----------

// TGs are expected to finish within 2 years of creation; the TSC can grant one
// 1-year extension. A recharter resets the counter (TSC precedent,
// 2026-02-06), so the reference date is the later of Group Creation Date and
// Recharter Approval Date.
export function tgTwoYear(groups, today) {
  const rows = []
  groups.forEach(g => {
    if (g.type !== 'TG' || !['Active', 'Structuring and Chartering'].includes(g.status)) return
    const ref = g.recharter !== null && (g.creation === null || g.recharter > g.creation) ? g.recharter : g.creation
    const viaRecharter = ref !== null && ref === g.recharter
    if (ref === null) {
      rows.push({ group: g, ref: null, state: 'missing' })
      return
    }
    const twoYear = addYears(ref, 2)
    const extensionApproved = /Approved/i.test(g.extension) && !/Not Approved/i.test(g.extension)
    const extensionPending = /Requested/i.test(g.extension)
    // Extensions are dated from the TSC decision (most were approved together
    // on 2026-07-01), not from the 2-year mark, so the end of the extension is
    // shown as decision date + 1 year. This is a reading of the policy, not a
    // Jira field.
    const deadline = extensionApproved && g.extensionDecision !== null ? addYears(g.extensionDecision, 1) : null
    let state
    if (today >= twoYear) state = 'past'
    else if (twoYear - today <= TWO_YEAR_WINDOW_DAYS) state = 'soon'
    else state = 'ok'
    // Jira's own "2+ Years Active" field; flag when it disagrees.
    const fieldSaysYes = /Yes/i.test(g.twoYearsField)
    const fieldSaysNo = /-\s*No/i.test(g.twoYearsField)
    let fieldMismatch = ''
    if (state === 'past' && fieldSaysNo) fieldMismatch = `Jira field says "${g.twoYearsField}"`
    if (state !== 'past' && fieldSaysYes) fieldMismatch = `Jira field says "${g.twoYearsField}"`
    if (extensionApproved && !/Extension/i.test(g.twoYearsField)) fieldMismatch = `Extension Approved but Jira field says "${g.twoYearsField}"`
    rows.push({ group: g, ref, viaRecharter, twoYear, deadline, extensionApproved, extensionPending, state, daysToTwoYear: twoYear - today, daysToDeadline: deadline === null ? null : deadline - today, fieldMismatch })
  })
  rows.sort((a, b) => (a.twoYear ?? Infinity) - (b.twoYear ?? Infinity))
  return rows
}

// ---------- data quality ----------

export function dataQuality(groups, seats, today) {
  const issues = []
  const add = (group, problem) => issues.push({ group, problem })
  tgTwoYear(groups, today).forEach(r => { if (r.fieldMismatch) add(r.group, `2-year counter: ${r.fieldMismatch}.`) })
  seats.forEach(s => {
    if (s.start !== null && s.end !== null && s.end <= s.start) add(s.group, `${s.label} term ends on or before it starts (${dayToISO(s.start)} to ${dayToISO(s.end)}).`)
    if (!s.name && s.end !== null && s.end >= today) add(s.group, `${s.label} seat is empty but a term to ${dayToISO(s.end)} is recorded.`)
    if (s.name && s.end === null) add(s.group, `${s.label} ${s.name} has no term end date.`)
  })
  groups.forEach(g => {
    if (!DASHBOARD_STATUSES.includes(g.status)) return
    if (g.hasExtendedColumns && g.type === 'Other') add(g, 'Group Type is not set.')
    if (g.status === 'Active' && g.activity === 'unknown') add(g, 'Activity Level is not set.')
    if (g.status === 'Active' && ['TG', 'SIG'].includes(g.type) && g.creation === null) add(g, 'Group Creation Date is not set.')
    if (g.hasElectionColumn && !NOT_ELECTED[g.key]) {
      const fieldOpen = /Open|Voting/i.test(g.electionStatus)
      const running = runningElections(g)
      if (fieldOpen && running.length === 0) add(g, `Election Status says "${g.electionStatus}" but no call for candidates (RVC) is open.`)
      if (!fieldOpen && running.length > 0) add(g, `${running.map(e => `${e.key} is ${e.status}`).join(', ')} but Election Status says "${g.electionStatus || 'empty'}".`)
      const termsCurrent = g.chair && g.vc && g.chairEnd !== null && g.vcEnd !== null && g.chairEnd >= today && g.vcEnd >= today
      noCandidateCalls(g).forEach(e => {
        if (termsCurrent) add(g, `${e.key} (No Candidates) is still open although both seats are filled with current terms.`)
      })
    }
    if (g.status === 'Active' && !NOT_ELECTED[g.key]) {
      // The Next/Last Election fields are not rolled forward when a call
      // closes. Flag them when they contradict the recorded terms.
      if (g.nextElection !== null && g.lastElection !== null && g.nextElection < g.lastElection) {
        add(g, `Next Election (${g.nextElectionLabel}) is before Last Election (${g.lastElectionLabel}).`)
      }
      const ends = [g.chair ? g.chairEnd : null, g.vc ? g.vcEnd : null].filter(d => d !== null)
      const now = new Date(today * DAY_MS)
      const nowMonth = now.getUTCFullYear() * 12 + now.getUTCMonth()
      if (g.nextElection !== null && g.nextElection < nowMonth && ends.length && ends.every(d => d - today > TERM_WINDOW_DAYS)) {
        add(g, `Next Election says ${g.nextElectionLabel} (past) but terms run to ${dayToISO(Math.min(...ends))} or later; election fields not rolled forward.`)
      }
    }
  })
  return issues
}

// ---------- history ----------

// Status-change events from HISTORY_START on, from the Jira changelog.
//   proposed  - first time the group entered Proposing
//   activated - entered Active from Proposing, Structuring and Chartering or TODO
//   closed    - entered Archived or Cancelled
export function historyEvents(groups, startISO = HISTORY_START) {
  const start = parseDay(startISO)
  const events = []
  groups.forEach(g => {
    let seenProposing = false
    let prev = null
    g.history.forEach(h => {
      const s = h.status
      if (prev === null && s === 'Proposing' && h.day >= start) events.push({ group: g, day: h.day, kind: 'proposed', from: '(created)' })
      if (prev !== null && s !== prev) {
        if (s === 'Proposing' && !seenProposing && h.day >= start) events.push({ group: g, day: h.day, kind: 'proposed', from: prev })
        if (s === 'Active' && ['Proposing', 'Structuring and Chartering', 'TODO'].includes(prev) && h.day >= start) events.push({ group: g, day: h.day, kind: 'activated', from: prev })
        if (CLOSED_STATUSES.includes(s) && !CLOSED_STATUSES.includes(prev) && h.day >= start) events.push({ group: g, day: h.day, kind: 'closed', from: prev })
      }
      if (s === 'Proposing') seenProposing = true
      prev = s
    })
  })
  // A group whose first mailing-list email (Lifecycle Starting Date) is more
  // than a year before the event already existed; Jira recorded it late.
  events.forEach(e => {
    e.recordedLate = e.kind !== 'closed' && e.group.lifecycleStart !== null && e.day - e.group.lifecycleStart > 365
  })
  events.sort((a, b) => a.day - b.day)
  return events
}

export function eventsByQuarter(events, today, startISO = HISTORY_START) {
  const quarters = []
  let d = parseDay(startISO)
  while (d <= today) {
    const q = quarterOf(d)
    if (!quarters.includes(q)) quarters.push(q)
    d += 28
  }
  if (!quarters.includes(quarterOf(today))) quarters.push(quarterOf(today))
  return quarters.map(q => {
    const inQ = events.filter(e => quarterOf(e.day) === q)
    return {
      quarter: q,
      partial: q === quarterOf(today),
      proposed: inQ.filter(e => e.kind === 'proposed'),
      activated: inQ.filter(e => e.kind === 'activated'),
      closed: inQ.filter(e => e.kind === 'closed'),
    }
  })
}

// Proposing and Structuring-and-Chartering groups with the date they entered
// their current status (last status change in the changelog).
export function pipeline(groups, today) {
  return groups
    .filter(g => g.status === 'Proposing' || g.status === 'Structuring and Chartering')
    .map(g => {
      const last = [...g.history].reverse().find(h => h.status === g.status)
      // walk back while the status stays the same, to get the start of the run
      let since = last ? last.day : null
      if (g.history.length) {
        for (let i = g.history.length - 1; i >= 0; i--) {
          if (g.history[i].status !== g.status) break
          since = g.history[i].day
        }
      }
      return { group: g, since, days: since === null ? null : today - since }
    })
    .sort((a, b) => (b.days ?? -1) - (a.days ?? -1))
}
