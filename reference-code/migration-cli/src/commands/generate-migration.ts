import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import payload from 'payload'
import { DrizzleMigrationGenerator } from '../utils/drizzle-migration-generator.js'
import { uniqueNamesGenerator, adjectives, animals, colors } from 'unique-names-generator'
import { AstModuleUpdater } from '../utils/ast-module-updater.js'

type GenerateMigrationOptions = {
  name?: string
  dryRun?: boolean
  verbose?: boolean
}

export async function generateMigration(opts: GenerateMigrationOptions) {
  // Load environment first, before any other operations
  await loadEnvironmentForPackage(process.cwd())

  const cwd = process.cwd()

  // Detect current package context
  const packageInfo = await detectPackageContext(cwd)

  if (!packageInfo) {
    throw new Error('Not in a valid package directory with payload.config.ts and package.json')
  }

  // Get module dependencies
  const dependencies = await getModuleDependencies(packageInfo.moduleFilePath)

  // Generate timestamp first, then random name
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').slice(0, 14)

  // Generate random name if not provided
  const randomName =
    opts.name ||
    uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: '_',
      length: 3,
      style: 'lowerCase',
    })

  // New format: timestamp_random_name
  const fileBaseName = `${timestamp}_${randomName}`

  // Convert to camelCase with timestamp at end for variable name
  const camelCaseName = toCamelCase(randomName)
  const migrationVariableName = `${camelCaseName}${timestamp}`

  console.log(`📝 Generated migration name: ${fileBaseName}`)
  console.log(`🔤 Variable name: ${migrationVariableName}`)

  if (!opts.dryRun) {
    // Get cumulative snapshot from dependencies
    // Always include current package to pick up its existing migrations
    // This is needed for both monorepo and external projects
    const repoRoot = findRepoRoot()
    const dependenciesToProcess = [...dependencies, packageInfo.name]
    const cumulativeSnapshot = await getCumulativeSnapshot(
      dependenciesToProcess,
      packageInfo.name,
      opts.verbose,
    )

    // Load PayloadCMS in current package context to get current package schema
    await setupPayloadInContext(packageInfo.configPath)

    // Generate migration using Drizzle API with cumulative snapshot
    const result = await generateDrizzleMigration({
      migrationName: migrationVariableName,
      fileBaseName,
      moduleId: packageInfo.name,
      payload,
      migrationDir: packageInfo.migrationsDir,
      cumulativeSnapshot,
    })

    if (result.skipped) {
      console.log('⏭️  No schema changes detected, skipping migration generation')
    } else {
      // Update migrations index
      await updateMigrationsIndex(packageInfo, result.fileName!, migrationVariableName)

      // Update module file if exists
      await updateModuleFile(packageInfo, migrationVariableName)

      console.log('✅ Migration generated successfully!')
    }
  } else {
    console.log('🔍 DRY RUN - Would generate migration with the following details:')
    console.log(`File name: ${fileBaseName}.ts`)
    console.log(`Variable name: ${migrationVariableName}`)
    console.log(`Package: ${packageInfo.name}`)
    console.log(`Dependencies: ${dependencies.join(', ')}`)
  }
}

async function detectPackageContext(cwd: string) {
  // Look for payload.config.ts in current directory
  const configPath = path.join(cwd, 'payload.config.ts')
  const packageJsonPath = path.join(cwd, 'package.json')

  if (!existsSync(configPath) || !existsSync(packageJsonPath)) {
    return null
  }

  // Get package name from package.json
  let packageName = 'unknown'
  let fullPackageName = 'unknown'
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    packageName = packageJson.name?.replace('@questpie/', '') || path.basename(cwd)
    fullPackageName = packageJson.name || path.basename(cwd)
  } catch {
    packageName = path.basename(cwd)
    fullPackageName = packageName
  }

  // Find module file at src/{packageName}.module.ts
  const moduleFilePath = path.join(cwd, 'src', `${packageName}.module.ts`)
  if (!existsSync(moduleFilePath)) {
    console.error(`❌ Module file not found: ${moduleFilePath}`)
    return null
  }

  const migrationsDir = path.join(cwd, 'src', 'migrations')

  return {
    name: packageName,
    fullName: fullPackageName,
    configPath,
    moduleFilePath,
    migrationsDir,
    packageRoot: cwd,
  }
}

