import { useMemo } from 'react'
import { normalizeJobDescription, parseJobDescription } from '../utils/jobDescription'

/** 存库时有没有规范化过 —— 老数据(格式化功能上线前存的)一个标记都没有 */
function isNormalized(text: string): boolean {
  return /^(##|-)\s/m.test(text)
}

/** 把存库的 markdown-lite JD 渲染成标题 / 列表 / 段落,而不是一大坨。 */
export function JobDescription({ text }: { text: string }) {
  // 老数据在渲染时补一次规范化,这样不用写数据迁移脚本
  const blocks = useMemo(
    () => parseJobDescription(isNormalized(text) ? text : normalizeJobDescription(text)),
    [text],
  )

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
