/**
 * 把用户从招聘网站直接粘贴过来的一坨 JD 规范化成 markdown-lite,存库前跑一次。
 *
 * 只认三种行:
 *   `## 标题`   小标题(短行 + 以冒号结尾,或不带句末标点的短句)
 *   `- 条目`    列表项(各种项目符号统一成 "-")
 *   其他        正文段落
 *
 * 存规范化之后的文本而不是渲染好的 HTML —— 数据库里存展示格式会把内容和样式锁死。
 */
export function normalizeJobDescription(raw: string): string {
  const lines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))

  const out: string[] = []

  for (const line of lines) {
    const text = line.trim()

    if (!text) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('') // 连续空行压成一个
      continue
    }

    // 各种项目符号(• · ▪ – — * +)统一成 "- "
    const withoutBullet = text.replace(/^[•·▪‣◦–—*+]\s*/, '')
    if (withoutBullet !== text) {
      out.push(`- ${withoutBullet}`)
      continue
    }
    if (/^-\s+/.test(text)) {
      out.push(text)
      continue
    }

    const previous = out[out.length - 1] ?? ''
    const afterHeading = previous.startsWith('## ')

    // 不允许连着两个标题 —— "About You" 后面的 "The company is looking for:"
    // 是引导句,不是并列的小标题
    if (isHeading(text) && !afterHeading) {
      out.push(`## ${text.replace(/:$/, '')}`)
      continue
    }
    // 紧跟标题、又以冒号结尾的引导句:保留成一行说明,别变成列表项
    if (afterHeading && text.endsWith(':')) {
      out.push(text)
      continue
    }

    // 从网页粘贴过来的 JD 天然是「一行一条」,所以默认当列表项。
    // 只有明显是长篇叙述(超长行)才保留成段落。
    out.push(text.length > 240 ? text : `- ${text}`)
  }

  return out.join('\n').trim()
}

/** 保守判断:宁可漏掉一个标题,也不要把正文误判成标题。 */
function isHeading(text: string): boolean {
  if (text.length > 48) return false
  if (text.endsWith(':')) return true
  // 不带句末标点的短句(≤6 个词)才算标题
  return !/[.!?,;]$/.test(text) && text.split(/\s+/).length <= 6
}

export type JdBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; text: string }

/** 把规范化后的文本切成块,交给渲染组件。没规范化过的老数据也能吃(全部当段落)。 */
export function parseJobDescription(text: string): JdBlock[] {
  const blocks: JdBlock[] = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('## ')) {
      blocks.push({ kind: 'heading', text: trimmed.slice(3) })
      continue
    }

    if (/^-\s+/.test(trimmed)) {
      const item = trimmed.replace(/^-\s+/, '')
      const last = blocks[blocks.length - 1]
      if (last?.kind === 'list') last.items.push(item)
      else blocks.push({ kind: 'list', items: [item] })
      continue
    }

    blocks.push({ kind: 'paragraph', text: trimmed })
  }

  return blocks
}
