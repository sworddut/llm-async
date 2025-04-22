import 'dotenv/config';
import OpenAI from 'openai';

// 初始化 OpenAI 客户端
export const openai = new OpenAI({
  apiKey: process.env.deepseek_api_key,
  baseURL: "https://api.deepseek.com/beta"
});

// 工具函数
export const sleep = ms => new Promise(res => setTimeout(res, ms));

// 本地函数映射
export const functionMap = {
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

// 工具定义，供模型调用
export const tools = [
  {
    type: 'function',
    function: {
      name: 'getWeather',
      description: '获取某地天气信息',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: '城市名称，例如北京' }
        },
        required: ['location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getFood',
      description: '获取某地美食推荐',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: '城市名称，例如北京' }
        },
        required: ['location']
      }
    }
  }
];
