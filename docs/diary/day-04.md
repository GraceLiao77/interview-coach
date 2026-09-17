# Day 04 — 学习日记 / Learning Diary

**日期:** 2026-09-15 ~ 09-18(隔了一个多月才回来)
**主题:** 语音答题(Step 4-voice)—— 浏览器录音 → 上传 → Groq Whisper 转写 → 复用现有评分
**状态:** ✅ 端到端跑通。录音 → 上传 → 真实 Groq 转写 → transcript 回填 → 评分卡渲染。

---

## 今天做了什么

1. **诊断"项目起不来"** —— 服务端其实是好的,是 Supabase 免费项目闲置太久被自动暂停
2. **`useAudioRecorder` hook** —— MediaRecorder 录音 + 计时 + 产出 Blob,不碰 UI
3. **`transcriptionService`** —— Groq `whisper-large-v3-turbo`,独立的 mock 开关
4. **音频上传端点** `POST /api/questions/:id/answers/audio` —— multer 解析 multipart → 转写 → 复用 `scoreAnswer` + `saveAnswerWithScore`
5. **全局错误中间件加 multer 分支** —— 文件超限返回 413 而不是笼统的 500
6. **前端串联** —— `post()` 支持 FormData、`submitAudioAnswer()`、Recorder 接进 `QuestionCard`
7. 定下 **MVP 原则**:只保证 Chrome 跑通,不写浏览器兼容代码

---

## 设计决策

### 为什么 Groq 只做转写,评分留给 Claude
转写要的是"听得准",评分要的是"懂 ESL 语言迁移、能写出有洞察的反馈"。后者的 prompt 和结构化输出已经调通,换模型等于重来。**两个 provider 各司其职,不是能省一个就省一个。**

### mock 开关按 provider 拆分
一开始是靠注释掉一行代码来实现"转写真跑 / 评分继续 mock" —— 太脆弱,忘了恢复就一直烧额度。改成两个独立环境变量:

```
MOCK_AI=true             # Claude(出题 + 评分)
MOCK_TRANSCRIPTION=false # Groq Whisper
```

现在可以"用真实 API 验证语音链路,同时评分不花钱",代码一行不用动。

### 评分后一起存,不先存 transcript
现有的 `saveAnswerWithScore` 在一个事务里写 answer + score。另一种做法是先存 answer、评分完再补 —— 好处是 Claude 挂了不丢用户的转写。schema 里 `scoreReport ScoreReport?` 的问号已经为此留了门,但这轮不做:单用户项目,重录一次的代价可以承受,等真的觉得痛再改。

### 中间件挂在路由级而不是 router 级
`upload.single('audio')` 只挂在音频那条路由上。用 `router.use()` 会让已经跑通的 JSON 答题路由也去解析 multipart,直接搞坏。**作用范围应该是最小的那个。**

### router 按 URL 前缀组织,不按功能
音频端点在 `/api/questions` 前缀下 → 就该在 `questionsRouter` 里。真要拆,应该把**两条答题路由一起**搬去 `/api/answers` —— 它们 80% 相同(验归属 → 评分 → 存库),只搬一条会造成最坏情况:两个亲兄弟端点分居两地,改一个忘一个。

### `transcribe(buffer)` 不接收 `req`
service 只认识 buffer,不知道也不该知道"这个 buffer 来自 HTTP 请求"。正因为它不知道,才能在别处复用(比如写脚本批量转写本地文件)。同理,空转写的判断和用户文案留在路由层 —— **service 不该知道 HTTP 状态码长什么样。**

---

## 知识点 · 后端

1. **`multipart/form-data` 的 boundary 是浏览器现场生成的随机串**,服务端靠它切分文件。所以**传 FormData 时绝不能手动设 `Content-Type`** —— 手动设就没有 boundary,解析直接失败。

