# Day 02 — 学习日记 / Learning Diary

**日期:** 2026-07-29
**主题:** 从「内部函数」到「对外 API」—— 出题 service + 第一个业务 HTTP 端点(**进行中,未完成**)
**状态:** Step 4 持续中。出题 service + 出题端点(B1)已通(mock);持久化(B2)差最后几步。

---

## 今天做了什么
1. 补上 `generateQuestions` 出题 service(Sonnet + 结构化输出 + mock)
2. 学了 **Prompt Engineering**(system/user 拆分、紧扣 JD、避免通用题)
3. 建了第一个业务 API 端点:`POST /api/sessions/:id/generate-questions`
4. **读懂了 Step 1-3 的地基**(那是 AI 帮我写的,今天才真正搞懂):Express 路由、中间件、`requireAuth`、JWT
5. 开始 B2 持久化(未完):`createMany`、事务两种形式、幂等性、唯一约束、去重

---

## 知识点

### 1. Prompt Engineering
- **system(规则,稳定) vs user(输入,变化)**;system 要用**顶层 `system` 字段**,不是塞进 `messages`
- **紧扣 JD、避免通用题** = 提升准确性的关键杠杆
- 结构化输出已保证 JSON,所以 prompt **只管内容**,别浪费 token 描述格式
- 用 `<job_description>` 标签包裹输入(Claude 擅长按标签区分"指令"和"数据")
- 🐛 坑:一度把讲解文字和 JD 模板粘进了 SYSTEM_PROMPT;还把 `messages` 数组套进了一条 user 消息的 content 里

### 2. JWT(JSON Web Token)
- **无状态认证**:登录时发一个**签名令牌**,之后每个请求带上,服务器**验签名**即可
- 结构 `header.payload.signature`;**签名 ≠ 加密**;服务器不存令牌,只验
- 🎫 比喻:演唱会**防伪手环**

### 3. Express 路由 & 中间件
- `app.use('/api/sessions', router)` 挂载子路由器
- **中间件**(`requireAuth`)在 handler **之前**跑:验 JWT → 挂 `req.userId` / 否则 401
- `req.params.id` = URL 里 `:id` 的值
- **路由匹配**:静态部分精确 + `:param` 单段通配;顺序"**具体在前**"
- 请求流:`index.ts` → `requireAuth` → handler → prisma → response

### 4. Prisma 查询
- `where` = 过滤条件(= SQL `WHERE`);`findFirst` = 第一条/null;`findUnique`(唯一字段)/`findMany`(数组)
- **归属校验**:`where: { id, userId }` → 用户数据隔离

### 5. 持久化 & 设计决策(B2,进行中)
- `createMany` = **批量插入**一个数组
- **事务两种形式**:回调式 `$transaction(async (tx)=>…)`(后依赖前)vs 数组式 `$transaction([…])`(彼此独立)
- **幂等性 (idempotency)**:不能假设端点只被调一次 → 设计成"重复调用也安全"
- `@@unique([sessionId, text])` + `createMany({ skipDuplicates: true })` = 去重(**靠数据库约束,别用应用逻辑**)
- `@` vs `@@`:字段级 vs 模型级属性
- **设计洞察**:存储要**保留上下文**,"题库"用**查询(`DISTINCT`)派生**;**一个约束别同时服务两个需求**

---

## 面试金句
- *"You can't assume a client calls an endpoint exactly once — design for idempotency."*
- *"Store raw facts with context; derive aggregated views with queries — don't bake a reporting need into a storage constraint."*
- *"JWT is signed, not encrypted; the server just verifies the signature."*

## 今日英语关键词
`prompt engineering` · `system prompt` vs `user message` · `JWT / stateless authentication` · `signed, not encrypted` · `middleware` · `route matching` · `path parameter` · `ownership check` · `bulk insert` · `transaction` · `idempotency` · `unique constraint` · `deduplicate` · `derive a view`

---

## 🧗 今天的挑战 & 反思:数据库关系设计
今天最烧脑的不是写代码,而是一个**设计决策**——面试题应该"每个 session 内唯一"还是"全公司全局唯一"?

- **卡点**:我想要一个去重的"个人题库",但我**存的**是"带公司上下文的 session 题"。想用**一个约束**同时满足这两件事,就卡住了。
- **结论**:这其实是**两个概念**,要分开:
  - **存储层** → 按 session 存(`@@unique([sessionId, text])`),保留"哪家公司问的"。
  - **题库** → 用**查询 `DISTINCT` 派生**,不要在存储层把上下文压扁。
- **原则**:*存原始事实(带上下文),聚合视图用查询算出来;一个约束别同时服务两个需求。*

### 再往前想一步:一个答案能复用在多道题上
延伸洞察:**相同/相似的问题,答案往往一样** → 一份准备好的答案其实可以**跨公司复用在多道题上**。这指向一个未来模型:
- 把"答案"抽成独立实体,和"问题"建**多对多 (many-to-many)** 关系 → 一份 canonical answer 挂到多道题。
- 好处:一份答案维护一次,所有相同问法自动共享,备面试更高效。
- 现在**先不做**(避免过度设计 over-engineering),但记下来,做题库功能时再考虑。

---

## 明天计划 (Day 03)
1. **收尾 B2 持久化**:
   - 给 `Question` 加 `@@unique([sessionId, text])` → `npx prisma migrate dev`
   - ⚠️ 旧测试数据里若有重复,迁移会失败 → 先去 Supabase 清掉 `Question` 表测试垃圾
   - `createMany` 加 `skipDuplicates: true`
   - 重测端点:确认问题落库、重复被跳过、重复调用不产生脏数据
2. **打通评分端点**:`POST` 提交答案 → 调 `scoreAnswer` + `saveAnswerWithScore`(事务)→ 存 `Answer` + `ScoreReport`
3. (可选)prompt caching + token/成本日志、限流 rate limit
4. 配好 **redpen 插件**(今天没配成)

> 给未来的 AI 助手:B1(出题端点)已完成并测通(mock);B2(持久化)代码还没写,先从上面第 1 步继续。
