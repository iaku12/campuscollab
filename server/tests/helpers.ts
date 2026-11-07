import request from 'supertest'
import { expect } from 'vitest'
import { app } from '../src/app'

export type Agent = ReturnType<typeof request.agent>

// Creates an account and returns a client that stays logged in
export async function signup(role: 'student' | 'coordinator', email: string) {
  const agent = request.agent(app)
  const res = await agent.post('/api/auth/signup').send({
    name: email.split('@')[0],
    email,
    password: 'password123',
    role,
    inviteCode: role === 'coordinator' ? 'test-invite-code' : undefined,
  })
  expect(res.status).toBe(201)
  return { agent, user: res.body as { id: number } }
}

export async function createCampaign(coordinator: Agent, title = 'Test campaign') {
  const res = await coordinator.post('/api/campaigns').send({ title, description: 'Description' })
  expect(res.status).toBe(201)
  return res.body.id as number
}

// Student applies, coordinator approves. Returns the participation id.
export async function applyAndApprove(coordinator: Agent, student: Agent, campaignId: number) {
  const applied = await student.post(`/api/campaigns/${campaignId}/apply`)
  expect(applied.status).toBe(201)
  const approved = await coordinator
    .patch(`/api/participations/${applied.body.id}`)
    .send({ status: 'Approved' })
  expect(approved.status).toBe(200)
  return applied.body.id as number
}