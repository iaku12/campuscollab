import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'postgres://localhost:5432/campuscollab_test',
      SESSION_SECRET: 'test-secret-not-for-production',
      COORDINATOR_INVITE_CODE: 'test-invite-code',
    },
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
  },
})