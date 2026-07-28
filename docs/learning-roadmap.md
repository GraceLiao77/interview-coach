# 全栈工程师知识树 / Full-Stack Learning Roadmap

**目标:** 在新西兰(奥克兰)拿到一份**英语环境的全栈工作**。
**练习载体:** interview-coach 项目 + 专项练习。
**图例:** ✅ 已掌握/在用 · 🔄 进行中 · ⬜ 待学

> 这不是"全部学完才找工作",而是一张**地图**:让你知道自己在哪、缺什么、下一步去哪。带 ⭐ 的是**求职优先级最高**的。

---

## 0. 基础地基 (Foundations)
- ⭐ HTML / CSS / JavaScript 核心
- ✅ TypeScript(类型系统)
- 🔄 **Git & 版本控制**:分支策略、Pull Request、code review 流程 ⭐
- ⬜ **网络与浏览器基础**:HTTP 报文、状态码、DNS、浏览器渲染原理 ⭐(面试常问)

## 1. 前端 (Frontend)
- ✅ React:hooks、组件设计、Context
- ⬜ **状态管理**:服务端状态 (React Query) vs 客户端状态 (Zustand/Context) ⭐
- ⬜ 样式与**响应式设计** (responsive)、Tailwind/CSS
- ✅🔄 **前端性能优化**:code splitting、lazy loading、`memo`/`useMemo`、虚拟列表、Core Web Vitals (LCP/CLS)
- ⬜ **可访问性 (a11y / accessibility)** ⭐ ← 西方职场很看重,华人常忽略,是加分项
- ⬜ 前端测试:组件测试、E2E

## 2. 后端 (Backend)
- 🔄 **API 设计**:REST 规范、状态码、分页 (pagination)、幂等性 (idempotency)、版本化 ⭐
- ✅ 认证 (JWT) ｜ ⬜ 授权进阶:OAuth、RBAC(角色权限)
- ✅ 校验 (zod) ｜ 🔄 统一错误处理 (error handling)
- ⬜ **缓存 (caching)**:HTTP 缓存、Redis、内存缓存 ⭐
- 🔄 限流 (rate limiting)
- ⬜ 后台任务 / 队列 (background jobs / queues)
- ⬜ 文件上传与存储

## 3. 数据库 (Database)
- ✅ 关系型设计:范式、关系、主键/外键/**索引**
- ✅ **事务 (transactions)** / 原子性
- ⬜ **查询优化**:`EXPLAIN ANALYZE`、**N+1 问题** ⭐(面试高频)
- ✅ 迁移 (migrations)
- ⬜ NoSQL 认知:Redis / Mongo 的适用场景

## 4. 交付与运维 (DevOps / Delivery)
- ✅ 环境变量与密钥管理
- 🔄 **构建 / 打包 (build/bundle)**
- ⬜ **部署 (deployment)**:Vercel(前端)+ Fly.io(后端)⭐
- ⬜ **CI/CD**:GitHub Actions(推代码 → 自动测试 → 自动部署)⭐
- ⬜ 容器化:Docker 基础(工作 JD 常见要求)
- ✅🔄 监控与可观测性:日志 (logging) ✅、错误追踪 (Sentry)、指标

## 5. 安全 (Security)
- ✅ 密码哈希 (bcrypt)、JWT
- 🔄 **加密 vs 编码 vs 哈希**的区别(Day 01 起了个头)⭐
- ⬜ **OWASP Top 10**:XSS、CSRF、SQL 注入、CORS ⭐(面试常问)
- ⬜ HTTPS / TLS 工作原理
- 🔄 输入校验与清洗 (sanitization)

## 6. 测试与质量 (Testing & Quality) ← ⚠️ 你目前最大的空白
- ⬜ **单元测试 (unit)** ⭐、集成测试 (integration)、E2E
- ⬜ 工具:Vitest(单测)、Playwright(E2E)
- ⬜ TDD 概念、测试覆盖率
> 几乎所有全栈岗位 JD 都要求"会写测试"。这块补上,竞争力立刻不同。

## 7. 面试专项 (Interview Prep) ← 直接决定拿不拿得到 offer
- ⬜ **数据结构与算法 (DSA)**:数组/哈希表/栈队列/树/图 + Big-O ⭐(coding 面试)
- ⬜ **系统设计基础 (system design)**:如何设计一个简化版系统
- ⬜ 行为面试 (behavioral):STAR 法讲项目经历
- ✅🔄 **英语技术沟通**:讲解代码、code review、参加站会 ⭐(每天在练)

## 8. AI 集成 (现代加分项) ← 你正在做,很稀缺
- 🔄 LLM API、结构化输出、成本控制、提示工程

---

## 我的建议:优先级排序(拿 offer 视角)

**第一梯队(先补,回报最高):**
1. 测试 (Testing) — 从空白到会写单测
2. 部署 + CI/CD — 让项目真正"上线",简历有链接
3. API 设计规范 + 查询优化(N+1)— 后端面试核心

**第二梯队(拉开差距):**
4. 前端性能优化 + a11y
5. 安全 (OWASP)、缓存
6. DSA + 系统设计(为 coding 面试)

**贯穿始终:**
- 英语技术表达(每天在练 ✅)
- Git/PR/code review 工作流

> 好消息:上面**一大半都能在 interview-coach 这一个项目里练到**——它已经有前端(React/Vite)、后端(Express)、数据库(Prisma/Supabase)、AI 集成。我们边做功能边把这些点一个个点亮。
