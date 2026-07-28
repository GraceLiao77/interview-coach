# Day 01 — 学习日记 / Learning Diary

**日期:** 2026-07-28
**主题:** Step 4 —— 接入 Claude API(数据建模 → 结构化输出 → 存库),**全程亲手写,我审阅**
**心得:** 今天最大的收获是"问题驱动"——先亲眼看到 bug,再学解药,印象最深。

---

## 今天做了什么(概览)
1. 手写 Prisma 数据模型 `Answer` / `ScoreReport` 并 migrate
2. 接入 Anthropic SDK(单例 + 配置文件)
3. 用 Zod + 结构化输出锁死 Claude 的 JSON
4. 亲手踩坑:`JSON.parse` 崩溃 → 用 `messages.parse()` 解决
5. Mock 模式(零成本开发)
6. 事务 (transaction) 把 Answer + ScoreReport 一起存库

---

## 一、数据建模 (Data Modeling)
- **一对多 vs 一对一**:一对一靠外键加 `@unique` 实现
- **主键 `@id` / 外键 (foreign key) / 索引 `@@index`** 三者区别:主键=行的唯一标识(自动索引);外键=指向别的表的 id;索引=查询用的"目录"
- `@unique` **自动带索引** → 一对一的外键不用再单独写 `@@index`
- 级联删除 `onDelete: Cascade`(删父行,子行跟着删)
- Prisma 字段用 **camelCase**(不是 SQL 的 snake_case)
- 🐛 **坑**:写成 `createdAt DateTime(now())` 报错 → 正确是 `createdAt DateTime @default(now())`(修饰符 `@default(...)` 放类型后面)

## 二、迁移 (Migration)
- `npx prisma migrate dev --name xxx` = 对比 schema 与数据库 → 生成 SQL → 应用 → 重新生成 Prisma Client
- 本质:**数据库的版本控制,像 git commit**;migration 文件要提交进 git

## 三、安全 (Security)
- 前端"打包" = 压缩/混淆,**不是加密**;任何人都能看源码
- Vite 会把前端环境变量当**明文**塞进 bundle → 密钥**绝不能放前端**
- HTTPS 加密的是"传输过程",不是浏览器里的代码
- ✅ 正确做法:密钥只放 server,浏览器调 server,server 调 Claude
- 💬 面试金句:*"Minification is not encryption; you can't keep a secret in client code."*

## 四、接入 SDK (Step 4a)
- **单例 (singleton)**:`lib/anthropic.ts` 里只 `new Anthropic()` 一次 → 省资源
- `aiConfig.ts` 集中管理模型名 + 价格(改一处即可)
- **模型 ID 不要自己拼日期后缀**:用 `claude-sonnet-4-6` / `claude-opus-4-8`
- `npm`(管包 / 跑脚本)vs `npx`(跑可执行程序)
- `npx tsc --noEmit` = 只做类型检查,不产出文件
- 🐛 **坑**:`npm tsx` → Unknown command,应为 `npx tsx`
- 🐛 **坑**:模型 ID 加了 `-20260620` → 会 404

## 五、Zod + 结构化输出 (Step 4b)
- TS 类型**运行时会消失**;Zod 在**运行时**校验真实数据
- 积木:`z.object` / `z.string` / `z.number().int` / `z.array` / `z.enum`
- `z.infer<typeof schema>` = **白拿一个 TS 类型**(写一次 schema,同时有"运行时校验 + 编译时类型")
  - 用在:service 返回类型、mock 假数据、下游取值自动补全、存库字段映射
- 结构化输出**最顶层必须是 object** → 所以 `{ questions: [...] }` 要包一层
- **schema(管 Claude 输出)和 Prisma model(管存库)是两回事**,可以不一样(比如 `resumeBased` 只在 schema 里)

## 六、痛点 → 解药(问题驱动,今天的高光)
- **天真版**:`messages.create` + `JSON.parse` → 💥 Claude 返回被 ` ```json ` 包裹 → `SyntaxError`
- 而且形状也没保证:分数用了 0-100、冒出 `overallScore`、feedback 一大坨
- **解药**:`messages.parse()` + `output_config: { format: zodOutputFormat(schema) }`
  → 保证纯 JSON、字段齐、类型对(取 `response.parsed_output`)
- ✅ 产品灵魂跑通:`languageErrorList` 里 **original → rewrite → pattern**(指出 ESL 错误模式,如"missing article — Chinese-L1 transfer")

## 七、Mock 模式 (Step 4d)
- `MOCK_AI=true` → 函数直接返回假数据,**开发期 0 成本**
- 环境变量都是**字符串** → `process.env.MOCK_AI === 'true'` 转布尔
- mock 假数据用 `ScoreReport` 类型约束(`z.infer` 发光的地方)

## 八、import vs 实例化
- `import` 一个函数(如 `zodOutputFormat`)≠ `new` 一个客户端 → **不产生新实例**
- 单例只针对**有状态、占资源**的对象(`new` 出来的客户端 / 连接池)
- Node 模块**有缓存**,同一个包只加载一次

## 九、存库 + 事务 (Transaction)
- **职责分离 (separation of concerns)**:`scoringService`(调 Claude)vs `answerService`(存库)
- **事务 = 原子性 (atomicity)**:一组操作**要么全成、要么全回滚**(银行转账比喻)
- `prisma.$transaction(async (tx) => {...})`:里面用 `tx.xxx` 代替 `prisma.xxx`(`tx` 是临时版 prisma,自带所有 model)
- 返回值 = 回调里 `return` 的东西
- **任一步失败 → Prisma 自动回滚**,不留孤儿数据;你只需在外层 `try/catch` 返回 500
- `upsert` = 有则用、无则建(造测试数据 seed 用)
- 💬 面试金句:*"If any statement in the transaction fails, the whole thing rolls back."*

---

## 今日英语关键词 (Interview vocabulary)
`primary key` · `foreign key` · `index` · `one-to-one` / `one-to-many` · `cascade delete` · `migration` · `singleton` · `stateless helper function` · `runtime validation` · `structured output` · `inferred type` · `mock mode` · `transaction` · `roll back` / `rollback` · `atomicity` · `persist to the database` · `separation of concerns` · `minification ≠ encryption`

## 明天继续 (Next)
- 出题 service `generateQuestions`(用 Sonnet)
- Prompt caching + token / 成本日志
- 限流 (rate limit) + 路由 (routes) + 前端 UI
- (以后)Whisper 语音转文字
