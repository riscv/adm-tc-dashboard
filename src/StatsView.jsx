import { useMemo, useState } from 'react'
import {
  DASHBOARD_STATUSES, TYPE_ORDER, TYPE_LABELS, ACTIVITY_LABELS, TERM_WINDOW_DAYS, TWO_YEAR_WINDOW_DAYS,
  HISTORY_START, NOT_ELECTED, KNOWN_DECISIONS,
  buildGroups, todayDay, dayToISO, formatAge, dataFetchedAt, countsByType, countsByGoverning,
  leadershipSeats, seatsNeedingCall, electionInProgress, runningElections, noCandidateCalls,
  tgTwoYear, dataQuality, historyEvents, eventsByQuarter, pipeline,
} from './stats'

const JIRA = 'https://riscv.atlassian.net/browse/'

function JiraLink({ k, children }) {
  if (!k) return <span>{children}</span>
  return (
    <a href={JIRA + k} target="_blank" rel="noopener noreferrer" className="text-berkeley-blue hover:text-california-gold hover:underline">
      {children || k}
    </a>
  )
}

function GroupCell({ g }) {
  return (
    <div>
      <JiraLink k={g.key}>{g.summary}</JiraLink>
      <div className="text-xs text-gray-500">{g.key} · {g.type}{g.status !== 'Active' ? ` · ${g.status}` : ''}</div>
    </div>
  )
}

function Parents({ g }) {
  if (!g.parents.length) return <span className="text-gray-400">None</span>
  return <span>{g.parents.map(p => p.summary).join(', ')}</span>
}

function Section({ title, definition, children, right }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
        <h2 className="text-lg font-bold text-berkeley-blue">{title}</h2>
        {right}
      </div>
      {definition && <p className="text-sm text-gray-600 mb-4">{definition}</p>}
      {children}
    </section>
  )
}

