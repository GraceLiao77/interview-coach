import { Link } from 'react-router-dom'
import type { SessionDetailDto } from '@shared/types'
import demo from '../demo/demoInterview.json'
import { InterviewView } from './InterviewView'
import './Interview.css'

// The JSON was written by server/scripts/exportDemo.ts through toSessionDetailDto, so it has
// that shape. TypeScript can't tell on its own: a JSON import widens "warmup" to string,
// so the cast is needed. A test that checks the file against the type would replace it.
const session = demo.session as SessionDetailDto

/** /demo: a recorded Interview anyone can open without signing in. No API or model calls. */
export function DemoPage() {
  return (
    <main className="interview">
      <header className="interview-header demo-bar">
        <p className="demo-bar-text">
          <span className="demo-badge">Demo</span>
          <span className="demo-bar-long">A recorded interview with real AI feedback.</span>
        </p>
        <Link to="/login" className="demo-bar-cta">
          Sign in to practise →
        </Link>
      </header>

      <InterviewView session={session} loaded={true} generating={false} readOnly />
    </main>
  )
}