2. **multer 是 body parser,和 `express.json()` 是同类**。一个管 `application/json`,一个管 `multipart/form-data`。`express.json()` 遇到 multipart 会直接放行(不关它的事),所以不挂 multer 就没人解析。

3. **`multer({...})` 只是造机器,`upload.single('audio')` 才产出中间件函数。** 定义一个 const 不等于注册进流水线。

4. **multer 的错误抓不到** —— 它发生在 handler **运行之前**,流水线被 `next(err)` 中断,handler 压根没执行。只能在错误中间件里 `err instanceof multer.MulterError` 判断。`LIMIT_FILE_SIZE` → **413 Payload Too Large**。

5. **错误中间件的识别靠参数个数**(`err, req, res, next` 四个),写成三个就退化成普通中间件。且必须注册在**所有路由之后** —— Express 严格按顺序,写前面等于错误发生时它已经流过去了。

6. **Express 5 会自动把 async handler 的 rejection 转发到错误中间件**(Express 4 要自己包 try/catch 或 `express-async-handler`)。

7. **try/catch 要包小不包大**。只包 `transcribe` 那一行 —— 包整个 handler 的话,数据库超时、Groq 挂了、Claude 返回非法 JSON 全掉进同一个 catch,只能给一句笼统的"出错了"。**catch 越小,错误信息越精确。**

8. **500 vs 502**:500 = 我自己坏了;502 = 我依赖的上游坏了。Groq 挂了属于 502。

9. **空转写要在评分之前短路** —— `if (!transcript.trim()) { res.status(400); return }`。那个 `return` 就是省钱的关键:空答案照样要付一次完整的 LLM 费用。

10. **`safe` vs `idempotent`**:
    - **safe** = 完全无副作用(只有 GET/HEAD)。浏览器预取、爬虫都**基于这个承诺**自作主张 —— 把写操作做成 GET 等于授权全世界随便触发它
    - **idempotent** = 有副作用但重复做结果一样(PUT/DELETE)
    - POST 两者都不是 → 提交按钮必须 `disabled={submitting}`

11. **登录为什么是 POST** —— 它逻辑上像"读",但做成 GET 密码会明文进服务器日志、代理日志、浏览器历史、Referer 头。**URL 到处都在被记录。**

12. **API key 永远在服务端**。前端代码全部下发到浏览器,F12 就能翻出来。判断标准:**凡是需要 API key 的依赖,一律装在 `server/`**。

13. **显式 `new Groq({ apiKey: env.groqApiKey })` 好过隐式 `new Groq()`**。隐式版依赖"`env.ts` 必须先执行"这个隐藏顺序;显式版把它变成真实 import,顺序由模块系统保证,读代码的人也看得见 key 从哪来。

14. **`declare module 'express-serve-static-core'` 的类型扩展有副作用**:它会让 Express **无法再从路由路径推断参数类型**,但只在路由带额外中间件(3 个参数)时才触发。表现是 `req.params.id` 退化成 `string | string[] | undefined`。修法:`post<{ id: string }>(...)` 显式声明。

---

## 知识点 · 前端

15. **stale closure(过期闭包)** —— React 每次渲染产生**全新一套** state 值,回调打包带走的是登记那一刻的旧值。局部变量(如 `recorder`)可以直接用,闭包带走的就是那一个、永远不变;但 state 不行,必须走 ref(盒子对象从头到尾是同一个,读的永远是最新内容)。`useCallback` 的依赖数组同理。

16. **卸载时的 cleanup(`[]` 依赖)读不到最新 state** —— 所以要 revoke object URL 就必须另存一份 ref。

17. **setState 的 updater 必须是纯函数**。`setUrl(prev => { revoke(prev); return newUrl })` 是错的 —— **StrictMode 会故意调用两次**来暴露副作用,结果造出两个 URL 泄漏一个。副作用放 `setState` 外面。

18. **`URL.createObjectURL` 必须配 `revokeObjectURL`**,否则每次录音漏一份内存。