async function getModuleDependencies(moduleFilePath: string): Promise<string[]> {
  try {
    const content = readFileSync(moduleFilePath, 'utf-8')

    // Extract imports array from module definition
    const importsMatch = content.match(/imports:\s*\[([\s\S]*?)\]/m)
    if (!importsMatch) return []

    const importsContent = importsMatch[1]
    const moduleMatches = importsContent?.match(/(\w+)Module/g) || []

    const dependencies = moduleMatches
      .map((match) => match.replace('Module', '').toLowerCase())
      .filter((dep) => dep !== 'core') // Remove core as it's handled separately

    // Always put core first if there are any dependencies
    if (dependencies.length > 0 || importsContent?.includes('CoreModule')) {
      return ['core', ...dependencies]
    }

    return dependencies
  } catch (error) {
    console.warn(`⚠️  Failed to parse module dependencies from ${moduleFilePath}: ${error}`)
    return []
  }
}

function findRepoRoot(): string | null {
  let current = process.cwd()

  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, 'turbo.json'))) {
      return current
    }
    current = path.dirname(current)
  }

  // Return null if no turbo.json found (external package context)
  return null
}

function resolveModuleSnapshotsPath(
  moduleId: string,
  repoRoot: string | null,
  currentPackageName?: string,
): string | null {
  try {
    // If this is the current package, look in local src directory first
    if (currentPackageName && moduleId === currentPackageName) {
      const localSnapshotsPath = path.join(process.cwd(), 'src', 'migrations', 'snapshots')
      if (existsSync(localSnapshotsPath)) {
        console.log(`📂 Found local snapshots for ${moduleId}: ${localSnapshotsPath}`)
        return localSnapshotsPath
      }
      // If no local snapshots exist yet, this is expected for first migration
      console.log(`📂 No local snapshots found for ${moduleId} (first migration)`)
      return null
    }

    // Try monorepo path first if we have a repo root
    if (repoRoot) {
      const monorepoPath = path.join(
        repoRoot,
        'packages',
        moduleId,
        'src',
        'migrations',
        'snapshots',
      )
      if (existsSync(monorepoPath)) {
        return monorepoPath
      }
    }

    // Try to resolve as installed package
    const packageName = `@questpie/${moduleId}`
    try {
      const packageJsonPath = require.resolve(`${packageName}/package.json`)
      const packageDir = path.dirname(packageJsonPath)

      const distSnapshotsPath = path.join(packageDir, 'dist', 'migrations', 'snapshots')
      if (existsSync(distSnapshotsPath)) {
        return distSnapshotsPath
      }

      // Check for ESM compiled snapshots in dist/src/migrations/snapshots (common build pattern)
      const distSrcSnapshotsPath = path.join(packageDir, 'dist', 'src', 'migrations', 'snapshots')
      if (existsSync(distSrcSnapshotsPath)) {
        return distSrcSnapshotsPath
      }

      // Fallback to src if dist doesn't exist (development scenario)
      const srcSnapshotsPath = path.join(packageDir, 'src', 'migrations', 'snapshots')
      if (existsSync(srcSnapshotsPath)) {
        return srcSnapshotsPath
      }

      // If no snapshots directory exists, this is expected for packages without migrations
      console.log(`ℹ️  No snapshots found for module ${moduleId} (package has no migrations)`)
      return null
    } catch (error) {
      console.warn(`⚠️  Could not resolve package ${packageName}: ${error}`)
      return null
    }
  } catch (error) {
    console.warn(`⚠️  Error resolving module snapshots for ${moduleId}: ${error}`)
    return null
  }
}

