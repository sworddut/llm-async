import { functionMap } from './config.js';

/**
 * 处理工具调用并获取结果
 * @param {Array} toolCalls - 工具调用数组
 * @returns {Promise<Array>} - 工具调用结果数组
 */
export async function handleToolCalls(toolCalls) {
  const results = [];
  
  for (const call of toolCalls) {
    try {
      const { name, arguments: argsStr } = call.function;
      console.log(`\n⏳ 调用函数 ${name}...`);
      
      // 解析参数
      let args;
      try {
        args = JSON.parse(argsStr);
      } catch (e) {
        console.error('解析参数失败:', argsStr);
        args = {};
      }
      
      // 执行函数
      const fn = functionMap[name];
      if (!fn) throw new Error(`未注册函数: ${name}`);
      
      const result = await fn(args.location);
      results.push({
        tool_call_id: call.id,
        role: 'tool',
        content: result
      });
    } catch (error) {
      console.error(`函数调用失败:`, error);
      results.push({
        tool_call_id: call.id,
        role: 'tool',
        content: `Error: ${error.message}`
      });
    }
  }
  
  return results;
}

/**
 * 创建函数调用的 Promise
 * @param {Array} toolCalls - 工具调用数组
 * @returns {Promise<Array>} - 工具调用结果数组
 */
export function createFunctionPromises(toolCalls) {
  return toolCalls.map(async (call) => {
    const { name, arguments: argsStr } = call.function;
    let args;
    
    try {
      args = JSON.parse(argsStr);
    } catch (e) {
      console.error('解析参数失败:', argsStr);
      args = {};
    }
    
    console.log(`🔄 异步调用 ${name}(${args.location || 'unknown'})...`);
    
    try {
      const fn = functionMap[name];
      if (!fn) throw new Error(`未注册函数: ${name}`);
      
      const result = await fn(args.location);
      return {
        tool_call_id: call.id,
        role: 'tool',
        content: result
      };
    } catch (error) {
      console.error(`函数调用失败:`, error);
      return {
        tool_call_id: call.id,
        role: 'tool',
        content: `Error: ${error.message}`
      };
    }
  });
}
