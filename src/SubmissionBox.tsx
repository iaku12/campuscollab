import { useState, type SubmitEvent } from 'react'
import { api, statusLabel } from './api'

export type Submission = {
  id: number
  campaign_id: number
  url: string
  status: 'Submitted' | 'Approved' | 'ChangesRequested'
  feedback: string | null
}

type Props = {
  campaignId: number
  submission?: Submission
  onSaved: (submission: Submission) => void
}

export default function SubmissionBox({ campaignId, submission, onSaved }: Props) {
  const [url, setUrl] = useState(submission?.url ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const locked = submission?.status === 'Approved'

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const saved = await api<Omit<Submission, 'campaign_id'>>(
        `/api/campaigns/${campaignId}/submission`,
        { method: 'PUT', body: JSON.stringify({ url }) }
      )
      onSaved({ ...saved, campaign_id: campaignId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="submission-box">
      <form onSubmit={handleSubmit}>
        <label htmlFor={`submission-${campaignId}`}>Link to your post</label>
        <div className="submission-row">
          <input
            id={`submission-${campaignId}`}
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            disabled={locked}
            required
          />
          <button type="submit" className="btn-primary" disabled={locked || saving}>
            {submission ? 'Resubmit' : 'Submit'}
          </button>
        </div>
      </form>

      {submission && (
        <p>
          <span className={`status ${submission.status.toLowerCase()}`}>
            {statusLabel(submission.status)}
          </span>
        </p>
      )}
      {submission?.feedback && (
        <p className="feedback">Coordinator feedback: {submission.feedback}</p>
      )}
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  )
}