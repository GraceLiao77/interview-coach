# Day 03 — 学习日记 / Learning Diary

**日期:** 2026-07-30 ~ 08-04(跨几次)
**主题:** 收尾问题持久化 + 评分端点 + **打通前端全链路(生成 → 答题 → 评分)**
**状态:** 🎉 Step 4 主体功能全通!出题 + 答题 + 三轴评分,前后端**端到端跑通**(mock 模式)。

---

## 今天做了什么
1. **收尾 B2**:问题持久化(`@@unique` + `createMany skipDuplicates`,幂等),端到端验证
2. **评分端点** `POST /api/questions/:id/answers`(穿关系验归属 + zod + 事务)
3. **前端全链路**:Interview 页 + `QuestionCard`/`ScoreCard` + 路由 `/interview/:sessionId` + Sessions「Practice」跳转
4. 建了 **API 接口文档** `docs/api-reference.md`

---

## 知识点 · 后端
1. **Express 中间件 & `.use()`**:中间件在 handler **之前**跑;`requireAuth` 用 `.use()` 挂在路由器上 → 验 JWT → `req.userId` / 否则 401。`app.use(cors)`、`app.use(express.json())` 也都是中间件。
2. **JWT**:无状态认证,签名令牌;**签名 ≠ 加密**;服务器只验不存。
3. **路由匹配 & 顺序**:静态部分精确 + `:param` 单段通配;**具体路由放 `:param` 前面**。
4. **Prisma 查询**:`where` = 过滤条件;`findFirst`(多条件)vs `findUnique`(唯一字段)vs `findMany`(数组)。
5. **穿过关系验归属**:`Question` 自己没有 `userId`,归属藏在 `session → user` → `where: { id, session: { userId } }` = **一次连表(JOIN)查询**。
6. **`createMany` + `skipDuplicates` + `@@unique`**:批量插入,靠**数据库唯一约束**去重;**幂等**(重复调用不产生脏数据)。
7. **`@` vs `@@`**:字段级 vs 模型级属性。
8. **事务两形式**:回调式(后依赖前)vs 数组式(彼此独立)。

## 知识点 · 前端
9. **`api()` 封装**:`fetch` 的包装——自动拼 base URL + 带 JWT + 解析 JSON + 抛错;泛型 `api<T>` 让返回有类型。
10. **Promise**:`async` 函数**自动返回 Promise**(不用写 `new Promise`);resolve/reject;`await` 取值。**不 `await` = 拿着取餐号当咖啡用。**
11. **序列化 (serialize)**:HTTP **只传文本,不传 JS 对象** → 前端 `JSON.stringify`,后端 `express.json()` 反序列化回 `req.body`。
12. **useEffect 不能直接 `async`**:它的返回值只能是 `undefined` 或**清理函数**;`async` 返回 Promise → 把异步塞进里面的内函数。
13. **`import type`**:类型**运行时被擦除**;用值导入类型 → 运行时找不到导出报错;`verbatimModuleSyntax` 强制类型用 `import type`。
14. **`useParams`**:读路由 `:sessionId` 参数;解构名字必须和路由一致。
15. **组件设计权衡**:`QuestionCard` **自包含**(简单)vs **`onSubmit` 注入**(解耦/可测试)。
16. **泛型要贯穿**:调 `post`/`get` **不传泛型** → 返回 `unknown` → 拿不到字段。
17. **端口配置**:`.env` 的 `PORT` 才是**真正生效的来源**(优先于代码默认值和文档);改 `.env` 要**重启**。
18. **401 vs 404**:401 = 没登录(没带 token);404 = 登录了但那个 id 不是你的。

## 踩过的坑 🐛
- `res.json(res)`(传成响应对象本身,应 `res.json(result)`)
- 把 **Promise 存进 state**(忘了 `await`)
- 造空的 `get`/`post` 轮子 → 应复用 `api()`
- 在 `useEffect` 里**自动生成问题** → 烧钱,改成**按钮触发**
- `import { SessionDto }` → 运行时报错,应 `import type`
- 改了文档的端口,**没改 `.env`** → 前端 3009、后端 3000 对不上
- 调 `post` 没传泛型 → `res` 是 `unknown`

## 面试金句
- *"You can't assume an endpoint is called once — design for idempotency."*
- *"A question has no `userId` of its own — ownership lives one level up, through its session; filter through the relation."*
- *"HTTP transmits text, not objects — serialize going out, deserialize coming in."*
- *"An `async` function implicitly returns a Promise; you don't write `new Promise`."*
- *"Types are erased at runtime — import them with `import type`."*

## 英语关键词
`middleware` · `.use()` · `JWT / stateless auth` · `route matching` · `path parameter` · `ownership check` · `nested relation filter` · `createMany` · `skipDuplicates` · `idempotency` · `transaction` · `serialize / deserialize` · `Promise resolve/reject` · `await` · `useEffect cleanup function` · `import type` · `useParams` · `self-contained component` · `generic` · `port precedence`

## 明天计划 (Day 04)
1. **端口对齐**(`.env` `PORT=3009` + 重启),浏览器真正跑通"生成 → 答题 → 评分"
2. (可选)成本日志 · 限流 rate limit · prompt caching
3. 简历上传 + JD 匹配(Step 5)
4. 语音答题 + Whisper(Step 4-voice)

> 给未来的 AI 助手:后端出题/评分端点 + 前端 UI 全部完成并类型通过;差"端口对齐后端到端手测"。前端逻辑由 Jin 写、我 review;markup/CSS 由我写。
