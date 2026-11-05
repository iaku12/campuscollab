import type { NextFunction, Request, Response } from 'express'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Please log in.' })
    return
  }
  next()
}

export function requireRole(role: 'student' | 'coordinator') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      res.status(401).json({ error: 'Please log in.' })
      return
    }
    if (req.session.role !== role) {
      res.status(403).json({ error: `Only a ${role} can do this.` })
      return
    }
    next()
  }
}