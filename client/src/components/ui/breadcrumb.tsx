import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'
import './breadcrumb.css'

export interface Crumb {
  label: ReactNode
  /** lucide 图标组件,比如 Home / MessagesSquare */
  icon?: ComponentType<{ size?: number | string; className?: string }>
  /** 有 to 就是可点的祖先层级;没有就是当前页 */
  to?: string
}

/** Home › Mock Interview。最后一项是灰底药丸,前面的可点。 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const Icon = item.icon
        const isLast = i === items.length - 1
        const content = (
          <>
            {Icon && <Icon size={15} className="breadcrumb-icon" />}
            {item.label}
          </>
        )

        return (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && <ChevronRight size={15} className="breadcrumb-sep" aria-hidden />}
            {item.to && !isLast ? (
              <Link to={item.to} className="breadcrumb-item">
                {content}
              </Link>
            ) : (
              <span className="breadcrumb-item is-current" aria-current="page">
                {content}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
