import { Link } from 'react-router-dom'
import { ApiRequestError } from '../api/client'

/** Shows an error from an API call. A 403 means the account isn't an Allowed Account
 *  (ADR 0002), so it also links to the Demo Interview, which needs no model calls. */
export function ErrorMessage({ error }: { error: unknown }) {
  if (error === null || error === undefined) return null
  const message = error instanceof Error ? error.message : String(error)
  const notAllowed = error instanceof ApiRequestError && error.status === 403

  return (
    <p className="error" role="alert">
      {message}
      {notAllowed && (
        <>
          {' '}
          <Link to="/demo">Open the demo →</Link>
        </>
      )}
    </p>
  )
}
