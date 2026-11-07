import { describe, expect, it } from 'vitest'
import { applyAndApprove, createCampaign, signup } from './helpers'

describe('content submissions', () => {
  it('does not let an unapproved student submit', async () => {
    const { agent: coordinator } = await signup('coordinator', 'coord@test.com')
    const { agent: student } = await signup('student', 'student@test.com')
    const campaignId = await createCampaign(coordinator)
    await student.post(`/api/campaigns/${campaignId}/apply`)

    const res = await student
      .put(`/api/campaigns/${campaignId}/submission`)
      .send({ url: 'https://example.com/post' })
    expect(res.status).toBe(403)
  })

  it('rejects unsafe links', async () => {
    const { agent: coordinator } = await signup('coordinator', 'coord@test.com')
    const { agent: student } = await signup('student', 'student@test.com')
    const campaignId = await createCampaign(coordinator)
    await applyAndApprove(coordinator, student, campaignId)

    const res = await student
      .put(`/api/campaigns/${campaignId}/submission`)
      .send({ url: 'javascript:alert(1)' })
    expect(res.status).toBe(400)
  })

  it('runs the whole review workflow and locks approved work', async () => {
    const { agent: coordinator } = await signup('coordinator', 'coord@test.com')
    const { agent: student } = await signup('student', 'student@test.com')
    const campaignId = await createCampaign(coordinator)
    await applyAndApprove(coordinator, student, campaignId)

    // Student submits
    const submitted = await student
      .put(`/api/campaigns/${campaignId}/submission`)
      .send({ url: 'https://example.com/post-1' })
    expect(submitted.status).toBe(200)
    expect(submitted.body.status).toBe('Submitted')
    const submissionId = submitted.body.id

    // The student cannot review their own work
    const selfReview = await student
      .patch(`/api/submissions/${submissionId}`)
      .send({ status: 'Approved' })
    expect(selfReview.status).toBe(403)

    // Asking for changes needs feedback
    const noFeedback = await coordinator
      .patch(`/api/submissions/${submissionId}`)
      .send({ status: 'ChangesRequested' })
    expect(noFeedback.status).toBe(400)

    const changes = await coordinator
      .patch(`/api/submissions/${submissionId}`)
      .send({ status: 'ChangesRequested', feedback: 'Please tag the cafe.' })
    expect(changes.status).toBe(200)
    expect(changes.body.status).toBe('ChangesRequested')

    // Student resubmits: back to Submitted, feedback cleared
    const resubmitted = await student
      .put(`/api/campaigns/${campaignId}/submission`)
      .send({ url: 'https://example.com/post-2' })
    expect(resubmitted.status).toBe(200)
    expect(resubmitted.body.status).toBe('Submitted')
    expect(resubmitted.body.feedback).toBeNull()

    // Coordinator approves, and the work is locked
    const approved = await coordinator
      .patch(`/api/submissions/${submissionId}`)
      .send({ status: 'Approved' })
    expect(approved.status).toBe(200)

    const locked = await student
      .put(`/api/campaigns/${campaignId}/submission`)
      .send({ url: 'https://example.com/post-3' })
    expect(locked.status).toBe(409)
  })
})