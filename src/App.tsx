import Applicants from './Applicants'
import { useEffect, useState, type SubmitEvent } from 'react'
import './App.css'
import { api, type User } from './api'
import AuthForm from './AuthForm'

type Campaign = {
  id: number
  title: string
  description: string
  deadline: string | null
  status: 'Open' | 'Closed'
  created_by: number | null
}

type Application = { campaign_id: number; status: string }

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showOpenOnly, setShowOpenOnly] = useState(false)
  const [myApplications, setMyApplications] = useState<Record<number, string>>({})
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDeadline, setNewDeadline] = useState('')

  // Who is logged in?
  useEffect(() => {
    api<User>('/api/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true))
  }, [])

  // Load campaigns
  useEffect(() => {
    api<Campaign[]>('/api/campaigns')
      .then(setCampaigns)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load campaigns.'))
      .finally(() => setLoading(false))
  }, [])

  // Load this student's applications
  useEffect(() => {
    if (user?.role !== 'student') {
      setMyApplications({})
      return
    }
    api<Application[]>('/api/me/participations')
      .then((rows) =>
        setMyApplications(Object.fromEntries(rows.map((r) => [r.campaign_id, r.status])))
      )
      .catch(() => setMyApplications({}))
  }, [user])

  const visibleCampaigns = campaigns.filter(
    (campaign) => !showOpenOnly || campaign.status === 'Open'
  )

  async function handleLogout() {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setError('')
  }

  async function handleCreateCampaign(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const campaign = await api<Campaign>('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          deadline: newDeadline || null,
        }),
      })
      setCampaigns((current) => [campaign, ...current])
      setNewTitle('')
      setNewDescription('')
      setNewDeadline('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  async function apply(campaignId: number) {
    setError('')
    try {
      const row = await api<Application>(`/api/campaigns/${campaignId}/apply`, {
        method: 'POST',
      })
      setMyApplications((current) => ({ ...current, [row.campaign_id]: row.status }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  async function withdraw(campaignId: number) {
    setError('')
    try {
      await api(`/api/campaigns/${campaignId}/apply`, { method: 'DELETE' })
      setMyApplications((current) => {
        const next = { ...current }
        delete next[campaignId]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (!authChecked) {
    return (
      <main className="page">
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="header">
        <h1>CampusCollab</h1>
        <p>Connect campus organizations with local businesses.</p>
      </header>

      {!user ? (
        <AuthForm onAuth={setUser} />
      ) : (
        <div className="userbar">
          <span>
            {user.name} ({user.role})
          </span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      )}

      {user?.role === 'coordinator' && (
        <>
          <h2>Create a campaign</h2>
          <form className="create-form" onSubmit={handleCreateCampaign}>
            <label htmlFor="campaign-title">Campaign name</label>
            <input
              id="campaign-title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="e.g. ELEVATE x Local Cafe"
              required
            />

            <label htmlFor="campaign-description">Description</label>
            <textarea
              id="campaign-description"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="What do you need help with?"
              required
            />

            <label htmlFor="campaign-deadline">Deadline (optional)</label>
            <input
              id="campaign-deadline"
              type="date"
              value={newDeadline}
              onChange={(event) => setNewDeadline(event.target.value)}
            />

            <button type="submit" className="btn-primary">
              Create campaign
            </button>
          </form>
        </>
      )}

      <h2>Available campaigns</h2>
      {error && <p role="alert" className="error">{error}</p>}
      {loading && <p>Loading campaigns...</p>}

      <div className="toolbar">
        <p>Showing {visibleCampaigns.length} campaigns</p>
        <button onClick={() => setShowOpenOnly((previous) => !previous)}>
          {showOpenOnly ? 'Show all campaigns' : 'Show open campaigns only'}
        </button>
      </div>

      <div className="campaign-list">
        {visibleCampaigns.map((campaign) => (
          <article key={campaign.id} className="campaign-card">
            <h3>{campaign.title}</h3>
            <p>{campaign.description}</p>
            {campaign.deadline && <p>Deadline: {campaign.deadline}</p>}
            <div className="campaign-footer">
              <span className={`status ${campaign.status.toLowerCase()}`}>
                {campaign.status}
              </span>

              {user?.role === 'student' &&
                (myApplications[campaign.id] ? (
                  <div className="actions">
                    <span
                      className={`status ${myApplications[campaign.id].toLowerCase()}`}
                    >
                      {myApplications[campaign.id]}
                    </span>
                    <button onClick={() => withdraw(campaign.id)}>Withdraw</button>
                  </div>
                ) : (
                  <button
                    className="btn-primary"
                    disabled={campaign.status === 'Closed'}
                    onClick={() => apply(campaign.id)}
                  >
                    Apply
                  </button>
                ))}
            </div>
               {user?.role === 'coordinator' && campaign.created_by === user.id && (
     <Applicants campaignId={campaign.id} />
   )}
          </article>
        ))}
      </div>
    </main>
  )
}

export default App