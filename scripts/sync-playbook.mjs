/**
 * Keeps the support AI's internal playbook in step with SUPPORT.md (the app
 * repo's living support reference), in both directions:
 *
 *   1. Facts approved in the admin's Knowledge tab are appended to SUPPORT.md
 *      under "Learned from tickets", so the reference stays the one source.
 *   2. SUPPORT.md is curated into the playbook the ticket drafter reads:
 *      engineering-only sections and code are dropped, and any line with a
 *      secret, IP, private email or redeem code is removed (and listed below).
 *   3. The playbook is stored in D1 and the folded facts are marked as such.
 *
 * The playbook lives in D1, not in this repo, because this repo is public.
 *
 *   npm run playbook:sync                  production database
 *   npm run playbook:sync -- --preview     the preview database
 *   npm run playbook:sync -- --local       the local database `npm run dev:support` uses
 *   npm run playbook:sync -- --dry-run     print what would change; touch nothing
 *   npm run playbook:sync -- --support <path to SUPPORT.md>
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SENSITIVE } from '../integrations/support-kb.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)

const SUPPORT_MD = option('--support') ?? fileURLToPath(new URL('../../Odin/SUPPORT.md', import.meta.url))
const PREVIEW = flag('--preview')
const LOCAL = flag('--local')
const DRY_RUN = flag('--dry-run')
const DB = PREVIEW ? 'silk-support-preview' : 'silk-support'
const WHERE = LOCAL ? `${DB} (local)` : DB

/** Sections that are engineering detail, not support knowledge. An excluded ## drops its ### too. */
const EXCLUDED_SECTIONS = [
  /^Renderer windows/,
  /^Product \/ funnel map/,
  /^5\. Backend architecture/,
  /^Backend health check/,
  /^9\. Telemetry/,
  /^10\. Quick facts/,
  /^Local dev/,
]

/**
 * The drafter's playbook goes only to the AI provider, never to customers, so
 * it may name partners and the call-booking link. Credentials of any kind may
 * not appear: secrets, IPs, the private release repo, redeem codes.
 */
const PLAYBOOK_RULES = [
  ...SENSITIVE.filter(([what]) => what !== 'an internal link or code' && what !== 'a payment-platform product ID'),
  ['a private repo or redeem code', /ijuwebdesk\/learn|OdinExclusive|dfy\?k=/i],
]
const ALLOWED_EMAILS = /^(?:support|hello)@hey(?:silk|odin)ai\.com$/i

const LEARNED_HEADING = '## Learned from tickets'

function d1(argsForWrangler) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, LOCAL ? '--local' : '--remote', ...(PREVIEW ? ['-e', 'preview'] : []), ...argsForWrangler],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  )
  return out
}

function query(sql) {
  return JSON.parse(d1(['--json', '--command', sql]))[0].results
}

const sqlString = (s) => `'${s.replace(/'/g, "''")}'`
const day = (ms) => new Date(ms).toISOString().slice(0, 10)