async function getCumulativeSnapshot(
  dependencies: string[],
  currentPackageName: string,
  verbose?: boolean,
) {
  if (dependencies.length === 0) {
    return getDefaultSnapshot()
  }

  const { DrizzleMigrationGenerator } = await import('../utils/drizzle-migration-generator.js')
  const generator = new DrizzleMigrationGenerator()
  const repoRoot = findRepoRoot()

  const pathResolver = (moduleId: string, repoRoot: string | null) =>
    resolveModuleSnapshotsPath(moduleId, repoRoot, currentPackageName)

  return await generator.getCumulativeSnapshot(dependencies, repoRoot, pathResolver, verbose)
}

async function loadEnvironmentForPackage(packagePath: string) {
  try {
    const { config } = await import('dotenv')

    // Search upward for .env files
    let currentDir = path.resolve(packagePath)
    const loadedFiles: string[] = []

    while (currentDir !== path.dirname(currentDir)) {
      const envFiles = ['.env.local', '.env.development', '.env']

      for (const envFile of envFiles) {
        const envPath = path.join(currentDir, envFile)
        if (existsSync(envPath)) {
          const result = config({ path: envPath, override: false })
          if (result.parsed) {
            loadedFiles.push(envPath)
          }
        }
      }

      currentDir = path.dirname(currentDir)
    }
  } catch (error) {
    console.warn(`⚠️  Failed to load environment: ${error}`)
  }
}

async function setupPayloadInContext(configPath: string) {
  try {
    // Import config (environment should already be loaded)
    // Dynamic import requires a file:// URL for absolute Windows paths
    const importTarget = configPath.startsWith('file://')
      ? configPath
      : pathToFileURL(configPath).href

    const configPromise = await import(importTarget)
    let config = await configPromise
    if (config.default) {
      config = await config.default
    }

    // Initialize PayloadCMS in current context
    await payload.init({
      config,
      disableDBConnect: true,
      disableOnInit: true,
    })
  } catch (error) {
    throw new Error(`Failed to setup PayloadCMS: ${error}`)
  }
}

async function generateDrizzleMigration(options: {
  migrationName: string
  fileBaseName: string
  moduleId: string
  payload: any
  migrationDir: string
  cumulativeSnapshot?: any
}) {
  const generator = new DrizzleMigrationGenerator()

  // Create migrations directory if needed
  if (!existsSync(options.migrationDir)) {
    mkdirSync(options.migrationDir, { recursive: true })
  }

  // Import the generated schema file to get the actual Drizzle schema definitions
  // The schema should be all the exported objects from the schema file
  const schema = {
    ...options.payload.db.tables,
    ...options.payload.db.enums,
    ...options.payload.db.relations,
  }

  console.log(`📊 Loaded schema with ${Object.keys(schema).length} definitions`)

  // Use the new operation-based generator
  const result = await generator.generateMigration({
    migrationName: options.migrationName,
    fileBaseName: options.fileBaseName,
    moduleId: options.moduleId,
    schema,
    migrationDir: options.migrationDir,
    cumulativeSnapshot: options.cumulativeSnapshot,
  })

  console.log(
    `📊 Using previous snapshot as base with ${Object.keys(result.snapshot.tables || {}).length} tables in final state`,
  )

  return result
}

function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, (char) => char.toLowerCase())
}

function getDefaultSnapshot() {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    _meta: { columns: {}, schemas: {}, tables: {} },
    dialect: 'postgresql',
    enums: {},
    prevId: '00000000-0000-0000-0000-00000000000',
    schemas: {},
    tables: {},
    version: '7',
  }
}

