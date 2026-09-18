import { useMemo } from 'react'
import { parseJobDescription } from '../utils/jobDescription'

/** 把存库的 markdown-lite JD 渲染成标题 / 列表 / 段落,而不是一大坨。 */
export function JobDescription({ text }: { text: string }) {
  const blocks = useMemo(() => parseJobDescription(text), [text])

  return (
    <div className="jd-body">
      {blocks.map((block, i) => {
        if (block.kind === 'heading') return <h3 key={i}>{block.text}</h3>
        if (block.kind === 'list') {
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{block.text}</p>
      })}
    </div>
  )
}
