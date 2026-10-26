import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, 'uat-test-cases.json')
const seedPath = path.join(root, 'supabase', 'seed.sql')
const cases = JSON.parse(await readFile(sourcePath, 'utf8'))
const requiredFields = ['id', 'module', 'section', 'category', 'num', 'title', 'desc', 'steps', 'expected']

if (!Array.isArray(cases) || cases.length !== 266) {
  throw new Error(`Expected 266 source scenarios; received ${cases?.length ?? 'invalid data'}.`)
}

const ids = new Set()
for (const [index, scenario] of cases.entries()) {
  if (!requiredFields.every((field) => field in scenario)) {
    throw new Error(`Scenario at index ${index} is missing a required field.`)
  }
  if (ids.has(scenario.id)) throw new Error(`Duplicate scenario ID: ${scenario.id}`)
  ids.add(scenario.id)
  if (!Number.isInteger(scenario.num)) throw new Error(`Scenario ${scenario.id} has an invalid source number.`)
  for (const field of ['steps', 'expected']) {
    if (!Array.isArray(scenario[field]) || !scenario[field].every((item) => typeof item === 'string')) {
      throw new Error(`Scenario ${scenario.id} has invalid ${field}; expected an array of strings.`)
    }
  }
}

const sqlText = (value) => `'${String(value).replaceAll("'", "''")}'`
const sqlJson = (value) => `${sqlText(JSON.stringify(value))}::jsonb`
const rows = cases.map((scenario, index) => {
  const values = [
    sqlText(scenario.id),
    String(index + 1),
    sqlText(scenario.module),
    sqlText(scenario.section),
    sqlText(scenario.category),
    String(scenario.num),
    sqlText(scenario.title),
    sqlText(scenario.desc),
    sqlJson(scenario.steps),
    sqlJson(scenario.expected),
    'true',
  ]
  return `  (${values.join(', ')})`
})

const generated = [
  '-- Idempotent seed: built-in scenarios are inserted once and never overwrite edits/history.',
  'insert into public.projects (id, name, description)',
  "values ('7f1c2c87-1e5b-4dc1-8e2b-88a40c9fe732', 'SPS Nexus', 'Shared SPS Nexus UAT project')",
  'on conflict (name) do nothing;',
  '',
  'insert into public.scenarios (id, source_order, module, section, category, source_number, title, description, steps, expected, is_builtin)',
  'values',
  `${rows.join(',\n')}\non conflict (id) do nothing;\n`,
].join('\n')

if (process.argv.includes('--check')) {
  const existing = await readFile(seedPath, 'utf8')
  if (existing !== generated) throw new Error('supabase/seed.sql is out of sync; run npm run seed:generate.')
  console.log(`Seed is in sync with all ${cases.length} source scenarios.`)
} else {
  await writeFile(seedPath, generated, 'utf8')
  console.log(`Generated supabase/seed.sql from ${cases.length} source scenarios.`)
}
