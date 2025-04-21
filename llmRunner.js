import OpenAI from "openai";
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.deepseek_api_key,
  baseURL: "https://api.deepseek.com/beta"
});

const sleep = ms => new Promise(res => setTimeout(res, ms));

const functionMap = {
  getWeather: async (city) => {
    console.log(`🌤️ 正在获取 ${city} 的天气...`);
    await sleep(2500);
    return `${city} 晴天 22°C - 32°C 东北风3级`;
  },
  getFood: async (city) => {
    console.log(`🍜 正在获取 ${city} 的美食推荐...`);
    await sleep(2500);
    return `${city} 有烤鸭、豆汁、炸酱面`;
  }
};

async function detectFunctionCallAndRun(rawContent) {
  // 全局匹配函数调用占位符，支持可选空格
  const regex = /\[FunctionCall:\s*(\w+)\((.*?)\)\]/g;
  const matches = [...rawContent.matchAll(regex)];
  // 无函数调用
  if (matches.length === 0) return { content: rawContent, done: true };

  let content = rawContent;
  // 依次调用所有函数并替换占位符
  for (const m of matches) {
    const [placeholder, fnName, arg] = m;
    const fn = functionMap[fnName];
    if (!fn) throw new Error(`未注册函数：${fnName}`);
    console.log(`\n⏳ 调用函数 ${fnName}(${arg}) ...`);
    const result = await fn(arg);
    content = content.replace(placeholder, result);
  }
  return { content, done: false };
}

async function streamChat(messages) {
  // 发起流式请求
  const stream = await openai.chat.completions.create({
    model: "deepseek-chat",
    stream: true,
    messages
  });

  let rawContent = "";
  let handleTask = null;

  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta?.content;
    if (!delta) continue;
    rawContent += delta;
    process.stdout.write(delta);

    // 检测到完整函数调用占位符后异步处理，不阻塞后续输出
    if (!handleTask && /\[FunctionCall:\s*\w+\(.*?\)\]/.test(rawContent)) {
      console.log("\n⏸️ 检测到函数调用，占位符完整，启动异步处理...");
      handleTask = detectFunctionCallAndRun(rawContent)
        .then(({ content, done }) => {
          if (done) {
            console.log("\n✅ 无函数调用，流程结束");
          } else {
            console.log("\n🔁 插入后内容：", content);
            console.log("\n🔄 使用 prefix 续写...\n");
            return streamChat([
              ...messages,
              { role: "assistant", content: content + "已调用function call"}
              // { role: "assistant", content: content + "已调用function call" , prefix: true } prefix有时候会产生bug
            ]);
          }
        })
        .catch(console.error);
    }
  }

  // 等待异步处理完成
  if (handleTask) await handleTask;
}

async function main() {
  const messages = [
    {
      role: "system",
      content: "你是一个旅游助手，可以使用 [FunctionCall:name(arg)] 的方式请求信息。函数包括：getWeather(city), getFood(city)"
    },
    {
      role: "user",
      content: "请告诉我北京的天气，并推荐美食。"
    }
  ];

  await streamChat(messages);
}

main().catch(console.error);
