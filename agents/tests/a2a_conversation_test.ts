/**
 * A2A Protocol Conversation Test
 * SellerとBuyerエージェントが自動的にやりとりするテスト
 */

interface A2AMessage {
  jsonrpc: '2.0';
  method: 'message/send';
  params: {
    message: {
      messageId: string;
      role: 'user' | 'agent';
      parts: Array<{ kind: 'text'; text: string }>;
    };
  };
  id: number;
}

interface A2AResponse {
  jsonrpc: '2.0';
  id: number;
  result: {
    kind: 'message';
    messageId: string;
    role: 'agent';
    parts: Array<{ kind: 'text'; text: string }>;
  };
}

// エージェント情報
const SELLER_AGENT = {
  id: 'f94b12ef-5fcd-0811-a35b-7b19aa7b22c3',
  name: 'SellerAgent',
  url: 'http://127.0.0.1:3333/agents/f94b12ef-5fcd-0811-a35b-7b19aa7b22c3/a2a/',
};

const BUYER_AGENT = {
  id: 'dc8e3cb0-ac89-002b-be82-305ed0e65a26',
  name: 'BuyerAgent',
  url: 'http://127.0.0.1:3333/agents/dc8e3cb0-ac89-002b-be82-305ed0e65a26/a2a/',
};

const MAX_MESSAGES = 8;

// メッセージ送信関数
async function sendMessage(
  toAgent: typeof SELLER_AGENT | typeof BUYER_AGENT,
  messageText: string,
  messageId: string,
  requestId: number
): Promise<A2AResponse> {
  const message: A2AMessage = {
    jsonrpc: '2.0',
    method: 'message/send',
    params: {
      message: {
        messageId,
        role: 'user',
        parts: [{ kind: 'text', text: messageText }],
      },
    },
    id: requestId,
  };

  const response = await fetch(toAgent.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// 会話履歴
interface ConversationMessage {
  sender: string;
  receiver: string;
  text: string;
  messageId: string;
  timestamp: string;
}

const conversationHistory: ConversationMessage[] = [];

// メイン会話ループ
async function runConversation() {
  console.log('🎭 A2A Protocol Conversation Test');
  console.log('='.repeat(60));
  console.log(`Seller: ${SELLER_AGENT.name} (${SELLER_AGENT.id})`);
  console.log(`Buyer:  ${BUYER_AGENT.name} (${BUYER_AGENT.id})`);
  console.log(`Max Messages: ${MAX_MESSAGES}`);
  console.log('='.repeat(60));
  console.log('');

  let messageCount = 0;
  let currentSender = BUYER_AGENT; // Buyerから開始
  let currentReceiver = SELLER_AGENT;
  let lastResponse = 'Hello! I have some questions about your products. What kind of items do you sell?';

  while (messageCount < MAX_MESSAGES) {
    messageCount++;
    const timestamp = Date.now();
    const messageId = `msg-${timestamp}-${messageCount}`;
    const isoTimestamp = new Date().toISOString();

    console.log(`\n📨 Message ${messageCount}/${MAX_MESSAGES}`);
    console.log(`From: ${currentSender.name}`);
    console.log(`To:   ${currentReceiver.name}`);
    console.log(`Text: ${lastResponse}`);
    console.log('-'.repeat(60));

    // メッセージ送信
    try {
      const response = await sendMessage(
        currentReceiver,
        lastResponse,
        messageId,
        messageCount
      );

      const responseText = response.result.parts[0]?.text || 'No response';

      console.log(`✅ Response received:`);
      console.log(`   ${responseText}`);

      // 会話履歴に追加
      conversationHistory.push({
        sender: currentSender.name,
        receiver: currentReceiver.name,
        text: lastResponse,
        messageId,
        timestamp: isoTimestamp,
      });

      conversationHistory.push({
        sender: currentReceiver.name,
        receiver: currentSender.name,
        text: responseText,
        messageId: response.result.messageId,
        timestamp: new Date().toISOString(),
      });

      // 次のメッセージの準備
      lastResponse = responseText;

      // 送信者と受信者を入れ替え
      [currentSender, currentReceiver] = [currentReceiver, currentSender];

      // 少し待機
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error sending message:`, error);
      break;
    }
  }

  // 結果サマリー
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 Conversation Summary');
  console.log('='.repeat(60));
  console.log(`Total messages exchanged: ${conversationHistory.length}`);
  console.log(`Max messages limit: ${MAX_MESSAGES}`);
  console.log('');

  console.log('💬 Full Conversation:');
  console.log('');
  conversationHistory.forEach((msg, idx) => {
    console.log(`${idx + 1}. [${msg.sender} → ${msg.receiver}]`);
    console.log(`   ${msg.text}`);
    console.log('');
  });

  // JSON出力
  const output = {
    test: 'A2A Conversation Test',
    timestamp: new Date().toISOString(),
    agents: {
      seller: SELLER_AGENT,
      buyer: BUYER_AGENT,
    },
    stats: {
      totalMessages: conversationHistory.length,
      maxMessages: MAX_MESSAGES,
      completed: messageCount >= MAX_MESSAGES,
    },
    conversation: conversationHistory,
  };

  console.log('='.repeat(60));
  const outputPath = './tests/a2a_conversation_result.json';
  console.log(`📄 JSON Output saved to ${outputPath}`);

  // ファイルに保存
  const fs = await import('fs/promises');
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

  return output;
}

// 実行
runConversation()
  .then(() => {
    console.log('✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
