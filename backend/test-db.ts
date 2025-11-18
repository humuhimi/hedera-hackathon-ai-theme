import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Creating test user...');
  const user = await prisma.user.create({
    data: {
      hederaAccountId: '0.0.test123',
      did: 'did:hedera:testnet:test123',
      userName: 'Test User',
    },
  });
  console.log('✅ User created:', user.id);

  console.log('🤖 Creating test agent...');
  const agent = await prisma.agent.create({
    data: {
      userId: user.id,
      type: 'give',
      name: 'Test Agent',
      description: 'Test agent for history persistence',
      status: 'active',
      channelId: 'test-channel-123',
    },
  });
  console.log('✅ Agent created:', agent.id);

  console.log('💬 Creating test messages...');
  await prisma.message.create({
    data: {
      agentId: agent.id,
      role: 'user',
      content: 'Hello, agent!',
    },
  });
  
  await prisma.message.create({
    data: {
      agentId: agent.id,
      role: 'agent',
      content: 'Hello! How can I help you today?',
    },
  });
  
  await prisma.message.create({
    data: {
      agentId: agent.id,
      role: 'user',
      content: 'Tell me about your capabilities',
    },
  });
  
  await prisma.message.create({
    data: {
      agentId: agent.id,
      role: 'agent',
      content: 'I am a marketplace agent that can help you with buying and selling items!',
    },
  });
  
  console.log('✅ Messages created');
  
  console.log('\n📊 Verifying data:');
  const messages = await prisma.message.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'asc' },
  });
  
  console.log(`Found ${messages.length} messages:`);
  messages.forEach((msg, i) => {
    console.log(`  ${i+1}. [${msg.role}] ${msg.content}`);
  });
  
  console.log('\n🎯 Test data summary:');
  console.log(`  User ID: ${user.id}`);
  console.log(`  Agent ID: ${agent.id}`);
  console.log(`  Messages: ${messages.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
