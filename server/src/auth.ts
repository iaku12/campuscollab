import { Router } from 'express'
import argon2 from 'argon2'
import { pool } from './db'

declare module 'express-session' {
  interface SessionData {
    userId: number
    role: 'student' | 'coordinator'
  }
}

export const authRouter = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

authRouter.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, role, inviteCode } = req.body ?? {}

    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required.' })
      return
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: 'A valid email is required.' })
      return
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be 8 to 128 characters.' })
      return
    }
    if (role !== 'student' && role !== 'coordinator') {
      res.status(400).json({ error: 'Role must be student or coordinator.' })
      return
    }
    if (role === 'coordinator' && inviteCode !== process.env.COORDINATOR_INVITE_CODE) {
      res.status(403).json({ error: 'Invalid coordinator invite code.' })
      return
    }

    const passwordHash = await argon2.hash(password)
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, role]
    )
    const user = result.rows[0]

    req.session.regenerate((err) => {
      if (err) return next(err)
      req.session.userId = user.id
      req.session.role = user.role
      res.status(201).json(user)
    })
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'An account with that email already exists.' })
      return
    }
    next(err)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' })
      return
    }

    const result = await pool.query(
      `SELECT id, name, email, role, password_hash FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    )
    const row = result.rows[0]
    const ok = row && (await argon2.verify(row.password_hash, password))
    if (!ok) {
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    req.session.regenerate((err) => {
      if (err) return next(err)
      req.session.userId = row.id
      req.session.role = row.role
      res.json({ id: row.id, name: row.name, email: row.email, role: row.role })
    })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err)
    res.clearCookie('connect.sid')
    res.status(204).end()
  })
})

authRouter.get('/me', async (req, res, next) => {
  try {
    if (!req.session.userId) {
      res.status(401).json({ error: 'Not logged in.' })
      return
    }
    const result = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = $1`,
      [req.session.userId]
    )
    if (!result.rows[0]) {
      res.status(401).json({ error: 'Not logged in.' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})