19. **卸载前把 `onstop` 置 null** —— 不然组件都没了,回调还在对着不存在的组件 setState。

20. **props 是组件的对外接口,只放"必须跨越边界的东西"**。状态搬进 hook 之后,`recording`/`seconds`/`audioUrl` 再当 props 传进来就成了**两个真相来源 (two sources of truth)**。剩下的只有 `onComplete`(往外给 blob)和 `disabled`(往里说"我忙着")。**加 prop 容易,删 prop 难。**

21. **依赖数组里放"每次渲染都变的函数"= 每次渲染都触发**。`useEffect(() => { if (blob) onComplete(blob) }, [blob, onComplete])` 会变成每渲染一次上传一次。**改用一个提交按钮就完全绕开了这个概念** —— 发现自己在跟依赖数组较劲,通常说明设计能更简单。

22. **custom hook 复用逻辑,组件复用外观**。`useAudioRecorder` 抽出去之后谁都能录音;`<Recorder>` 的价值只剩复用波形/计时器的 markup + CSS。

23. **`JSON.stringify(一个 FormData)` 返回 `"{}"`** —— 不报错,静默把数据丢光。所以 `post()` 里要判断 `body instanceof FormData` 原样传。**特殊情况应该被封装进 helper,而不是让每个调用方记住。**

24. **组件放对地方,数据自然就在手边**。Recorder 挂在页面顶层时不知道自己在给哪道题录音,只能拿 `sessionId` 硬凑 → 必然 404。搬进 `QuestionCard` 后 `question.id` 唾手可得 —— 修法不是往下传更多 props,是把组件放到它该在的位置。

---

## 遇到的问题 & 怎么解决的 🐛

| 问题 | 表现 | 原因 & 解决 |
|---|---|---|
| **Supabase 项目失联** | `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found` | 先用 `nslookup <ref>.supabase.co` 确认 **NXDOMAIN**,再用 5432 直连排除 pgbouncer → 判定是**免费层闲置约 7 天自动 pause**,不是代码问题。到 dashboard 点 Restore |
| **误判故障范围** | 以为"服务端起不来" | 报错栈指向 `auth.ts:53`(某个请求的处理过程)→ **服务器是活着的**,起不来根本走不到那行。**精确描述症状本身就是 debugging 能力** |
| **`useState(null)` 类型错误** | `Type 'string' is not assignable to type 'null'` | TS 从初始值推断,`null` 的类型就是 `null`。**初始值是 `null` 就必须写泛型**:`useState<string \| null>(null)` |
| **object URL 泄漏** | 无明显报错 | 在 `setAudioUrl` 的 updater 里做 revoke + create → StrictMode double-invoke → 造两个 URL 泄漏一个。改成用 `urlRef` 在 updater 外面处理 |
| **每次请求都 400** | `audio file is required` | multer 中间件**定义了但没挂到路由上** → `req.file` 永远 undefined。`multer({...})` 只是造机器,`upload.single()` 才是中间件 |
| **传错参数** | — | `transcribe(upload)` 把 multer 实例当音频传;应该是 `req.file.buffer`。后来从路由复制代码到 service 时又带进了 `req.file.buffer`,而 service 里根本没有 `req` |
| **URL 单复数** | 404 | 写成 `/:id/answer/audio`,前端和现有路由都是 `answers`。**差一个字母,而且看起来完全正常** |
| **mock 模式形同虚设** | 一直在真烧 Groq 额度 | `process.env.mockAi` —— 环境变量名是 `MOCK_AI`,这么写**永远 undefined**。应该用 `env.mockAi`。**别绕过 `env.ts` 直接读 `process.env`** |
| **照抄文档占位符** | 转写质量下降 | `prompt: "Specify context or spelling"` 是 Groq 文档的示例文字,会被当真实上下文喂给 Whisper。**从文档复制代码时注释和参数也会跟着来,十有八九是错的** |
| **`new File([buffer])` 类型不兼容** | `Buffer<ArrayBufferLike>` not assignable to `BlobPart` | Node 的 Buffer 底层是 `ArrayBufferLike`,TS 认为可能是 `SharedArrayBuffer`。用 SDK 的 `toFile()` 解决 |
| **路径参数类型退化** | `req.params.id` 变成 `string \| string[] \| undefined` | `requireAuth` 的 `declare module` 扩展 + 路由带额外中间件 → 路径参数推断失效。用 `post<{ id: string }>(...)` 显式声明 |
| **FormData 被 JSON.stringify** | 后端收到空对象,无报错 | `post()` 无条件 `JSON.stringify(body)`。修在 helper 里:`body instanceof FormData ? body : JSON.stringify(body)` |
| **Recorder 放错位置** | 必然 404 | 挂在页面顶层拿不到 questionId,只能传 `sessionId`。搬进 `QuestionCard` |
| **JD 看起来像生成的** | 点 Generate 后 JD 才出现 | 其实 JD 是用户在 Sessions 页手输的。`sessionData` 以前只在 `handleGenerate` 里 set → 进页面不显示。补上 `useEffect` 里的 `GET /api/sessions/:id`(纯读,不花钱) |

