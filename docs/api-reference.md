# API 接口文档 / API Reference

**Base URL(本地):** `http://localhost:3009`
**数据格式:** JSON(请求头 `Content-Type: application/json`)

## 认证 (Auth)
除「无需认证」标注外,所有接口都要在请求头带 JWT:
```
Authorization: Bearer <token>
```
token 从 `POST /api/auth/register` 或 `/login` 返回里拿。缺失/无效 → **401**。

## 通用错误格式
所有错误返回统一形状:
```json
{ "error": "错误信息" }
```

## 共享类型(见 `shared/types.ts`)
| 类型 | 字段 |
|------|------|
| `UserDto` | `id`, `email`, `createdAt` |
| `QuestionDto` | `id`, `tier`('warmup'\|'behavioral'\|'technical'), `text`, `order` |
| `SessionDto` | `id`, `jobDescription: string\|null`, `status`, `createdAt`, `questions: QuestionDto[]` |
| `AnswerDto` | `id`, `questionId`, `content`, `createdAt` |
| `LanguageError` | `original`, `rewrite`, `pattern` |
| `ScoreReportDto` | `id`, `answerId`, `contentScore`, `languageScore`, `deliveryScore`, `contentContext`, `languageContext`, `deliveryContext`, `languageErrorList: LanguageError[]`, `polishedVersion`, `structuralExemplar`, `createdAt` |

---

## 1. Health

### `GET /api/health` — 健康检查(无需认证)
| | |
|---|---|
| 入参 | 无 |
| 返回 | `{ "status": "ok", "timestamp": "ISO string" }` |
| 状态码 | 200 |

---

## 2. Auth(无需认证)

### `POST /api/auth/register` — 注册
| | |
|---|---|
| 请求体 | `{ "email": string, "password": string }`(密码 ≥ 8 位) |
| 返回 | `AuthResponse` = `{ "token": string, "user": UserDto }` |
| 状态码 | **201** 成功 · 400 校验失败 · 409 邮箱已注册 |

### `POST /api/auth/login` — 登录
| | |
|---|---|
| 请求体 | `{ "email": string, "password": string }` |
| 返回 | `AuthResponse` = `{ "token": string, "user": UserDto }` |
| 状态码 | 200 成功 · 400 格式错 · 401 邮箱或密码错误 |

---

## 3. Sessions(需认证 · 只能操作自己的)

### `GET /api/sessions` — 我的所有 session
| | |
|---|---|
| 入参 | 无 |
| 返回 | `SessionDto[]`(按创建时间倒序,含各自的 questions) |
| 状态码 | 200 · 401 |

### `POST /api/sessions` — 新建 session
| | |
|---|---|
| 请求体 | `{ "jobDescription"?: string, "questions"?: [{ tier, text, order }] }`(都可选) |
| 返回 | `SessionDto` |
| 状态码 | **201** · 400 · 401 |

### `GET /api/sessions/:id` — 取单个 session
| | |
|---|---|
| 路径参数 | `id` = sessionId |
| 返回 | `SessionDto`(含 questions) |
| 状态码 | 200 · 401 · **404**(不存在或不属于你) |

### `DELETE /api/sessions/:id` — 删除 session
| | |
|---|---|
| 路径参数 | `id` = sessionId |
| 返回 | 无(空 body) |
| 状态码 | **204** · 401 · 404 |

### `POST /api/sessions/:id/generate-questions` — AI 生成并保存问题
| | |
|---|---|
| 路径参数 | `id` = sessionId |
| 请求体 | 无(用该 session 已存的 `jobDescription`) |
| 行为 | 调 AI 出题 → `createMany`(`skipDuplicates`,幂等)存入 `Question` |
| 返回 | `SessionDto`(含排序后的 questions) |
| 状态码 | 200 · 401 · 404 |
| 💰 | **每次调用都调一次 AI(花钱)**;`MOCK_AI=true` 时返回假数据、免费 |

---

## 4. Questions(需认证 · 穿过关系校验归属)

### `POST /api/questions/:id/answers` — 提交答案并评分
| | |
|---|---|
| 路径参数 | `id` = **questionId**(哪道题) |
| 请求体 | `{ "answer": string }`(答案文本,非空) |
| 行为 | 找题+验归属 → `scoreAnswer`(AI 评分)→ `saveAnswerWithScore`(事务存 Answer + ScoreReport) |
| 返回 | `SubmitAnswerResponse` = `{ "answer": AnswerDto, "score": ScoreReportDto }` |
| 状态码 | 200 · **400**(answer 为空)· 401(无 token)· **404**(题不存在或不属于你) |
| 💰 | 评分调一次 AI;`MOCK_AI=true` 免费 |

---

## 前端如何调用
统一走 `client/src/api/client.ts` 的 `api()` 封装(自动加 base URL + JWT + 错误处理):
```ts
// 示例(逻辑你写)
const session = await api<SessionDto>(`/api/sessions/${id}/generate-questions`, { method: 'POST' })
const result = await api<SubmitAnswerResponse>(`/api/questions/${qid}/answers`, {
  method: 'POST',
  body: JSON.stringify({ answer }),
})
```

---

## 待做(未实现)
- 语音答题 + Whisper 转写(Step 4-voice,需 OpenAI key)
- 简历上传 + JD 匹配(Step 5)
- 跨 session 弱点画像 / 题库去重查询(Step 6)
- prompt caching · token/成本日志 · 限流 rate limit
