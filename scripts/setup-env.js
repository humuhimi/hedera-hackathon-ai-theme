#!/usr/bin/env node

/**
 * Environment Setup Script
 *
 * This script helps new developers set up their .env files by copying
 * from .env.example files in each workspace.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const workspaces = ['frontend', 'backend', 'agents'];
const rootDir = path.join(__dirname, '..');

async function setupEnvFiles() {
  console.log('🔧 Environment Setup for Hedera Hackathon AI Theme\n');

  // Root .env setup
  await setupEnvForDirectory(rootDir, 'root');

  // Workspace .env setup
  for (const workspace of workspaces) {
    const workspaceDir = path.join(rootDir, workspace);
    if (fs.existsSync(workspaceDir)) {
      await setupEnvForDirectory(workspaceDir, workspace);
    }
  }

  console.log('\n✅ Environment setup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Update .env files with your actual values');
  console.log('   2. Set up your Hedera testnet account');
  console.log('   3. Configure IPFS/Pinata credentials if needed');
  console.log('   4. Run "npm run dev" to start the development servers\n');

  rl.close();
}

async function setupEnvForDirectory(dir, name) {
  const examplePath = path.join(dir, '.env.example');
  const envPath = path.join(dir, '.env');

  if (!fs.existsSync(examplePath)) {
    console.log(`⚠️  No .env.example found in ${name}, skipping...`);
    return;
  }

  if (fs.existsSync(envPath)) {
    const answer = await question(
      `📁 ${name}/.env already exists. Overwrite? (y/N): `
    );
    if (answer.toLowerCase() !== 'y') {
      console.log(`   Skipping ${name}/.env`);
      return;
    }
  }

  try {
    fs.copyFileSync(examplePath, envPath);
    console.log(`✓ Created ${name}/.env from .env.example`);
  } catch (error) {
    console.error(`❌ Error creating ${name}/.env:`, error.message);
  }
}

// Handle script errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});

// Run the setup
setupEnvFiles().catch((error) => {
  console.error('❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
