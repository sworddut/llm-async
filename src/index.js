import { enhancedChat } from './enhancedChat.js';

// 运行增强型聊天
enhancedChat()
  .catch(error => {
    console.error('运行出错:', error);
  });
