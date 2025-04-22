import { openai, tools } from './config.js';
import { createFunctionPromises } from './functionHandler.js';

/**
 * 流式输出助手回复
 * @param {Object} stream - 流式响应
 * @returns {Promise<string>} - 完整内容
 */
async function streamOutput(stream) {
  let content = "";
  process.stdout.write('\n');
  
  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta?.content;
    if (delta) {
      content += delta;
      process.stdout.write(delta);
    }
  }
  process.stdout.write('\n');
  return content;
}

/**
 * 流式输出并收集工具调用
 * @param {Object} stream - 流式响应
 * @returns {Promise<Object>} - 内容和工具调用
 */
async function streamAndCollectToolCalls(stream) {
  let content = "";
  let toolCalls = [];
  let pendingToolCall = null;
  
  process.stdout.write('\n');
  
  for await (const chunk of stream) {
    // 处理内容
    if (chunk.choices[0].delta?.content) {
      const delta = chunk.choices[0].delta.content;
      content += delta;
      process.stdout.write(delta);
    }
    
    // 处理工具调用
    if (chunk.choices[0].delta?.tool_calls) {
      for (const toolCallDelta of chunk.choices[0].delta.tool_calls) {
        const index = toolCallDelta.index;
        
        // 初始化工具调用数组
        while (toolCalls.length <= index) {
          toolCalls.push({ function: { arguments: '' } });
        }
        
        // 更新工具调用信息
        if (toolCallDelta.id) {
          toolCalls[index].id = toolCallDelta.id;
        }
        
        if (toolCallDelta.function?.name) {
          if (!toolCalls[index].function) {
            toolCalls[index].function = { arguments: '' };
          }
          toolCalls[index].function.name = toolCallDelta.function.name;
        }
        
        if (toolCallDelta.function?.arguments) {
          toolCalls[index].function.arguments += toolCallDelta.function.arguments;
        }
      }
    }
  }
  
  process.stdout.write('\n');
  
  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : null
  };
}

/**
 * 增强型聊天 - 在等待函数调用结果时继续生成内容
 * @returns {Promise<void>}
 */
export async function enhancedChat() {
  // 初始用户问题
  const messages = [
    { 
      role: "system", 
      content: "你是旅游助手，可调用函数获取信息。等待函数结果时，请介绍相关景点。" 
    },
    { 
      role: "user", 
      content: "请告诉我北京的天气和美食。" 
    }
  ];

  // 第一轮对话 - 获取 function call
  console.log("🔄 第一轮对话：获取 function call...");
  
  // 流式输出并收集工具调用
  const stream1 = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages,
    tools,
    stream: true
  });
  
  const { content: assistantContent, toolCalls } = await streamAndCollectToolCalls(stream1);
  
  // 构造助手消息
  const assistantMessage = { role: 'assistant', content: assistantContent };
  if (toolCalls) {
    assistantMessage.tool_calls = toolCalls.map(call => ({
      id: call.id,
      type: 'function',
      function: {
        name: call.function.name,
        arguments: call.function.arguments
      }
    }));
  }
  
  // 如果有 function call
  if (toolCalls && toolCalls.length > 0) {
    console.log("⏳ 检测到 function call，启动异步处理...");
    
    // 创建 function call 的 Promise
    const functionPromises = createFunctionPromises(toolCalls);
    
    // 创建一个新的对话历史，不包含待处理的 tool_calls
    const cleanMessages = [
      { 
        role: "system", 
        content: "你是旅游助手，可调用函数获取信息。等待函数结果时，请介绍相关景点。" 
      },
      { 
        role: "user", 
        content: "请告诉我北京的天气和美食。" 
      },
      {
        role: "assistant",
        content: assistantContent || "我将为您查询北京的天气和美食信息。"
      }
    ];
    
    // 第二轮对话 - 让 LLM 在等待时继续生成内容
    console.log("🔄 第二轮对话：让 LLM 在等待时继续生成内容...");
    const bridgeMessages = [
      ...cleanMessages,
      { 
        role: "user", 
        content: "在等待天气和美食信息的同时，请简要介绍北京的主要景点。" 
      }
    ];
    
    // 保存原始消息历史（包含 tool_calls）供后续使用
    messages.push(assistantMessage);
    
    // 流式输出景点介绍
    console.log("🔛️ 景点介绍：");
    const stream2 = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: bridgeMessages,
      stream: true
    });
    const bridgeContent = await streamOutput(stream2);
    
    // 等待所有 function call 完成
    const functionResults = await Promise.all(functionPromises);
    console.log("✅ 所有 function call 已完成");
    
    // 第三轮对话 - 整合所有信息
    const finalMessages = [
      ...messages,
      ...functionResults,
      { 
        role: "user", 
        content: `请将天气信息、美食推荐和以下景点介绍整合成一份完整的北京旅游指南：\n\n${bridgeContent}` 
      }
    ];
    
    console.log("🔄 第三轮对话：整合所有信息...");
    console.log("\n📝 最终回复：");
    
    // 流式输出最终结果
    const stream3 = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: finalMessages,
      stream: true
    });
    await streamOutput(stream3);
  } else {
    // 无 function call，直接输出
    console.log(assistantContent);
  }
}
