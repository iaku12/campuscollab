import { describe, expect, it } from 'vitest'
import { applyAndApprove, createCampaign, signup } from './helpers'

describe('coordinator dashboard', () => {
  it('counts participants, pending applicants, and submissions', async () => {
    const { agent: coordinator } = await signup('coordinator', 'coord@test.com')
    const { agent: studentA } = await signup('student', 'a@test.com')
    const { agent: studentB } = await signup('student', 'b@test.com')
    const campaignId = await createCampaign(coordinator)

    await applyAndApprove(coordinator, studentA, campaignId)
    await studentB.post(`/api/campaigns/${campaignId}/apply`)
    const submitted = await studentA
      .put(`/api/campaigns/${campaignId}/submission`)
      .send({ url: 'https://example.com/post' })

    let res = await coordinator.get('/api/dashboard')
    expect(res.status).toBe(200)
    expect(res.body.totals).toEqual({
      participants: 1,
      pending_applicants: 1,
      pending_submissions: 1,
      completed_submissions: 0,
    })

    await coordinator.patch(`/api/submissions/${submitted.body.id}`).send({ status: 'Approved' })
    res = await coordinator.get('/api/dashboard')
    expect(res.body.totals.pending_submissions).toBe(0)
    expect(res.body.totals.completed_submissions).toBe(1)
  })

  it('does not show the dashboard to students', async () => {
    const { agent: student } = await signup('student', 'student@test.com')
    const res = await student.get('/api/dashboard')
    expect(res.status).toBe(403)
  })
})