import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/cli.ts',
  outDir: 'dist',
  tsconfig: 'tsconfig.json',
  shims: true,
  onSuccess: async () => {
    // Make CLI executable
    const { chmod } = await import('node:fs/promises')
    try {
      await chmod('dist/cli.js', 0o755)
      console.log('✅ Made CLI executable')
    } catch (error) {
      console.warn('⚠️  Could not make CLI executable:', error)
    }
  },
})
