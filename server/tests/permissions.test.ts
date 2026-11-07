import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { pool } from '../src/db'
import { createCampaign, signup } from './helpers'

describe('who can create campaigns', () => {
  it('rejects campaign creation when not logged in', async () => {
    const res = await request(app).post('/api/campaigns').send({ title: 'x', description: 'y' })
    expect(res.status).toBe(401)
  })

  it('does not let a student create a campaign', async () => {
    const { agent } = await signup('student', 'student@test.com')
    const res = await agent.post('/api/campaigns').send({ title: 'x', description: 'y' })
    expect(res.status).toBe(403)
  })

  it('requires the invite code for coordinator accounts', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Sneaky',
      email: 'sneaky@test.com',
      password: 'password123',
      role: 'coordinator',
      inviteCode: 'wrong-code',
    })
    expect(res.status).toBe(403)
  })
})

describe('application rules', () => {
  it('stops a student from approving their own application', async () => {
    const { agent: coordinator } = await signup('coordinator', 'coord@test.com')
    const { agent: student } = await signup('student', 'student@test.com')
    const campaignId = await createCampaign(coordinator)

    const applied = await student.post(`/api/campaigns/${campaignId}/apply`)
    const attempt = await student
      .patch(`/api/participations/${applied.body.id}`)
      .send({ status: 'Approved' })
    expect(attempt.status).toBe(403)

    const list = await coordinator.get(`/api/campaigns/${campaignId}/participants`)
    expect(list.body[0].status).toBe('Pending')
  })

  it("stops a coordinator from approving applicants on someone else's campaign", async () => {
    const { agent: owner } = await signup('coordinator', 'owner@test.com')
    const { agent: other } = await signup('coordinator', 'other@test.com')
    const { agent: student } = await signup('student', 'student@test.com')
    const campaignId = await createCampaign(owner)

    const applied = await student.post(`/api/campaigns/${campaignId}/apply`)
    const attempt = await other
      .patch(`/api/participations/${applied.body.id}`)
      .send({ status: 'Approved' })
    expect(attempt.status).toBe(404)
  })

  it('does not create duplicate applications', async () => {
    const { agent: coordinator } = await signup('coordinator', 'coord@test.com')
    const { agent: student } = await signup('student', 'student@test.com')
    const campaignId = await createCampaign(coordinator)

    const first = await student.post(`/api/campaigns/${campaignId}/apply`)
    const second = await student.post(`/api/campaigns/${campaignId}/apply`)
    expect(first.status).toBe(201)
    expect(second.status).toBe(409)

    const list = await coordinator.get(`/api/campaigns/${campaignId}/participants`)
    expect(list.body).toHaveLength(1)
  })

  it('does not accept applications to a closed campaign', async () => {
    const { agent: coordinator } = await signup('coordinator', 'coord@test.com')
    const { agent: student } = await signup('student', 'student@test.com')
    const campaignId = await createCampaign(coordinator)
    await pool.query(`UPDATE campaigns SET status = 'Closed' WHERE id = $1`, [campaignId])

    const res = await student.post(`/api/campaigns/${campaignId}/apply`)
    expect(res.status).toBe(400)
  })
})