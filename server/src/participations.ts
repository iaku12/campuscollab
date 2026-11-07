import { Router } from 'express'
import { pool } from './db'
import { requireAuth, requireRole } from './middleware'

export const participationsRouter = Router()

export function parseId(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string') return null
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

// A student applies to an open campaign
participationsRouter.post(
  '/campaigns/:id/apply',
  requireRole('student'),
  async (req, res, next) => {
    try {
      const campaignId = parseId(req.params.id)
      if (!campaignId) {
        res.status(400).json({ error: 'Invalid campaign id.' })
        return
      }

      const campaign = await pool.query(
        `SELECT status FROM campaigns WHERE id = $1`,
        [campaignId]
      )
      if (!campaign.rows[0]) {
        res.status(404).json({ error: 'Campaign not found.' })
        return
      }
      if (campaign.rows[0].status !== 'Open') {
        res.status(400).json({ error: 'This campaign is closed.' })
        return
      }

      const result = await pool.query(
        `INSERT INTO participations (campaign_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (campaign_id, user_id) DO NOTHING
         RETURNING id, campaign_id, status`,
        [campaignId, req.session.userId]
      )
      if (!result.rows[0]) {
        res.status(409).json({ error: 'You already applied to this campaign.' })
        return
      }
      res.status(201).json(result.rows[0])
    } catch (err) {
      next(err)
    }
  }
)

// A student withdraws their own application
participationsRouter.delete(
  '/campaigns/:id/apply',
  requireRole('student'),
  async (req, res, next) => {
    try {
      const campaignId = parseId(req.params.id)
      if (!campaignId) {
        res.status(400).json({ error: 'Invalid campaign id.' })
        return
      }
      await pool.query(
        `DELETE FROM participations WHERE campaign_id = $1 AND user_id = $2`,
        [campaignId, req.session.userId]
      )
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }
)

// A coordinator lists the applicants for a campaign they own
participationsRouter.get(
  '/campaigns/:id/participants',
  requireRole('coordinator'),
  async (req, res, next) => {
    try {
      const campaignId = parseId(req.params.id)
      if (!campaignId) {
        res.status(400).json({ error: 'Invalid campaign id.' })
        return
      }
      const result = await pool.query(
        `SELECT p.id, p.status, p.created_at, u.name, u.email
         FROM participations p
         JOIN users u ON u.id = p.user_id
         JOIN campaigns c ON c.id = p.campaign_id
         WHERE p.campaign_id = $1 AND c.created_by = $2
         ORDER BY p.created_at`,
        [campaignId, req.session.userId]
      )
      res.json(result.rows)
    } catch (err) {
      next(err)
    }
  }
)

// A coordinator approves or rejects an applicant on their own campaign
participationsRouter.patch(
  '/participations/:id',
  requireRole('coordinator'),
  async (req, res, next) => {
    try {
      const participationId = parseId(req.params.id)
      const { status } = req.body ?? {}
      if (!participationId) {
        res.status(400).json({ error: 'Invalid participation id.' })
        return
      }
      if (status !== 'Approved' && status !== 'Rejected') {
        res.status(400).json({ error: 'Status must be Approved or Rejected.' })
        return
      }

      const result = await pool.query(
        `UPDATE participations p
         SET status = $1
         FROM campaigns c
         WHERE p.id = $2 AND c.id = p.campaign_id AND c.created_by = $3
         RETURNING p.id, p.campaign_id, p.status`,
        [status, participationId, req.session.userId]
      )
      if (!result.rows[0]) {
        res.status(404).json({ error: 'Participation not found.' })
        return
      }
      res.json(result.rows[0])
    } catch (err) {
      next(err)
    }
  }
)

// Anyone logged in sees their own applications
participationsRouter.get('/me/participations', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, campaign_id, status FROM participations WHERE user_id = $1`,
      [req.session.userId]
    )
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})