async function updateMigrationsIndex(packageInfo: any, fileName: string, migrationName: string) {
  const indexPath = path.join(packageInfo.migrationsDir, 'index.ts')

  // Check if index already exists and has migrations
  const existingMigrations: Array<{ fileName: string; migrationName: string }> = []
  if (existsSync(indexPath)) {
    try {
      const existingContent = readFileSync(indexPath, 'utf-8')

      // Extract migration imports only (exclude defineModuleMigrations)
      // Handle both relative (./) and absolute package paths
      const importMatches = existingContent.matchAll(
        /import { (\w+) } from '(?:\.\/|.*\/)([^'\/]+)'/g,
      )
      for (const match of importMatches) {
        const migrationVarName = match[1]
        const fileBaseName = match[2]

        // Skip the defineModuleMigrations import and only include actual migrations
        if (migrationVarName && fileBaseName && migrationVarName !== 'defineModuleMigrations') {
          // Verify the migration file actually exists
          const migrationFilePath = path.join(packageInfo.migrationsDir, `${fileBaseName}.ts`)
          if (existsSync(migrationFilePath)) {
            existingMigrations.push({
              fileName: fileBaseName,
              migrationName: migrationVarName,
            })
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not parse existing migrations index:', error)
    }
  }

  // Add new migration if not already present
  const existingIndex = existingMigrations.findIndex((m) => m.fileName === fileName)
  if (existingIndex >= 0) {
    // Update existing migration
    existingMigrations[existingIndex] = { fileName, migrationName }
  } else {
    // Add new migration
    existingMigrations.push({ fileName, migrationName })
  }

  // Use relative paths for imports instead of package names
  const imports = existingMigrations
    .map((m) => `import { ${m.migrationName} } from './${m.fileName}'`)
    .join('\n')

  const migrationsArray = existingMigrations.map((m) => `      ${m.migrationName}`).join(',\n')

  const content = `import { defineModuleMigrations } from '@questpie/core/backend/definitions/migration.definitions'
${imports}

export const ${packageInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}Migrations = defineModuleMigrations(
  '${packageInfo.name}',
  (ioc) => ({
    migrations: [
${migrationsArray}
    ],
  })
)
`

  writeFileSync(indexPath, content)
}

async function updateModuleFile(packageInfo: any, migrationName: string) {
  const moduleFilePath = packageInfo.moduleFilePath

  if (!existsSync(moduleFilePath)) {
    console.warn(`⚠️  Module file not found: ${moduleFilePath}`)
    return
  }

  try {
    const astUpdater = new AstModuleUpdater()
    astUpdater.updateModuleFile(moduleFilePath, packageInfo.name, packageInfo.fullName)
  } catch (error) {
    console.warn(`⚠️  Failed to update module file using AST: ${error}`)
    console.warn('⚠️  Falling back to manual update')

    // Fallback to the old string-based approach if AST fails
    await updateModuleFileStringBased(packageInfo, migrationName)
  }
}

async function updateModuleFileStringBased(packageInfo: any, migrationName: string) {
  const moduleFilePath = packageInfo.moduleFilePath

  try {
    const content = readFileSync(moduleFilePath, 'utf-8')
    const migrationsVariableName = `${packageInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}Migrations`

    // Check if migrations are already imported and used
    const hasImport = content.includes(migrationsVariableName)
    const hasInDefinitions =
      content.includes(migrationsVariableName) && content.includes('definitions:')

    if (hasImport && hasInDefinitions) {
      return
    }

    let updatedContent = content

    // Add import if not present
    if (!hasImport) {
      const importStatement = `import { ${migrationsVariableName} } from '${packageInfo.fullName}/migrations/index'\n`

      // Find the last import statement
      const lines = updatedContent.split('\n')
      let lastImportIndex = -1

      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.trim().startsWith('import ')) {
          lastImportIndex = i
        }
      }

      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, importStatement.trim())
        updatedContent = lines.join('\n')
      }
    }

    // Add to definitions array if not present
    if (!hasInDefinitions) {
      // Find the definitions array and add migrations
      const definitionsMatch = updatedContent.match(/(definitions:\s*\[)([\s\S]*?)(\],?)/m)

      if (definitionsMatch) {
        const before = definitionsMatch[1]
        const definitionsContent = definitionsMatch[2]
        const after = definitionsMatch[3]

        // Add migrations at the end of definitions array
        const newDefinitionsContent = definitionsContent?.trim()
          ? `${definitionsContent.trim()},\n\n    // migrations\n    ${migrationsVariableName},`
          : `\n    // migrations\n    ${migrationsVariableName},\n  `

        updatedContent = updatedContent.replace(
          definitionsMatch[0],
          `${before}${newDefinitionsContent}\n  ${after}`,
        )
      }
    }

    writeFileSync(moduleFilePath, updatedContent)
  } catch (error) {
    console.warn(`⚠️  Failed to update module file: ${error}`)
  }
}
