/**
 * Marketplace.sol Deployment Script (Hedera Testnet Only)
 * Deploy to Hedera Testnet using @hashgraph/sdk
 */
import { ethers } from "hardhat";
import {
  Client,
  AccountId,
  PrivateKey,
  ContractCreateFlow,
} from "@hashgraph/sdk";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log(`🚀 Deploying Marketplace contract to TESTNET...`);

  // Compile with Hardhat
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const bytecode = Marketplace.bytecode;
  const abi = Marketplace.interface.formatJson();

  console.log(`📦 Bytecode size: ${bytecode.length / 2 - 1} bytes`);
  console.log(`🔧 ABI methods: ${JSON.parse(abi).length}`);

  // Validate environment variables
  if (!process.env.HEDERA_MANAGER_ACCOUNT_ID || !process.env.HEDERA_MANAGER_PRIVATE_KEY) {
    throw new Error("HEDERA_MANAGER_ACCOUNT_ID and HEDERA_MANAGER_PRIVATE_KEY must be set in .env");
  }

  const accountId = AccountId.fromString(process.env.HEDERA_MANAGER_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_MANAGER_PRIVATE_KEY);

  // Testnet client
  console.log('📡 Connecting to Hedera Testnet...');
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  console.log(`\n📝 Deployer: ${accountId.toString()}`);
  console.log(`🌐 Network: TESTNET`);

  // Get IdentityRegistry address from .env
  const identityRegistryAddress = process.env.ERC8004_IDENTITY_REGISTRY_ADDRESS;
  if (!identityRegistryAddress) {
    throw new Error("ERC8004_IDENTITY_REGISTRY_ADDRESS must be set in .env");
  }

  console.log("\n⚙️  Contract info:");
  console.log(`   Type: Agent-to-Agent Marketplace (ERC-8004 Integration)`);
  console.log(`   Constructor parameters:`);
  console.log(`     - IdentityRegistry: ${identityRegistryAddress}`);

  try {
    console.log(`\n⏳ Submitting to Hedera Testnet...`);

    // Encode constructor parameters (IdentityRegistry address)
    const constructorParamsHex = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address"],
      [identityRegistryAddress]
    );
    const constructorParams = ethers.getBytes(constructorParamsHex);

    const contractTx = new ContractCreateFlow()
      .setBytecode(bytecode)
      .setConstructorParameters(constructorParams)
      .setGas(4000000) // Set higher gas limit for complex Marketplace contract
      .setAdminKey(privateKey.publicKey); // Enable contract deletion

    const contractSubmit = await contractTx.execute(client);
    const contractReceipt = await contractSubmit.getReceipt(client);
    const contractId = contractReceipt.contractId;

    // Get transaction record for detailed information
    const contractRecord = await contractSubmit.getRecord(client);
    const transactionFee = contractRecord.transactionFee;
    const gasUsed = contractRecord.contractFunctionResult?.gasUsed ?? BigInt(0);

    // Convert to HBAR units (1 HBAR = 100,000,000 tinybar)
    const transactionFeeInTinybar = Number(transactionFee.toTinybars());
    const transactionFeeInHbar = transactionFeeInTinybar / 100_000_000;
    const gasUsedNumber = convertGasUsedToNumber(gasUsed);

    console.log("\n✅ Deployment successful!");
    console.log(`📄 Contract ID: ${contractId?.toString()}`);
    console.log(`📄 EVM Address: ${contractId?.toEvmAddress()}`);
    console.log(`\n💰 Cost Details:`);
    console.log(`   Transaction Fee: ${transactionFeeInTinybar.toLocaleString()} tinybar (${transactionFeeInHbar.toFixed(8)} HBAR)`);
    console.log(`   Gas Used: ${gasUsedNumber.toLocaleString()} / 4,000,000`);
    console.log(`   Gas Utilization: ${((gasUsedNumber / 4000000) * 100).toFixed(2)}%`);
    console.log(`🔗 HashScan: https://hashscan.io/testnet/contract/${contractId?.toString()}`);

    // Save deployment information
    const deploymentInfo = {
      contractId: contractId?.toString(),
      contractAddress: contractId?.toEvmAddress(),
      deployer: accountId.toString(),
      deployedAt: new Date().toISOString(),
      network: "testnet",
      deletable: true, // adminKey is set
      costs: {
        transactionFee: {
          tinybar: transactionFeeInTinybar.toString(),
          hbar: transactionFeeInHbar.toString(),
        },
        gasUsed: gasUsedNumber,
        gasLimit: 4000000,
        gasUtilization: `${((gasUsedNumber / 4000000) * 100).toFixed(2)}%`,
      },
      hashscanUrl: `https://hashscan.io/testnet/contract/${contractId?.toString()}`
    };

    const artifactsDir = path.join(process.cwd(), "artifacts");
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    const deploymentPath = path.join(artifactsDir, `marketplace-deployment-testnet.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

    // Display environment variables to add
    console.log(`\n📝 Add these to your .env file:`);
    console.log(`MARKETPLACE_CONTRACT_ID=${contractId?.toString()}`);
    console.log(`MARKETPLACE_CONTRACT_ADDRESS=${contractId?.toEvmAddress()}`);

    console.log(`
🗑️  To delete this contract later:`);
    console.log(`   npx tsx scripts/delete-contract.ts ${contractId?.toString()}`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  } finally {
    client.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
