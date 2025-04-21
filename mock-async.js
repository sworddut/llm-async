// streamChatDemo.js
const sleep = ms => new Promise(res => setTimeout(res, ms));

// 模拟 function call
const functionMap = {
  weather: async (city) => {
    await sleep(3000); // 模拟 API 延迟
    return `晴天 22°C`;
  }
};

// 支持提取所有 function call 占位符
// function detectAllFunctionCalls(text) {
//   const regex = /\[FunctionCall:(\w+)\((.*?)\)\]/g;
//   const matches = [...text.matchAll(regex)];
//   return matches.map(match => ({
//     fullMatch: match[0],
//     functionName: match[1],
//     args: match[2].split(',').map(s => s.trim()),
//     index: match.index
//   }));
// }

// 简化版：以$为function call结束符，遇到$时触发fc，插入结果后继续流式输出
async function streamResponse(input) {
  let output = "好的，北京的天气是[FunctionCall:weather(beijing)]$，这座城市是中国的首都，拥有悠久的历史北京，简称“京”，古称燕京、北平，是中华人民共和国的首都，全国的政治中心、文化中心、国际交往中心、科技创新中心，也是世界一线城市。北京作为城市的历史可以追溯到3000年前，先后成为多个朝代的都城。辽代作为陪都称为南京，金代在此建都称中都，元代改称大都，明清两代均定都北京。1949年新中国成立后，北京成为中华人民共和国的首都。北京拥有丰富的历史文化遗产，是世界上拥有世界文化遗产数量最多的城市之一。";
  let tokens = [...output];
  process.stdout.write('Bot: ');

  let patchDone = false;
  let patchPrinted = false;
  let patchResult = '';
  let currentOutput = '';

  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] === '$') {
      currentOutput += tokens[i];
      const match = currentOutput.match(/\[FunctionCall:(\w+)\((.*?)\)\]\$/);
      if (match) {
        const functionName = match[1];
        const args = match[2].split(',').map(s => s.trim());
        // 异步触发 function call
        (async () => {
          const result = await functionMap[functionName](...args);
          patchResult = currentOutput.replace(/\[FunctionCall:(\w+)\((.*?)\)\]\$/, result);
          patchDone = true;
        })();
      }
    }
    // 正常流式输出
    process.stdout.write(tokens[i]);
    currentOutput += tokens[i];
    i++;
    await sleep(30);
    // 如果 patch 完成
    if (patchDone && !patchPrinted) {
      console.log("\n🔄 补丁输出:");
      process.stdout.write('Bot: ' + patchResult + '\n');
      patchPrinted = true;
    }
  }
  process.stdout.write('\n');
}


// 测试输入
streamResponse("请告诉我北京的天气，并简单介绍一下这座城市");
