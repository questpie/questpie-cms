import type { DrizzleSnapshotJSON } from 'drizzle-kit/api'
import { deepEqual } from 'node:assert'

export type SnapshotOperation = {
  type: 'set' | 'remove'
  path: string
  value?: any
  timestamp: string
  migrationId: string
}

export type OperationSnapshot = {
  operations: SnapshotOperation[]
  metadata: {
    migrationId: string
    moduleId: string
    timestamp: string
    prevId?: string
  }
}

export class OperationSnapshotManager {
  /**
   * Generate operations by comparing two snapshots
   */
  generateOperations(
    oldSnapshot: DrizzleSnapshotJSON,
    newSnapshot: DrizzleSnapshotJSON,
    migrationId: string,
  ): SnapshotOperation[] {
    const operations: SnapshotOperation[] = []
    const timestamp = new Date().toISOString()

    // Compare tables
    this.compareObjects(
      oldSnapshot.tables || {},
      newSnapshot.tables || {},
      'tables',
      operations,
      timestamp,
      migrationId,
    )

    // Compare enums
    this.compareObjects(
      oldSnapshot.enums || {},
      newSnapshot.enums || {},
      'enums',
      operations,
      timestamp,
      migrationId,
    )

    // Compare schemas
    this.compareObjects(
      oldSnapshot.schemas || {},
      newSnapshot.schemas || {},
      'schemas',
      operations,
      timestamp,
      migrationId,
    )

    // Compare sequences
    this.compareObjects(
      oldSnapshot.sequences || {},
      newSnapshot.sequences || {},
      'sequences',
      operations,
      timestamp,
      migrationId,
    )

    // Compare roles
    this.compareObjects(
      oldSnapshot.roles || {},
      newSnapshot.roles || {},
      'roles',
      operations,
      timestamp,
      migrationId,
    )

    // Compare policies
    this.compareObjects(
      oldSnapshot.policies || {},
      newSnapshot.policies || {},
      'policies',
      operations,
      timestamp,
      migrationId,
    )

    // Compare views
    this.compareObjects(
      oldSnapshot.views || {},
      newSnapshot.views || {},
      'views',
      operations,
      timestamp,
      migrationId,
    )

    // Compare _meta
    this.compareObjects(
      oldSnapshot._meta || {},
      newSnapshot._meta || {},
      '_meta',
      operations,
      timestamp,
      migrationId,
    )

    return operations
  }

  /**
   * Build a snapshot from a series of operations
   */
  buildSnapshotFromOperations(
    operations: SnapshotOperation[],
    baseSnapshot?: DrizzleSnapshotJSON,
  ): DrizzleSnapshotJSON {
    const snapshot: DrizzleSnapshotJSON = baseSnapshot || this.getDefaultSnapshot()

    // Sort operations by timestamp to ensure correct order
    const sortedOperations = operations.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    for (const operation of sortedOperations) {
      if (operation.type === 'set') {
        this.setNestedProperty(snapshot, operation.path, operation.value)
      } else if (operation.type === 'remove') {
        this.removeNestedProperty(snapshot, operation.path)
      }
    }

    return snapshot
  }