---

## 面试金句

- *"The server was healthy — only the database layer was down. Precise symptoms are half the debugging."*
- *"Multer is just another body parser: `express.json()` handles JSON, multer handles multipart. Neither knows anything about the client — by the time they run, the payload is only bytes."*
- *"GET is defined as safe, so the whole ecosystem is allowed to fire it whenever it likes. The moment an operation writes or costs money, that promise is broken."*
- *"I keep the `try` as narrow as possible. Wrapping the whole handler would collapse three different failure modes into one message."*
- *"I short-circuit on an empty transcript before the scoring call — an empty answer still costs a full LLM request."*
- *"Multer errors can't be caught in the handler at all; they short-circuit the chain before it runs."*
- *"Any dependency that takes an API key is server-side by definition."*
- *"`start` doesn't record anything — it acquires the stream, registers the callbacks, and returns. Everything interesting happens in handlers registered thirty seconds earlier, which is exactly why they read from refs instead of state."*
- *"Updater functions must be pure — StrictMode double-invokes them precisely to surface that."*
- *"Props are the component's public interface. Once the state moved into the hook, passing `recording` back in would have created two sources of truth."*
- *"`JSON.stringify` on a FormData silently returns `{}` — it doesn't throw, it just drops your payload, so it's exactly the kind of thing a wrapper should make impossible."*
- *"I split the mock flags per provider — one for Claude, one for Whisper — so I can verify the voice path live while scoring stays free. Commenting out a line to achieve the same thing is a trap."*
- *"A function's parameters define the world it can see. `transcribe` only knows about a buffer — it has no idea an HTTP request was involved, and that's why it's reusable."*
- *"Chrome-only is a deliberate trade-off, not an oversight."*

---

## 英语关键词

`middleware chain / pipeline` · `body parser` · `multipart/form-data` · `boundary` · `wire up` · `scoped to a route` · `short-circuit` · `bubble up` · `swallow an error` · `safe vs idempotent` · `payload too large` · `fail fast` · `fail silently` · `cohesion / coupling` · `sibling endpoints` · `premature abstraction` · `register a callback` · `closure` · `stale closure` · `pure function` · `side effect` · `memory leak` · `dependency array` · `controlled vs uncontrolled component` · `two sources of truth` · `custom hook` · `extract into a hook` · `smoke test` · `happy path / failure path` · `end-to-end` · `deliberate trade-off` · `it's back up / it's down`

---

## 下一步 (Day 05)

1. 关掉 `MOCK_AI`,验证真实 Claude 评分(注意成本)
2. `express-rate-limit` 已经装了但没用 —— 语音端点是最烧钱的入口,该加了
3. 成本日志:每次调用记 token 数和估算费用
4. 简历上传 + JD 匹配(Step 5)
