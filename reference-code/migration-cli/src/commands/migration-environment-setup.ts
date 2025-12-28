import { getPayload } from 'payload'
import { pathToFileURL } from 'node:url'
import * as path from 'node:path'

export async function setupMigrationEnvironment(payloadConfigPath: string) {
  // Change directory context for proper imports
  const originalCwd = process.cwd()
  // Use path utilities for cross-platform safety
  const configDir = path.dirname(payloadConfigPath)

  process.chdir(configDir)

  try {
    // Import the PayloadCMS config
    const importTarget = payloadConfigPath.startsWith('file://')
      ? payloadConfigPath
      : pathToFileURL(payloadConfigPath).href
    const configModule = await import(importTarget)
    const config = configModule.default || configModule

    // Initialize PayloadCMS
    const payload = await getPayload({ config })

    // Extract migration configs from resolved modules
    const migrationConfigs =
      (config as any).resolvedModules?.filter(
        (module: any) => module.migrations && module.migrations.length > 0,
      ) || []

    return {
      payload,
      db: payload.db,
      migrationConfigs,
    }
  } finally {
    // Restore original working directory
    process.chdir(originalCwd)
  }
}
