import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

type Counts = {
  participants: number
  pending_applicants: number
  pending_submissions: number
  completed_submissions: number
}

type Data = {
  totals: Counts
  campaigns: (Counts & { id: number; title: string })[]
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    api<Data>('/api/dashboard')
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load the dashboard.')
      )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <p role="alert" className="error">{error}</p>
  if (!data) return <p>Loading dashboard...</p>

  return (
    <section>
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <button onClick={load}>Refresh</button>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value">{data.totals.participants}</div>
          <div className="stat-label">Participants</div>
        </div>
        <div className="stat">
          <div className="stat-value">{data.totals.pending_applicants}</div>
          <div className="stat-label">Pending applicants</div>
        </div>
        <div className="stat">
          <div className="stat-value">{data.totals.pending_submissions}</div>
          <div className="stat-label">Pending submissions</div>
        </div>
        <div className="stat">
          <div className="stat-value">{data.totals.completed_submissions}</div>
          <div className="stat-label">Completed submissions</div>
        </div>
      </div>

      {data.campaigns.length > 0 && (
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Participants</th>
              <th>Pending applicants</th>
              <th>Pending submissions</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{c.participants}</td>
                <td>{c.pending_applicants}</td>
                <td>{c.pending_submissions}</td>
                <td>{c.completed_submissions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}