import { afterAll, beforeEach } from 'vitest'
import { pool } from '../src/db'

// Safety guard: these tests delete all data, so they must never touch the real database.
if (!process.env.DATABASE_URL?.includes('_test')) {
  throw new Error('Refusing to run: DATABASE_URL must point to a *_test database.')
}

beforeEach(async () => {
  await pool.query(
    'TRUNCATE submissions, participations, campaigns, users RESTART IDENTITY CASCADE'
  )
})

afterAll(async () => {
  await pool.end()
})