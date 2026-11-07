import { useEffect, useState } from 'react'
import { api, statusLabel } from './api'

type Item = {
  id: number
  url: string
  status: 'Submitted' | 'Approved' | 'ChangesRequested'
  feedback: string | null
  name: string
  email: string
}

function Row({ item, onChange }: { item: Item; onChange: (item: Item) => void }) {
  const [feedback, setFeedback] = useState(item.feedback ?? '')
  const [error, setError] = useState('')

  async function review(status: 'Approved' | 'ChangesRequested') {
    setError('')
    try {
      const updated = await api<{ id: number; status: Item['status']; feedback: string | null }>(
        `/api/submissions/${item.id}`,
        { method: 'PATCH', body: JSON.stringify({ status, feedback }) }
      )
      onChange({ ...item, status: updated.status, feedback: updated.feedback })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <div className="applicant-row">
      <div>
        <strong>{item.name}</strong>
        <div className="applicant-email">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.url}
          </a>
        </div>
        {item.status === 'ChangesRequested' && item.feedback && (
          <div className="applicant-email">Feedback sent: {item.feedback}</div>
        )}
        {error && <p role="alert" className="error">{error}</p>}
      </div>

      <div className="actions">
        <span className={`status ${item.status.toLowerCase()}`}>
          {statusLabel(item.status)}
        </span>
        {item.status !== 'Approved' && (
          <>
            <input
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="What should change?"
              maxLength={1000}
            />
            <button className="btn-primary" onClick={() => review('Approved')}>
              Approve
            </button>
            <button onClick={() => review('ChangesRequested')}>Request changes</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Submissions({ campaignId }: { campaignId: number }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    api<Item[]>(`/api/campaigns/${campaignId}/submissions`)
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load submissions.')
      )
  }, [open, campaignId])

  return (
    <div className="applicants">
      <button onClick={() => setOpen((previous) => !previous)}>
        {open ? 'Hide submissions' : 'View submissions'}
      </button>

      {open && (
        <div className="applicant-list">
          {error && <p role="alert" className="error">{error}</p>}
          {items === null && !error && <p>Loading...</p>}
          {items?.length === 0 && <p>No submissions yet.</p>}
          {items?.map((item) => (
            <Row
              key={item.id}
              item={item}
              onChange={(updated) =>
                setItems((current) => current?.map((i) => (i.id === updated.id ? updated : i)) ?? null)
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}