  /**
   * Deduplicate operations (remove redundant operations)
   */
  deduplicateOperations(operations: SnapshotOperation[]): SnapshotOperation[] {
    const operationMap = new Map<string, SnapshotOperation>()

    // Sort by timestamp to process in order
    const sortedOperations = operations.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    for (const operation of sortedOperations) {
      const key = operation.path
      const existingOperation = operationMap.get(key)

      if (!existingOperation) {
        operationMap.set(key, operation)
      } else if (operation.type === 'remove') {
        // Remove operation always wins
        operationMap.set(key, operation)
      } else if (operation.type === 'set' && existingOperation.type === 'remove') {
        // Set after remove - keep the set
        operationMap.set(key, operation)
      } else if (operation.type === 'set' && existingOperation.type === 'set') {
        // Later set operation wins
        operationMap.set(key, operation)
      }
    }

    return Array.from(operationMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  private compareObjects(
    oldObj: any,
    newObj: any,
    basePath: string,
    operations: SnapshotOperation[],
    timestamp: string,
    migrationId: string,
  ): void {
    // Handle null/undefined objects
    const safeOldObj = oldObj === null || oldObj === undefined ? {} : oldObj
    const safeNewObj = newObj === null || newObj === undefined ? {} : newObj

    // Check for removed properties
    for (const key in safeOldObj) {
      if (!(key in safeNewObj)) {
        operations.push({
          type: 'remove',
          path: `${basePath}.${this.encodeKey(key)}`,
          timestamp,
          migrationId,
        })
      }
    }

    // Check for added or modified properties
    for (const key in safeNewObj) {
      const oldValue = safeOldObj[key]
      const newValue = safeNewObj[key]
      const currentPath = `${basePath}.${this.encodeKey(key)}`

      if (!(key in safeOldObj)) {
        // New property - only create operation if value is not undefined
        if (newValue !== undefined) {
          operations.push({
            type: 'set',
            path: currentPath,
            value: newValue,
            timestamp,
            migrationId,
          })
        }
      } else if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
        // Recursively compare objects
        this.compareObjects(oldValue, newValue, currentPath, operations, timestamp, migrationId)
      } else if (!this.deepEqual(oldValue, newValue)) {
        // Modified property - only create operation if new value is not undefined
        // or if we're explicitly setting undefined (old value was not undefined)
        if (newValue !== undefined || oldValue !== undefined) {
          operations.push({
            type: 'set',
            path: currentPath,
            value: newValue,
            timestamp,
            migrationId,
          })
        }
      }
    }
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.').map((key) => this.decodeKey(key))
    let current = obj

    if (value === undefined) {
      return
    }

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    const finalKey = keys[keys.length - 1]!
    current[finalKey] = value
  }

  private removeNestedProperty(obj: any, path: string): void {
    const keys = path.split('.').map((key) => this.decodeKey(key))
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!
      if (!(key in current) || typeof current[key] !== 'object') {
        return // Property doesn't exist, nothing to remove
      }
      current = current[key]
    }

    const finalKey = keys[keys.length - 1]!
    delete current[finalKey]
  }

  private deepEqual(a: any, b: any): boolean {
    try {
      // Use a more robust deep equality check
      return JSON.stringify(this.normalizeObject(a)) === JSON.stringify(this.normalizeObject(b))
    } catch {
      return false
    }
  }

  /**
   * Normalize object structure to ensure consistent comparison
   * Sorts object keys and handles arrays consistently
   */
  private normalizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.normalizeObject(item))
    }

    if (typeof obj === 'object') {
      const normalized: any = {}
      const sortedKeys = Object.keys(obj).sort()
      for (const key of sortedKeys) {
        normalized[key] = this.normalizeObject(obj[key])
      }
      return normalized
    }

    return obj
  }

  /**
   * Encode dots in key names to avoid conflicts with path separators
   * Replaces '.' with '__DOT__' in key names
   */
  private encodeKey(key: string): string {
    return key.replace(/\./g, '__DOT__')
  }

  /**
   * Decode dots in key names back to original form
   * Replaces '__DOT__' with '.' in key names
   */
  private decodeKey(key: string): string {
    return key.replace(/__DOT__/g, '.')
  }

  private getDefaultSnapshot(): DrizzleSnapshotJSON {
    return {
      id: '00000000-0000-0000-0000-000000000000',
      _meta: {
        columns: {},
        schemas: {},
        tables: {},
      },
      dialect: 'postgresql',
      enums: {},
      prevId: '00000000-0000-0000-0000-00000000000',
      schemas: {},
      tables: {},
      version: '7',
      policies: {},
      views: {},
      sequences: {},
      roles: {},
    }
  }
}
