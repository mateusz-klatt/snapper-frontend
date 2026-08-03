import sonarProperties from '../../sonar-project.properties?raw'
import { describe, expect, it } from 'vitest'

type PermissionLevel = 'read' | 'write'

const workflowModules = import.meta.glob('../../.github/workflows/*.yml', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

const workflows = Object.fromEntries(
  Object.entries(workflowModules).map(([path, source]) => [path.split('/').at(-1) ?? path, source])
) as Record<string, string>

const EXPECTED_JOB_PERMISSIONS = {
  'audit.yml': { 'pnpm-audit': { contents: 'read' } },
  'ci.yml': { check: { contents: 'read' } },
  'dependabot-auto-merge.yml': {
    'auto-merge': { contents: 'write', 'pull-requests': 'write' },
  },
  'e2e.yml': { playwright: { contents: 'read' } },
  'gitleaks.yml': {
    scan: { contents: 'read', 'pull-requests': 'read', 'security-events': 'write' },
  },
  'sonarcloud.yml': { scan: { contents: 'read', 'pull-requests': 'read' } },
} satisfies Record<string, Record<string, Record<string, PermissionLevel>>>

function extractJobBlocks(source: string): Record<string, string[]> {
  const lines = source.split('\n')
  const jobsIndex = lines.findIndex(line => line === 'jobs:')
  const blocks: Record<string, string[]> = {}

  if (jobsIndex < 0) return blocks

  let currentJob: string | undefined

  for (const line of lines.slice(jobsIndex + 1)) {
    const jobMatch = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line)

    if (jobMatch?.[1] !== undefined) {
      currentJob = jobMatch[1]
      blocks[currentJob] = []
      continue
    }

    if (/^\S/.test(line)) break
    if (currentJob !== undefined) blocks[currentJob]?.push(line)
  }

  return blocks
}

function extractPermissions(jobBlock: string[]): Record<string, string> {
  const permissionsIndex = jobBlock.findIndex(line => line === '    permissions:')
  const permissions: Record<string, string> = {}

  if (permissionsIndex < 0) return permissions

  for (const line of jobBlock.slice(permissionsIndex + 1)) {
    if (line.trim() === '') continue

    const permissionMatch = /^ {6}([a-z-]+):\s+(read|write)\s*$/.exec(line)

    if (permissionMatch?.[1] !== undefined && permissionMatch[2] !== undefined) {
      permissions[permissionMatch[1]] = permissionMatch[2]
      continue
    }

    if (!line.startsWith('      ')) break
  }

  return permissions
}

function directRunInterpolations(source: string): string[] {
  const lines = source.split('\n')
  const interpolations: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const runMatch = /^(\s*)run:\s*(.*)$/.exec(line)

    if (runMatch === null) continue

    const indentation = runMatch[1]?.length ?? 0
    const value = runMatch[2] ?? ''

    if (!/^[>|][+-]?$/.test(value)) {
      if (value.includes('${{')) interpolations.push(line)
      continue
    }

    for (let nestedIndex = index + 1; nestedIndex < lines.length; nestedIndex += 1) {
      const nestedLine = lines[nestedIndex] ?? ''

      if (nestedLine.trim() === '') continue

      const nestedIndentation = /^\s*/.exec(nestedLine)?.[0].length ?? 0

      if (nestedIndentation <= indentation) break
      if (nestedLine.includes('${{')) interpolations.push(nestedLine)
    }
  }

  return interpolations
}

function propertyValue(name: string): string | undefined {
  const prefix = `${name}=`
  const line = sonarProperties.split('\n').find(candidate => candidate.startsWith(prefix))

  return line?.slice(prefix.length)
}

describe('workflow security contract', () => {
  it('pins every remote action to a full immutable commit SHA', () => {
    const usesLines = Object.values(workflows).flatMap(source =>
      source.split('\n').filter(line => /^\s*-\s+uses:\s+/.test(line))
    )

    expect(usesLines.length).toBeGreaterThan(0)

    for (const line of usesLines) {
      const action = /^\s*-\s+uses:\s+(\S+)/.exec(line)?.[1]

      expect(action).toMatch(/^[^@\s]+@[0-9a-f]{40}$/)
    }
  })

  it('keeps exact least-privilege permissions on every job', () => {
    expect(Object.keys(workflows).sort()).toEqual(Object.keys(EXPECTED_JOB_PERMISSIONS).sort())

    for (const [filename, expectedJobs] of Object.entries(EXPECTED_JOB_PERMISSIONS)) {
      const source = workflows[filename]

      expect(source).toBeDefined()
      if (source === undefined) continue

      expect(source).not.toMatch(/^permissions:/m)

      const jobBlocks = extractJobBlocks(source)

      expect(Object.keys(jobBlocks).sort()).toEqual(Object.keys(expectedJobs).sort())

      for (const [jobName, expectedPermissions] of Object.entries(expectedJobs)) {
        expect(extractPermissions(jobBlocks[jobName] ?? [])).toEqual(expectedPermissions)
      }
    }
  })

  it('passes runtime context through environment variables instead of run interpolation', () => {
    for (const source of Object.values(workflows)) {
      expect(directRunInterpolations(source)).toEqual([])
    }
  })
})

describe('Sonar test classification contract', () => {
  it('classifies every owned test root without source or coverage suppressions', () => {
    expect(propertyValue('sonar.sources')).toBe('.')
    expect(propertyValue('sonar.tests')).toBe('.')
    expect(propertyValue('sonar.test.inclusions')).toBe(
      'e2e/**,src/test/**,**/*.test.mjs,**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx'
    )
    expect(sonarProperties).not.toMatch(
      /^sonar\.(?:exclusions|coverage\.exclusions|cpd\.exclusions|issue\.ignore)/m
    )
  })
})
