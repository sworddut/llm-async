## ✅ 现状痛点解析

### 1. **紧急纠错场景**

- **现状：** ChatGPT 等 LLM 在响应生成过程中不允许用户打断修改，只能等待完整输出。
- **痛点：** 用户在发现误解后只能“事后补救”，交互效率极低。
- **典型例子：** 用户说“帮我查下明天的天气”，实际是后天，中途想更正却无法中断。

------

### 2. **实时决策场景中的异步调用滞后**

- **现状：** LLM 处理流程是串行的，`tool call` 阶段必须等外部 API 返回后，才能继续生成。
- **痛点：** 例如在旅行推荐中，天气 API 慢或失败导致建议滞后或卡死，不够灵活。

------

### 3. **多线程交互场景缺失**

- **现状：** LLM 在单一上下文中是顺序生成的，不支持用户插话、多工并行。
- **痛点：** 用户边问边查资料，或同时进行多个任务时，模型无法分清优先级或暂停上下文。

------

# llm-async

一个演示**异步函数调用**与**流式输出**补丁机制的 Node.js 原型项目。

通过两个 demo：

- **mock-async.js**：模拟 LLM 流式输出，遇到占位符 `[FunctionCall:xxx(arg)]` 后异步触发函数调用，并在函数返回后动态 patch 并输出补丁。
- **llmRunner.js**：集成 OpenAI（或 Deepseek）流式 Chat Completion，检测函数调用占位符并异步执行，插入函数结果并使用 `prefix` 参数续写对话。

---

## 功能亮点

- **非阻塞函数调用**：函数调用不会卡住主输出流，流式输出连续无中断。
- **动态补丁插入**：函数返回后自动替换占位符，并在控制台打印补丁内容。
- **支持多次调用**：detectFunctionCallAndRun 支持全局匹配和多次函数替换。
- **实时 LLM 集成**：使用 OpenAI / Deepseek API 实现真实 Chat Completion 与函数调用演示。

---

## 快速开始

### 环境准备

1. 安装 Node.js（建议 16+）。
2. 克隆仓库并进入目录：
   ```bash
   git clone <repo_url>
   cd llm-async
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 复制并配置环境变量：
   ```bash
   cp .env.example .env
   # 在 .env 中填写你的 OPENAI_API_KEY 等配置
   ```

### 运行 mock-async.js

```bash
node mock-async.js
```
- 演示本地模拟 LLM 流式输出与函数调用补丁。

### 运行 llmRunner.js

```bash
node llmRunner.js
```
- 实际调用 OpenAI® Chat Completion 流，并处理 `[FunctionCall:xxx(arg)]` 占位符。 
- 根据提示在控制台中查看输出。

---

## 文件说明

- `mock-async.js`：模拟 LLM 输出字符串，演示异步函数调用与 patch。可自行修改 `functionMap` 添加更多示例函数。
- `llmRunner.js`：集成 OpenAI 流式 API，使用 `detectFunctionCallAndRun` 异步处理占位符并续写对话。
- `.env.example`：示例环境变量文件，配置 API Key。
- `package.json`：依赖管理。

---

## 后续优化

- 支持更多复杂的函数调用语法和嵌套场景。
- 将补丁机制封装成库，轻松集成各种流式 LLM 服务。
- UI 集成：将控制台示例搬到 Web 界面，提供可视化交互。

---

© 2025 llm-async 项目组