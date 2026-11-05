import { useEffect, useState } from 'react'
import { api } from './api'

type Status = 'Pending' | 'Approved' | 'Rejected'

type Participant = {
  id: number
  status: Status
  name: string
  email: string
}

export default function Applicants({ campaignId }: { campaignId: number }) {
  const [open, setOpen] = useState(false)
  const [participants, setParticipants] = useState<Participant[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    api<Participant[]>(`/api/campaigns/${campaignId}/participants`)
      .then(setParticipants)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load applicants.')
      )
  }, [open, campaignId])

  async function decide(participationId: number, status: 'Approved' | 'Rejected') {
    setError('')
    try {
      const updated = await api<{ id: number; status: Status }>(
        `/api/participations/${participationId}`,
        { method: 'PATCH', body: JSON.stringify({ status }) }
      )
      setParticipants(
        (current) =>
          current?.map((p) =>
            p.id === updated.id ? { ...p, status: updated.status } : p
          ) ?? null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <div className="applicants">
      <button onClick={() => setOpen((previous) => !previous)}>
        {open ? 'Hide applicants' : 'View applicants'}
      </button>

      {open && (
        <div className="applicant-list">
          {error && <p role="alert" className="error">{error}</p>}
          {participants === null && !error && <p>Loading...</p>}
          {participants?.length === 0 && <p>No applicants yet.</p>}

          {participants?.map((p) => (
            <div key={p.id} className="applicant-row">
              <div>
                <strong>{p.name}</strong>
                <div className="applicant-email">{p.email}</div>
              </div>
              <div className="actions">
                <span className={`status ${p.status.toLowerCase()}`}>{p.status}</span>
                <button
                  className="btn-primary"
                  disabled={p.status === 'Approved'}
                  onClick={() => decide(p.id, 'Approved')}
                >
                  Approve
                </button>
                <button
                  disabled={p.status === 'Rejected'}
                  onClick={() => decide(p.id, 'Rejected')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}