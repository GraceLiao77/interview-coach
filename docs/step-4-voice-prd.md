# PRD — Step 4-voice: 语音答题(Groq Whisper 转写)

**Status:** Planned · **Prerequisite:** Step 4 主体(出题 + 打字答题 + 评分)已完成并端到端跑通。

## Context / 为什么
产品核心之一是"语音答题"(PRD feature #3)。原设计用 **Whisper API** 做权威转写。**决策:改用 Groq 托管的 Whisper**(`whisper-large-v3`),而不是 OpenAI 直连。

**为什么 Groq(而不是 OpenAI Whisper):**
- **它跑的就是 Whisper** —— 同一个模型、同样质量,只是"房东"更便宜,不偏离原 PRD。
- **有免费额度** —— 契合 ~$12 / 2–3 个月的预算,几乎零成本。
- **快** —— Groq 推理极快,转写近乎秒回,体验好。
- **OpenAI 兼容 API** —— `/audio/transcriptions` 接口与 OpenAI 一致,代码好写,**以后想换回 OpenAI/别家几行就切**。
- **对口音友好** —— `whisper-large-v3` 多语言,对带口音的英语(ESL 用户)识别不错。

**注意点(诚实):** 免费层**有限流**(每天请求数 / 每分钟量),用前查一下当前限额;第三方依赖(所以"好切换"很重要);音频会发到 Groq(个人项目可接受)。

## 架构 / 数据流(与现有评分无缝拼接)
```
① 前端:浏览器录音 (MediaRecorder) → 音频 blob
② 上传:POST 音频到后端(multipart/form-data)
③ 后端:音频 → Groq Whisper (whisper-large-v3) → transcript(文字)
④ 复用现有:transcript 当作"答案文本" → scoreAnswer + saveAnswerWithScore(已完成)
```
👉 语音转写只是插在"评分之前"多一步,后面全部复用现成流程。

## 子步骤(一次一个概念,Jin 写逻辑 / AI 写 markup+CSS + review)
1. **Groq 接入**:注册免费账号 → 拿 `GROQ_API_KEY` → 放 `server/.env`(+ `.env.example`,`env.ts` 校验)。
2. **转写 service(后端)**:`server/src/services/transcriptionService.ts` → `transcribe(audio)` → 调 Groq `/audio/transcriptions`(模型 `whisper-large-v3-turbo`,更快更省;要更准用 `whisper-large-v3`)。**加 mock 模式**:开发期返回假 transcript,0 成本、不耗额度。
   - 客户端可用**官方 `groq-sdk`**,或 `openai` SDK 指向 `baseURL: https://api.groq.com/openai/v1`(二选一,均 OpenAI 兼容)。
3. **音频上传端点(后端)**:Express 处理**文件上传**(需 `multer` 中间件,因为音频是 multipart 不是 JSON)。
   - 方案:扩展/新增 `POST /api/questions/:id/answers`(带音频)→ 先转写 → 再走现有评分+存库;归属校验照旧。
4. **前端录音**:`MediaRecorder` 录音 —— 录制时只显示**波形/计时器**,**实时字幕默认关闭(toggle)**;答完后再显示转写(符合 PRD:防止用户盯屏自我修正)。停止 → blob → 上传。

## 成本 / mock
- **mock 模式**返回写死的 transcript(0 成本、不触发限流),开发全程免费。
- 真跑前查 Groq 免费层限额。

## 环境变量
- `GROQ_API_KEY`(**仅服务端**,和其他 key 一样绝不进前端)。

## 语音内的后续(先不做)
- **双轨转写**:Web Speech API(浏览器自带、$0)做答题时**实时预览**,Groq Whisper 做**权威转写**——呼应原 PRD 设计。
- **Delivery 指标**:语速 (WPM)、长停顿、口头禅——从音频/转写时间戳算出来,让 delivery 轴从"猜"变"准"。

## 验证
1. mock 模式:录音 → 上传 → 返回假 transcript → 评分展示,全程免费跑通。
2. 关 mock、放真 key:录一句 → 确认 Groq 返回的 transcript 合理 → 评分正常。
3. 失败路径:无音频 / 超限 → 友好报错。
