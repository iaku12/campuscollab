import { Router } from 'express'
import { pool } from './db'
import { requireRole } from './middleware'

export const dashboardRouter = Router()

dashboardRouter.get('/dashboard', requireRole('coordinator'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.title,
         (COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'Approved'))::int AS participants,
         (COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'Pending'))::int AS pending_applicants,
         (COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'Submitted'))::int AS pending_submissions,
         (COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'Approved'))::int AS completed_submissions
       FROM campaigns c
       LEFT JOIN participations p ON p.campaign_id = c.id
       LEFT JOIN submissions s ON s.participation_id = p.id
       WHERE c.created_by = $1
       GROUP BY c.id, c.title
       ORDER BY c.created_at DESC`,
      [req.session.userId]
    )

    const campaigns = result.rows
    const totals = campaigns.reduce(
      (sum, row) => ({
        participants: sum.participants + row.participants,
        pending_applicants: sum.pending_applicants + row.pending_applicants,
        pending_submissions: sum.pending_submissions + row.pending_submissions,
        completed_submissions: sum.completed_submissions + row.completed_submissions,
      }),
      { participants: 0, pending_applicants: 0, pending_submissions: 0, completed_submissions: 0 }
    )

    res.json({ totals, campaigns })
  } catch (err) {
    next(err)
  }
})