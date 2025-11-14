/**
 * A2A Protocol Conversation Test
 * SellerとBuyerエージェントが自動的にやりとりするテスト
 */

import 'dotenv/config';

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

// エージェント情報（動的に取得される）
let SELLER_AGENT: { id: string; name: string; url: string };
let BUYER_AGENT: { id: string; name: string; url: string };

const MAX_MESSAGES = 8;
const SERVER_PORT = process.env.SERVER_PORT;
const ELIZAOS_URL = `http://127.0.0.1:${SERVER_PORT}`;

// エージェントをセットアップ（動的作成）
async function setupAgents() {
  console.log('🔨 Creating test agents...');

  // Seller作成
  const sellerResponse = await fetch(`${ELIZAOS_URL}/internal/agents/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'give' })
  });

  if (!sellerResponse.ok) {
    throw new Error(`Failed to create seller agent: ${sellerResponse.status}`);
  }

  const seller = await sellerResponse.json();

  // Buyer作成
  const buyerResponse = await fetch(`${ELIZAOS_URL}/internal/agents/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'want' })
  });

  if (!buyerResponse.ok) {
    throw new Error(`Failed to create buyer agent: ${buyerResponse.status}`);
  }

  const buyer = await buyerResponse.json();

  SELLER_AGENT = {
    id: seller.agentId,
    name: seller.name,
    url: `${ELIZAOS_URL}/agents/${seller.agentId}/a2a/`
  };

  BUYER_AGENT = {
    id: buyer.agentId,
    name: buyer.name,
    url: `${ELIZAOS_URL}/agents/${buyer.agentId}/a2a/`
  };

  console.log(`✅ Created ${SELLER_AGENT.name} (${SELLER_AGENT.id})`);
  console.log(`✅ Created ${BUYER_AGENT.name} (${BUYER_AGENT.id})`);
  console.log('');
}

// エージェントをクリーンアップ（削除）
async function cleanupAgents() {
  console.log('\n🧹 Cleaning up test agents...');

  if (SELLER_AGENT) {
    await fetch(`${ELIZAOS_URL}/internal/agents/${SELLER_AGENT.id}`, {
      method: 'DELETE'
    });
    console.log(`✅ Deleted ${SELLER_AGENT.name}`);
  }

  if (BUYER_AGENT) {
    await fetch(`${ELIZAOS_URL}/internal/agents/${BUYER_AGENT.id}`, {
      method: 'DELETE'
    });
    console.log(`✅ Deleted ${BUYER_AGENT.name}`);
  }
}

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
  let currentSender = BUYER_AGENT; // Start with Buyer
  let currentReceiver = SELLER_AGENT;
  let lastResponse = 'Hello! I have some questions about your products. What kind of items do you sell?';

  // Add initial message to history
  conversationHistory.push({
    sender: currentSender.name,
    receiver: currentReceiver.name,
    text: lastResponse,
    messageId: 'msg-initial-0',
    timestamp: new Date().toISOString(),
  });

  while (messageCount < MAX_MESSAGES) {
    messageCount++;
    const timestamp = Date.now();
    const messageId = `msg-${timestamp}-${messageCount}`;

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

      // Add response to history (only responses are recorded to avoid duplication)
      conversationHistory.push({
        sender: currentReceiver.name,
        receiver: currentSender.name,
        text: responseText,
        messageId: response.result.messageId,
        timestamp: new Date().toISOString(),
      });

      // Prepare next message
      lastResponse = responseText;

      // Swap sender and receiver
      [currentSender, currentReceiver] = [currentReceiver, currentSender];

      // Wait before next message
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error sending message:`, error);
      break;
    }
  }

  // Summary
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

  // JSON output
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

  // Save to file
  const fs = await import('fs/promises');
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

  return output;
}

// Main execution
async function main() {
  try {
    // Setup agents
    await setupAgents();

    // Run conversation
    await runConversation();

    // Cleanup
    await cleanupAgents();

    console.log('✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);

    // Try cleanup even on error
    try {
      await cleanupAgents();
    } catch (cleanupError) {
      console.error('Failed to cleanup:', cleanupError);
    }

    process.exit(1);
  }
}

main();
