import { Router } from 'express'
import { pool } from './db'
import { requireRole } from './middleware'
import { parseId } from './participations'

export const submissionsRouter = Router()

// Only accept normal web links. This rejects things like javascript: URLs,
// which would be dangerous if they were ever shown as clickable links.
function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

// An APPROVED student submits (or updates) their content link
submissionsRouter.put(
  '/campaigns/:id/submission',
  requireRole('student'),
  async (req, res, next) => {
    try {
      const campaignId = parseId(req.params.id)
      if (!campaignId) {
        res.status(400).json({ error: 'Invalid campaign id.' })
        return
      }
      const url = cleanUrl(req.body?.url)
      if (!url) {
        res.status(400).json({ error: 'Please enter a valid http or https link.' })
        return
      }

      const participation = await pool.query(
        `SELECT id FROM participations
         WHERE campaign_id = $1 AND user_id = $2 AND status = 'Approved'`,
        [campaignId, req.session.userId]
      )
      if (!participation.rows[0]) {
        res.status(403).json({ error: 'You must be approved for this campaign first.' })
        return
      }

      const result = await pool.query(
        `INSERT INTO submissions (participation_id, url)
         VALUES ($1, $2)
         ON CONFLICT (participation_id) DO UPDATE
           SET url = EXCLUDED.url, status = 'Submitted', feedback = NULL, updated_at = now()
           WHERE submissions.status <> 'Approved'
         RETURNING id, url, status, feedback`,
        [participation.rows[0].id, url]
      )
      if (!result.rows[0]) {
        res.status(409).json({ error: 'An approved submission cannot be changed.' })
        return
      }
      res.json(result.rows[0])
    } catch (err) {
      next(err)
    }
  }
)

// A student sees their own submissions
submissionsRouter.get('/me/submissions', requireRole('student'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT s.id, p.campaign_id, s.url, s.status, s.feedback
       FROM submissions s
       JOIN participations p ON p.id = s.participation_id
       WHERE p.user_id = $1`,
      [req.session.userId]
    )
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

// A coordinator lists submissions for a campaign they own
submissionsRouter.get(
  '/campaigns/:id/submissions',
  requireRole('coordinator'),
  async (req, res, next) => {
    try {
      const campaignId = parseId(req.params.id)
      if (!campaignId) {
        res.status(400).json({ error: 'Invalid campaign id.' })
        return
      }
      const result = await pool.query(
        `SELECT s.id, s.url, s.status, s.feedback, u.name, u.email
         FROM submissions s
         JOIN participations p ON p.id = s.participation_id
         JOIN users u ON u.id = p.user_id
         JOIN campaigns c ON c.id = p.campaign_id
         WHERE p.campaign_id = $1 AND c.created_by = $2
         ORDER BY s.updated_at DESC`,
        [campaignId, req.session.userId]
      )
      res.json(result.rows)
    } catch (err) {
      next(err)
    }
  }
)

// A coordinator approves a submission or asks for changes
submissionsRouter.patch(
  '/submissions/:id',
  requireRole('coordinator'),
  async (req, res, next) => {
    try {
      const submissionId = parseId(req.params.id)
      const { status, feedback } = req.body ?? {}
      if (!submissionId) {
        res.status(400).json({ error: 'Invalid submission id.' })
        return
      }
      if (status !== 'Approved' && status !== 'ChangesRequested') {
        res.status(400).json({ error: 'Status must be Approved or ChangesRequested.' })
        return
      }
      const note = typeof feedback === 'string' ? feedback.trim() : ''
      if (status === 'ChangesRequested' && !note) {
        res.status(400).json({ error: 'Please say what needs to change.' })
        return
      }
      if (note.length > 1000) {
        res.status(400).json({ error: 'Feedback must be 1000 characters or fewer.' })
        return
      }

      const result = await pool.query(
        `UPDATE submissions s
         SET status = $1, feedback = $2, updated_at = now()
         FROM participations p
         JOIN campaigns c ON c.id = p.campaign_id
         WHERE s.id = $3 AND p.id = s.participation_id AND c.created_by = $4
         RETURNING s.id, s.status, s.feedback`,
        [status, note || null, submissionId, req.session.userId]
      )
      if (!result.rows[0]) {
        res.status(404).json({ error: 'Submission not found.' })
        return
      }
      res.json(result.rows[0])
    } catch (err) {
      next(err)
    }
  }
)