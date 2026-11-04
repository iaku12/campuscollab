import { useEffect, useState, type SubmitEvent } from 'react'
import './App.css'

type Campaign = {
  id: number
  title: string
  description: string
  deadline: string | null
  status: 'Open' | 'Closed'
}

function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showOpenOnly, setShowOpenOnly] = useState(false)
  const [appliedCampaignIds, setAppliedCampaignIds] = useState<number[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDeadline, setNewDeadline] = useState('')

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const response = await fetch('/api/campaigns')
        if (!response.ok) throw new Error('Could not load campaigns.')
        setCampaigns(await response.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
    loadCampaigns()
  }, [])

  const visibleCampaigns = campaigns.filter(
    (campaign) => !showOpenOnly || campaign.status === 'Open'
  )

  function toggleApplication(campaignId: number) {
    setAppliedCampaignIds((currentIds) =>
      currentIds.includes(campaignId)
        ? currentIds.filter((id) => id !== campaignId)
        : [...currentIds, campaignId]
    )
  }

  async function handleCreateCampaign(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          deadline: newDeadline || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not create campaign.')

      setCampaigns((current) => [data, ...current])
      setNewTitle('')
      setNewDescription('')
      setNewDeadline('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <main className="page">
      <header className="header">
        <h1>CampusCollab</h1>
        <p>Connect campus organizations with local businesses.</p>
      </header>

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

      <h2>Available campaigns</h2>
      {error && (
        <p role="alert" style={{ color: 'var(--bad)' }}>
          {error}
        </p>
      )}
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
              <button
                className={
                  appliedCampaignIds.includes(campaign.id) ? '' : 'btn-primary'
                }
                disabled={campaign.status === 'Closed'}
                onClick={() => toggleApplication(campaign.id)}
              >
                {appliedCampaignIds.includes(campaign.id)
                  ? 'Withdraw application'
                  : 'Apply'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}

export default App