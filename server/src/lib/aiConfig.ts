// model version and price centralized management 模型版本和价格集中管理
export const MODELS = {
    questions: {
        id: "claude-sonnet-5",
        input: 2,
        output: 10
    },
    scoring: {
        id: "claude-opus-5-5",
        input: 4,
        output: 20
    },
} as const;
type ModelsConfig = typeof MODELS;
 // one config object per model (values of the first layer)
type ModelConfig = (ModelsConfig)[keyof ModelsConfig]
 // the id field of each config: "claude-sonnet-5" | "claude-opus-5-5"
export type ModelId = (ModelConfig)['id']