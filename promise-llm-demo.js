import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.deepseek_api_key,
  baseURL: "https://api.deepseek.com/beta"
});

// streamChatDemo.js
const sleep = ms => new Promise(res => setTimeout(res, ms));

// 模拟 function call
const functionMap = {
  getWeather: async (city) => {
    await sleep(5000); // 模拟 API 延迟
    return `晴天 22°C`;
  }
};

async function main() {
  const messages = [
    { role: "system", content: "你是一个旅游助手，可以使用 [FunctionCall:name(arg)] 的方式请求信息。可供使用的函数：getWeather(city)" },
    { role: "user", content: "请告诉我北京的天气，并推荐适合的活动。" }
  ];

  // 第一次请求，stream 模式读取前缀内容
  const stream = await openai.chat.completions.create({
    model: "deepseek-chat",
    stream: true,
    messages
  });

  let rawContent = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta?.content;
    if (delta) {
      rawContent += delta;
      process.stdout.write(delta);

      // 模拟检测 FunctionCall 中断点
      const match = rawContent.match(/\[FunctionCall:(\w+)\((.*?)\)\]/);
      if (match) {
        console.log("\n⏸️ 检测到函数调用：", match[0]);

        // 调用函数
        const fnName = match[1];
        const arg = match[2];
        const value = await functionMap[fnName](arg);

        // 插入值并 prefix 续写
        const injected = rawContent.replace(match[0], value);
        console.log("\n🔁 插入后内容：", injected);

        // 使用 prefix 续写
        const continueStream = await openai.chat.completions.create({
          model: "deepseek-chat",
          stream: true,
          messages: [
            ...messages,
            {
              role: "assistant",
              content: injected,
              prefix: true
            }
          ]
        });

        for await (const chunk of continueStream) {
          const more = chunk.choices[0].delta?.content;
          if (more) process.stdout.write(more);
        }

        return; // 结束主函数
      }
    }
  }
}

main().catch(console.error);
