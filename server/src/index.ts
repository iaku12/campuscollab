import { participationsRouter } from './participations'
import { requireRole } from './middleware'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { authRouter } from './auth'
import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import { pool } from './db'

const app = express()
app.use(cors())
app.use(express.json())
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is missing from server/.env')
}

const PgSession = connectPgSimple(session)

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
)

app.use('/api/auth', authRouter)
app.use('/api', participationsRouter)

const CAMPAIGN_COLUMNS = `id, title, description, to_char(deadline, 'YYYY-MM-DD') AS deadline, status`

app.get('/api/campaigns', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPAIGN_COLUMNS} FROM campaigns ORDER BY created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

   app.post('/api/campaigns', requireRole('coordinator'), async (req, res, next) => {
  try {
    const { title, description, deadline } = req.body ?? {}

    if (typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Campaign name is required.' })
      return
    }
    if (typeof description !== 'string' || !description.trim()) {
      res.status(400).json({ error: 'Description is required.' })
      return
    }
    if (deadline && (typeof deadline !== 'string' || Number.isNaN(Date.parse(deadline)))) {
      res.status(400).json({ error: 'Deadline must be a valid date.' })
      return
    }

       const result = await pool.query(
     `INSERT INTO campaigns (title, description, deadline, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING ${CAMPAIGN_COLUMNS}`,
     [title.trim(), description.trim(), deadline || null, req.session.userId]
   )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on our side.' })
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => console.log(`API running on http://localhost:${port}`))