/** Appends facts to SUPPORT.md's "Learned from tickets" section, creating it before the open questions. */
function appendFacts(source, facts) {
  if (!facts.length) return source
  const lines = facts.map(
    (f) =>
      `- ${f.fact.replace(/\s*\n\s*/g, ' ')} _(${day(f.created_at)}${f.ticket_id ? `, SILK-${f.ticket_id}` : ''}` +
      `${f.audience === 'public' ? ', public' : ''})_`,
  )
  if (source.includes(LEARNED_HEADING)) {
    // Add to the end of the existing section, i.e. just before the next ## heading (or the end).
    const start = source.indexOf(LEARNED_HEADING)
    const next = source.slice(start + LEARNED_HEADING.length).search(/\n## /)
    const at = next === -1 ? source.length : start + LEARNED_HEADING.length + next
    return `${source.slice(0, at).trimEnd()}\n${lines.join('\n')}\n${source.slice(at)}`
  }
  const section =
    `${LEARNED_HEADING}\n\n` +
    `_Approved in the support admin's Knowledge tab and folded in by \`npm run playbook:sync\` in the docs repo._\n` +
    `_Move each into its proper section when convenient; "public" ones are safe for the help docs._\n\n` +
    `${lines.join('\n')}\n\n---\n\n`
  const openQuestions = source.indexOf('## Open questions')
  if (openQuestions === -1) return `${source.trimEnd()}\n\n---\n\n${section}`
  return source.slice(0, openQuestions) + section + source.slice(openQuestions)
}

/** SUPPORT.md -> the playbook the drafter reads. Returns the text and the lines it removed. */
function curate(source) {
  const removed = []
  const kept = []
  let skipLevel = 0 // heading depth being skipped, 0 = keeping
  let inCode = false
  let started = false

  for (const line of source.split('\n')) {
    const heading = line.match(/^(#{2,3}) (.+)$/)
    if (heading && !inCode) {
      started = true
      const level = heading[1].length
      if (skipLevel && level > skipLevel) continue
      skipLevel = EXCLUDED_SECTIONS.some((re) => re.test(heading[2])) ? level : 0
    }
    if (!started || skipLevel) continue // the file's own preamble, or an excluded section
    if (/^\s*```/.test(line)) {
      inCode = !inCode
      continue
    }
    if (inCode) continue

    const cleaned = line
      // Links into the app's source tree mean nothing to the drafter; keep the words.
      .replace(/\[([^\]]+)\]\((?!https?:)[^)]*\)/g, '$1')
      .replace(/support\.heyodinai\.com/g, 'support.heysilkai.com')
      .replace(/using-odin-effectively/g, 'using-silk-effectively')
    const rule = PLAYBOOK_RULES.find(([, re]) => re.test(cleaned))
    const email = (cleaned.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []).find((e) => !ALLOWED_EMAILS.test(e))
    if (rule || email) {
      removed.push({ why: rule ? rule[0] : `the email address ${email}`, line: cleaned.trim() })
      continue
    }
    kept.push(cleaned)
  }
  return { text: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(), removed }
}

// ── Run ──────────────────────────────────────────────────────────────────────
const source = readFileSync(SUPPORT_MD, 'utf8')
const facts = query(
  "SELECT id, fact, audience, ticket_id, created_at FROM knowledge WHERE status = 'approved' ORDER BY id",
)
const updated = appendFacts(source, facts)
const { text: playbook, removed } = curate(updated)

// D1 caps a single statement at 100 KB.
if (playbook.length > 90_000) {
  throw new Error(`The playbook is ${Math.round(playbook.length / 1000)}k characters; D1 takes about 90k. Exclude more sections.`)
}

console.log(`${WHERE}: ${facts.length} approved fact(s) to fold into SUPPORT.md`)
console.log(`Playbook: ${Math.round(playbook.length / 1000)}k characters (~${Math.round(playbook.length / 4000)}k tokens)`)
if (removed.length) {
  console.log(`\nLeft out of the playbook (${removed.length} line(s)):`)
  for (const r of removed) console.log(`  [${r.why}] ${r.line.slice(0, 140)}`)
}

if (DRY_RUN) {
  const out = join(mkdtempSync(join(tmpdir(), 'silk-playbook-')), 'playbook.md')
  writeFileSync(out, playbook)
  console.log(`\nDry run: nothing changed. The playbook would be:\n  ${out}`)
  process.exit(0)
}

const now = Date.now()
const statements = [
  `INSERT INTO settings (key, value, updated_at) VALUES ('playbook', ${sqlString(playbook)}, ${now})
   ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
]
if (facts.length) {
  statements.push(
    `UPDATE knowledge SET status = 'folded', folded_at = ${now}, updated_at = ${now}
     WHERE id IN (${facts.map((f) => f.id).join(', ')});`,
  )
}
const sqlFile = join(mkdtempSync(join(tmpdir(), 'silk-playbook-')), 'sync.sql')
writeFileSync(sqlFile, statements.join('\n'))
d1(['--file', sqlFile, '--yes'])

// Written last: if the upload failed, SUPPORT.md is untouched and the facts are still "approved".
if (facts.length) writeFileSync(SUPPORT_MD, updated)

console.log(`\nPlaybook stored in ${WHERE}.`)
if (facts.length) {
  console.log(`SUPPORT.md updated (${SUPPORT_MD}); commit it in the app repo.`)
  const pub = facts.filter((f) => f.audience === 'public')
  if (pub.length) {
    console.log(`\nMarked public, so worth a line in the help docs too:`)
    for (const f of pub) console.log(`  - ${f.fact}`)
  }
}