function Table({ columns, rows, empty = 'None.' }) {
  if (!rows.length) return <p className="text-sm text-gray-500 italic">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
            {columns.map(c => <th key={c.label} className="px-2 py-2 font-semibold">{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i} className="align-top hover:bg-california-gold/5">
              {columns.map(c => <td key={c.label} className="px-2 py-2">{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MetricCard({ label, count, definition, selected, onClick, tone = 'blue' }) {
  const tones = {
    blue: 'border-berkeley-blue/30',
    red: 'border-red-300',
    amber: 'border-yellow-300',
    gray: 'border-gray-300',
  }
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-4 transition-colors ${tones[tone]} ${selected ? 'bg-california-gold/20 border-california-gold' : 'bg-white hover:bg-gray-50'}`}
      aria-pressed={selected}
    >
      <div className="text-3xl font-bold text-berkeley-blue">{count}</div>
      <div className="text-sm font-semibold text-gray-800">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{definition}</div>
    </button>
  )
}

function ElectionCell({ g }) {
  const running = runningElections(g)
  const none = noCandidateCalls(g)
  if (!running.length && !none.length) return <span className="text-gray-400">No open call</span>
  return (
    <div className="space-y-0.5">
      {running.map(e => <div key={e.key}><JiraLink k={e.key} /> <span className="text-green-700">{e.status}</span></div>)}
      {none.map(e => <div key={e.key}><JiraLink k={e.key} /> <span className="text-red-700">{e.status}</span></div>)}
    </div>
  )
}

const STATE_LABEL = {
  vacant: 'Vacant',
  acting: 'Acting',
  lapsed: 'Term lapsed',
  ending: `Ends within ${TERM_WINDOW_DAYS} days`,
  noTerm: 'No term dates',
}

function seatColumns(today) {
  return [
    { label: 'Group', render: s => <GroupCell g={s.group} /> },
    { label: 'Governing committee', render: s => <Parents g={s.group} /> },
    { label: 'Seat', render: s => s.label },
    { label: 'Holder', render: s => s.name || <span className="text-red-700">Vacant</span> },
    { label: 'Term', render: s => s.end === null ? <span className="text-gray-400">Not recorded</span> : `${dayToISO(s.start) || '?'} to ${dayToISO(s.end)}` },
    {
      label: 'Days left',
      render: s => s.end === null ? '' : (s.end < today ? <span className="text-red-700">{today - s.end} days ago</span> : `${s.end - today}`),
    },
    { label: 'State', render: s => s.states.map(x => STATE_LABEL[x]).join(', ') },
    { label: 'Election (RVC)', render: s => <ElectionCell g={s.group} /> },
    { label: 'Note', render: s => s.decision ? <span className="text-gray-600 italic">{s.decision}</span> : '' },
  ]
}

function FetchedNote({ groups, today }) {
  const fetched = dataFetchedAt(groups)
  return (
    <p className="text-xs text-gray-500">
      Source: Jira projects RVG (groups) and RVC (elections){fetched ? `, fetched ${fetched.replace('T', ' ').replace('Z', ' UTC')}` : ''}. Dates are compared with today, {dayToISO(today)}. Every count is of distinct groups or seats; a group with two governing committees is counted once.
    </p>
  )
}

// ---------------------------------------------------------------- Statistics

export function StatisticsView({ rows }) {
  const today = todayDay()
  const groups = useMemo(() => buildGroups(rows), [rows])
  const [selected, setSelected] = useState('needCall')
  const [typeCell, setTypeCell] = useState(null)
  const [govOpen, setGovOpen] = useState(null)
  const [activityOpen, setActivityOpen] = useState(null)

  const m = useMemo(() => {
    const shown = groups.filter(g => DASHBOARD_STATUSES.includes(g.status))
    const active = shown.filter(g => g.status === 'Active')
    const seats = leadershipSeats(groups, today)
    const by = st => seats.filter(s => s.states.includes(st))
    const needCall = seatsNeedingCall(seats)
    const excluded = seats.filter(s => s.decision && (s.states.includes('vacant') || s.states.includes('lapsed') || s.states.includes('ending')))
    const inProgress = shown.filter(g => electionInProgress(g))
    const two = tgTwoYear(groups, today)
    const quality = dataQuality(groups, seats, today)
    const activity = {}
    Object.keys(ACTIVITY_LABELS).forEach(k => { activity[k] = active.filter(g => g.activity === k) })
    return {
      shown, active, seats, needCall, excluded, inProgress, two, quality, activity,
      vacant: by('vacant'), acting: by('acting'), lapsed: by('lapsed'), ending: by('ending'),
      byType: countsByType(groups), byGov: countsByGoverning(groups),
    }
  }, [groups, today])

  const twoPast = m.two.filter(r => r.state === 'past')
  const twoPastNoExt = twoPast.filter(r => !r.extensionApproved)
  const twoSoon = m.two.filter(r => r.state === 'soon')
  const twoMissing = m.two.filter(r => r.state === 'missing')

  const cards = [
    { id: 'needCall', label: 'Seats that need a call', count: m.needCall.length, tone: 'red',
      definition: `Chair or Vice-Chair seats that are vacant, lapsed or end within ${TERM_WINDOW_DAYS} days, in groups with no RVC call in progress.` },
    { id: 'inProgress', label: 'Elections in progress', count: m.inProgress.length, tone: 'blue',
      definition: 'Groups with an open RVC call for candidates that is In Progress or Voting.' },
    { id: 'vacant', label: 'Vacant seats', count: m.vacant.length, tone: 'red',
      definition: 'Chair or Vice-Chair fields that are empty on Active or Structuring groups.' },
    { id: 'lapsed', label: 'Lapsed terms', count: m.lapsed.length, tone: 'red',
      definition: 'Seats with a holder whose recorded term end date is before today.' },
    { id: 'ending', label: `Terms ending in ${TERM_WINDOW_DAYS} days`, count: m.ending.length, tone: 'amber',
      definition: `Seats whose term end date falls between today and ${dayToISO(today + TERM_WINDOW_DAYS)}.` },
    { id: 'acting', label: 'Acting leaders', count: m.acting.length, tone: 'amber',
      definition: 'Seats with "Is Acting Chair?" or "Is Acting Vice-Chair?" set to Yes.' },
    { id: 'twoYear', label: 'TGs past 2 years, no extension', count: twoPastNoExt.length, tone: 'amber',
      definition: `Task Groups more than 2 years after creation or last recharter with no approved extension (${twoPast.length} past 2 years in total).` },
    { id: 'quality', label: 'Data issues', count: m.quality.length, tone: 'gray',
      definition: 'Jira records that contradict each other or are missing a field the numbers depend on.' },
  ]

  const seatCols = seatColumns(today)
  const panels = {
    needCall: (
      <>
        <Table columns={seatCols} rows={m.needCall} empty="No seat needs a call." />
        {m.excluded.length > 0 && (
          <p className="text-xs text-gray-600 mt-3">
            Not listed by decision ({m.excluded.length} seats): {m.excluded.map(s => `${s.group.summary} ${s.label}`).join('; ')}. {Array.from(new Set(m.excluded.map(s => s.decision))).join(' ')}
          </p>
        )}
        <p className="text-xs text-gray-600 mt-1">
          Not elected, so not counted: {Object.entries(NOT_ELECTED).map(([k, v]) => `${k} (${v})`).join('; ')}. Proposing groups are not counted; their proposer is recorded as Acting Chair until the group is chartered.
        </p>
      </>
    ),
    inProgress: (
      <Table
        columns={[
          { label: 'Group', render: g => <GroupCell g={g} /> },
          { label: 'Governing committee', render: g => <Parents g={g} /> },
          { label: 'Election (RVC)', render: g => <ElectionCell g={g} /> },
          { label: 'Chair term end', render: g => dayToISO(g.chairEnd) },
          { label: 'Vice-Chair term end', render: g => dayToISO(g.vcEnd) },
        ]}
        rows={m.inProgress}
      />
    ),
    vacant: <Table columns={seatCols} rows={m.vacant} />,
    lapsed: <Table columns={seatCols} rows={m.lapsed} />,
    ending: <Table columns={seatCols} rows={m.ending} />,
    acting: <Table columns={seatCols} rows={m.acting} />,
    twoYear: (
      <Table
        columns={[
          { label: 'Task Group', render: r => <GroupCell g={r.group} /> },
          { label: 'Counter starts', render: r => `${dayToISO(r.ref)}${r.viaRecharter ? ' (recharter)' : ''}` },
          { label: '2 years passed', render: r => `${dayToISO(r.twoYear)} (${today - r.twoYear} days ago)` },
          { label: 'Extension (Jira)', render: r => r.group.extension || <span className="text-gray-400">None recorded</span> },
          { label: 'Note', render: r => KNOWN_DECISIONS[r.group.key] && /Recharter/i.test(KNOWN_DECISIONS[r.group.key].note) ? <span className="italic text-gray-600">{KNOWN_DECISIONS[r.group.key].note}</span> : '' },
        ]}
        rows={twoPastNoExt}
      />
    ),
    quality: (
      <Table
        columns={[
          { label: 'Group', render: q => <GroupCell g={q.group} /> },
          { label: 'Problem', render: q => q.problem },
        ]}
        rows={m.quality}
      />
    ),
  }

  const activeTypeTotal = TYPE_ORDER.reduce((n, t) => n + m.byType[t].Active.length, 0)
  const typeCellGroups = typeCell ? m.byType[typeCell.type][typeCell.status] : []

  return (
    <div className="space-y-6">
      <FetchedNote groups={groups} today={today} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <MetricCard key={c.id} {...c} selected={selected === c.id} onClick={() => setSelected(selected === c.id ? null : c.id)} />
        ))}
      </div>

      {selected && (
        <Section title={cards.find(c => c.id === selected).label} definition={cards.find(c => c.id === selected).definition}>
          {panels[selected]}
        </Section>
      )}

      <Section
        title="Groups by type and status"
        definition={`Distinct RVG groups by Group Type (Jira field) and status. ${activeTypeTotal} groups are Active. Click a number to list the groups.`}
      >
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="px-3 py-2">Type</th>
                {DASHBOARD_STATUSES.map(s => <th key={s} className="px-3 py-2 text-right">{s}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TYPE_ORDER.map(t => {
                const total = DASHBOARD_STATUSES.reduce((n, s) => n + m.byType[t][s].length, 0)
                if (!total) return null
                return (
                  <tr key={t}>
                    <td className="px-3 py-2 font-medium">{TYPE_LABELS[t]} ({t})</td>
                    {DASHBOARD_STATUSES.map(s => {
                      const n = m.byType[t][s].length
                      const on = typeCell && typeCell.type === t && typeCell.status === s
                      return (
                        <td key={s} className="px-3 py-2 text-right">
                          {n ? (
                            <button className={`font-semibold underline decoration-dotted ${on ? 'text-california-gold' : 'text-berkeley-blue'}`} onClick={() => setTypeCell(on ? null : { type: t, status: s })}>{n}</button>
                          ) : <span className="text-gray-300">0</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              <tr className="font-semibold">
                <td className="px-3 py-2">Total</td>
                {DASHBOARD_STATUSES.map(s => <td key={s} className="px-3 py-2 text-right">{TYPE_ORDER.reduce((n, t) => n + m.byType[t][s].length, 0)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        {typeCell && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{TYPE_LABELS[typeCell.type]}, {typeCell.status} ({typeCellGroups.length})</h3>
            <Table
              columns={[
                { label: 'Group', render: g => <GroupCell g={g} /> },
                { label: 'Governing committee', render: g => <Parents g={g} /> },
                { label: 'Chair', render: g => g.chair || <span className="text-red-700">Vacant</span> },
                { label: 'Vice-Chair', render: g => g.vc || <span className="text-red-700">Vacant</span> },
              ]}
              rows={typeCellGroups}
            />
          </div>
        )}
      </Section>

      <Section
        title="Groups by governing committee"
        definition={`Groups in Active, Structuring and Chartering or Proposing status under each governing committee ("is governed by" or "is direct-lined by" link). ${m.byGov.shared} group${m.byGov.shared === 1 ? ' has' : 's have'} two governing committees and appear${m.byGov.shared === 1 ? 's' : ''} under both, so this column adds up to more than the number of groups.`}
      >
        <div className="space-y-1">
          {m.byGov.list.map(item => {
            const open = govOpen === item.summary
            const max = m.byGov.list[0].groups.length
            const counts = DASHBOARD_STATUSES.map(s => item.groups.filter(g => g.status === s).length)
            return (
              <div key={item.summary}>
                <button className="w-full flex items-center gap-3 text-left text-sm hover:bg-gray-50 rounded px-1 py-1" onClick={() => setGovOpen(open ? null : item.summary)}>
                  <span className="w-64 truncate">{item.summary}</span>
                  <span className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                    <span className="block h-4 bg-berkeley-blue-light" style={{ width: `${(item.groups.length / max) * 100}%` }} />
                  </span>
                  <span className="w-44 text-right text-gray-700"><b>{item.groups.length}</b> ({counts[0]} Active, {counts[2]} Structuring, {counts[1]} Proposing)</span>
                </button>
                {open && (
                  <div className="ml-4 my-2">
                    <Table
                      columns={[
                        { label: 'Group', render: g => <GroupCell g={g} /> },
                        { label: 'Chair', render: g => g.chair || <span className="text-red-700">Vacant</span> },
                        { label: 'Vice-Chair', render: g => g.vc || <span className="text-red-700">Vacant</span> },
                        { label: 'Activity Level', render: g => ACTIVITY_LABELS[g.activity] },
                      ]}
                      rows={item.groups}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section
        title="Task Group 2-year counter"
        definition={`A TG is expected to finish within 2 years; the TSC can grant one 1-year extension, shown here as ending 1 year after the TSC decision date. The counter starts at the later of Group Creation Date and Recharter Approval Date (a recharter resets it). Lists Active and Structuring TGs that are past 2 years, reach it within ${TWO_YEAR_WINDOW_DAYS} days, or have no creation date.`}
      >
        <Table
          columns={[
            { label: 'Task Group', render: r => <GroupCell g={r.group} /> },
            { label: 'Counter starts', render: r => r.ref === null ? <span className="text-red-700">No creation date</span> : `${dayToISO(r.ref)}${r.viaRecharter ? ' (recharter)' : ''}` },
            { label: 'Age', render: r => r.ref === null ? '' : formatAge(r.ref, today) },
            { label: '2 years', render: r => r.ref === null ? '' : (r.state === 'past' ? `${dayToISO(r.twoYear)} (passed)` : `${dayToISO(r.twoYear)} (in ${r.daysToTwoYear} days)`) },
            {
              label: 'Extension (Jira)',
              render: r => !r.group.extension ? <span className="text-gray-400">None recorded</span> : (
                <span>{r.group.extension}{r.group.extensionDecision !== null ? ` ${dayToISO(r.group.extensionDecision)}` : ''}{r.extensionPending && r.state === 'past' && <span className="block text-xs text-red-700">Awaiting TSC decision</span>}</span>
              ),
            },
            {
              label: 'Decision + 1 year',
              render: r => r.deadline === null ? '' : (r.daysToDeadline < 0 ? <span className="text-red-700">{dayToISO(r.deadline)} (passed)</span> : `${dayToISO(r.deadline)} (in ${r.daysToDeadline} days)`),
            },
            { label: '2+ Years Active (Jira)', render: r => <span>{r.group.twoYearsField}{r.fieldMismatch && <span className="block text-xs text-red-700">Disagrees with dates</span>}</span> },
          ]}
          rows={[...twoSoon, ...twoPast, ...twoMissing]}
        />
      </Section>

      <Section
        title="Activity Level"
        definition={`Active groups by the Jira "Activity Level" field. The field is set by hand, so it is only as current as its last edit. Click a level to list the groups.`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(ACTIVITY_LABELS).map(([k, label]) => (
            <button key={k} onClick={() => setActivityOpen(activityOpen === k ? null : k)} className={`text-left border rounded-lg p-3 ${activityOpen === k ? 'border-california-gold bg-california-gold/10' : 'border-gray-200 hover:bg-gray-50'}`}>
              <div className="text-sm text-gray-700">{label}</div>
              <div className="text-2xl font-bold text-berkeley-blue">{m.activity[k].length}</div>
              <div className="text-xs text-gray-500">{m.active.length ? Math.round((m.activity[k].length / m.active.length) * 100) : 0}% of {m.active.length} Active groups</div>
            </button>
          ))}
        </div>
        {activityOpen && (
          <div className="mt-4">
            <Table
              columns={[
                { label: 'Group', render: g => <GroupCell g={g} /> },
                { label: 'Governing committee', render: g => <Parents g={g} /> },
                { label: 'Chair', render: g => g.chair || <span className="text-red-700">Vacant</span> },
              ]}
              rows={m.activity[activityOpen]}
            />
          </div>
        )}
      </Section>

      {import.meta.env.VITE_ENABLE_POSITIONS_BY_COMPANY === 'true' && <CompanyPositions groups={m.active} />}
    </div>
  )
}

function CompanyPositions({ groups }) {
  const list = useMemo(() => {
    const map = new Map()
    groups.forEach(g => {
      ;[['Chair', g.chair, g.chairAffiliation], ['Vice-Chair', g.vc, g.vcAffiliation]].forEach(([role, name, company]) => {
        if (!name || !company) return
        if (!map.has(company)) map.set(company, [])
        map.get(company).push({ role, name, g })
      })
    })
    return Array.from(map.entries()).map(([company, seats]) => ({ company, seats })).sort((a, b) => b.seats.length - a.seats.length || a.company.localeCompare(b.company))
  }, [groups])
  return (
    <Section title="Positions by company" definition="Chair and Vice-Chair seats on Active groups by the affiliation recorded in Jira, each seat counted once.">
      <Table
        columns={[
          { label: 'Company', render: r => r.company },
          { label: 'Chairs', render: r => r.seats.filter(s => s.role === 'Chair').length },
          { label: 'Vice-Chairs', render: r => r.seats.filter(s => s.role === 'Vice-Chair').length },
          { label: 'Seats', render: r => r.seats.map(s => `${s.name} (${s.role}, ${s.g.summary})`).join('; ') },
        ]}
        rows={list}
      />
    </Section>
  )
}

// ---------------------------------------------------------------- History

export function HistoryView({ rows }) {
  const today = todayDay()
  const groups = useMemo(() => buildGroups(rows), [rows])
  const [open, setOpen] = useState(null)
  const hasHistory = groups.some(g => g.history.length)
  const quarters = useMemo(() => eventsByQuarter(historyEvents(groups), today), [groups, today])
  const pipe = useMemo(() => pipeline(groups, today), [groups, today])
  const max = Math.max(1, ...quarters.flatMap(q => [q.proposed.length, q.activated.length, q.closed.length]))
  const kinds = [
    { id: 'proposed', label: 'New proposals', bar: 'bg-orange-400', def: 'first time a group entered Proposing' },
    { id: 'activated', label: 'Became Active', bar: 'bg-green-600', def: 'moved from Proposing, Structuring and Chartering or TODO to Active' },
    { id: 'closed', label: 'Archived or cancelled', bar: 'bg-gray-500', def: 'moved to Archived or Cancelled' },
  ]
  const openList = open ? quarters.find(q => q.quarter === open.quarter)[open.kind] : []

  return (
    <div className="space-y-6">
      <FetchedNote groups={groups} today={today} />

      <Section
        title="Group lifecycle per quarter"
        definition={`Status changes recorded in the Jira changelog of every RVG group, including groups now archived, from ${HISTORY_START}. Earlier entries are left out because two bulk workflow migrations (November 2023 and February 2025) reset the status of most groups at once. Dates are when Jira recorded the change; groups marked * already existed (first mailing-list email more than a year earlier) and were entered into Jira late. Click a number to list the groups.`}
      >
        {!hasHistory ? (
          <p className="text-sm text-gray-500 italic">This data file has no Status History column; regenerate it with get-rvg-issues.py.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="px-2 py-2">Quarter</th>
                  {kinds.map(k => <th key={k.id} className="px-2 py-2" title={k.def}>{k.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quarters.map(q => (
                  <tr key={q.quarter}>
                    <td className="px-2 py-2 font-medium whitespace-nowrap">{q.quarter}{q.partial ? ' (to date)' : ''}</td>
                    {kinds.map(k => {
                      const list = q[k.id]
                      const on = open && open.quarter === q.quarter && open.kind === k.id
                      return (
                        <td key={k.id} className="px-2 py-2">
                          <button className="flex items-center gap-2 w-full" onClick={() => setOpen(on ? null : { quarter: q.quarter, kind: k.id })} disabled={!list.length}>
                            <span className={`w-8 text-right font-semibold ${on ? 'text-california-gold' : 'text-berkeley-blue'} ${list.length ? 'underline decoration-dotted' : 'text-gray-300'}`}>{list.length}</span>
                            <span className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                              <span className={`block h-3 ${k.bar}`} style={{ width: `${(list.length / max) * 100}%` }} />
                            </span>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="text-xs text-gray-500 mt-2 list-disc ml-5">
              {kinds.map(k => <li key={k.id}><b>{k.label}</b>: {k.def}.</li>)}
            </ul>
          </div>
        )}
        {open && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{kinds.find(k => k.id === open.kind).label}, {open.quarter} ({openList.length})</h3>
            <Table
              columns={[
                { label: 'Date', render: e => dayToISO(e.day) },
                { label: 'Group', render: e => <span><GroupCell g={e.group} />{e.recordedLate && <span className="text-xs text-gray-500">* existed before (first email {dayToISO(e.group.lifecycleStart)})</span>}</span> },
                { label: 'From status', render: e => e.from },
                { label: 'Status now', render: e => e.group.status },
              ]}
              rows={openList}
            />
          </div>
        )}
      </Section>

      <Section
        title="Groups waiting to be chartered"
        definition="Groups in Proposing or Structuring and Chartering, longest first, with the date they entered that status according to the Jira changelog."
      >
        <Table
          columns={[
            { label: 'Group', render: p => <GroupCell g={p.group} /> },
            { label: 'Governing committee', render: p => <Parents g={p.group} /> },
            { label: 'Status', render: p => p.group.status },
            { label: 'Since', render: p => dayToISO(p.since) },
            { label: 'Time in status', render: p => p.since === null ? '' : `${formatAge(p.since, today)} (${p.days} days)` },
            { label: 'Chair', render: p => p.group.chair ? `${p.group.chair}${p.group.actingChair ? ' (acting)' : ''}` : <span className="text-red-700">None</span> },
            { label: 'Election (RVC)', render: p => <ElectionCell g={p.group} /> },
          ]}
          rows={pipe}
        />
      </Section>
    </div>
  )
}
