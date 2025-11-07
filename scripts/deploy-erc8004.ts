/**
 * Deploy the three ERC-8004 registries to Hedera based on locally compiled artifacts.
 */
import {
  AccountId,
  Client,
  ContractCreateFlow,
  ContractFunctionParameters,
  PrivateKey,
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env" });

type Artifact = { bytecode: string; abi: any[] };

const loadArtifact = (contractName: string): Artifact => {
  const artifactPath = path.join(
    process.cwd(),
    "erc-8004-contracts/artifacts/contracts",
    `${contractName}.sol/${contractName}.json`
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Missing artifact ${artifactPath}. Run "cd erc-8004-contracts && npm run compile" first.`
    );
  }

  return JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
};

const createClient = (network: string): Client => {
  if (network === "mainnet") {
    return Client.forMainnet();
  }

  if (network === "testnet") {
    return Client.forTestnet();
  }

  if (network === "previewnet") {
    return Client.forPreviewnet();
  }

  throw new Error(`Unsupported HEDERA_NETWORK "${network}".`);
};

const logExplorerUrl = (network: string, contractId: string) => {
  if (network === "mainnet" || network === "testnet" || network === "previewnet") {
    console.log(`   HashScan: https://hashscan.io/${network}/contract/${contractId}`);
    return;
  }

  throw new Error(`Unsupported explorer network "${network}".`);
};

async function deployContracts() {
  const network = process.env.HEDERA_NETWORK;
  if (!network) {
    throw new Error("HEDERA_NETWORK must be defined in your environment.");
  }

  const accountIdStr = process.env.HEDERA_MANAGER_ACCOUNT_ID;
  const privateKeyStr = process.env.HEDERA_MANAGER_PRIVATE_KEY;

  if (!accountIdStr || !privateKeyStr) {
    throw new Error("HEDERA_MANAGER_ACCOUNT_ID and HEDERA_MANAGER_PRIVATE_KEY must be defined.");
  }

  const accountId = AccountId.fromString(accountIdStr);
  const privateKey = PrivateKey.fromStringECDSA(privateKeyStr);

  const client = createClient(network);
  client.setOperator(accountId, privateKey);

  console.log(`Deploying ERC-8004 registries to ${network}`);
  console.log(`Operator: ${accountId.toString()}\n`);

  try {
    console.log("Deploying IdentityRegistry...");
    const identityArtifact = loadArtifact("IdentityRegistry");
    const identityTx = new ContractCreateFlow().setBytecode(identityArtifact.bytecode).setGas(2_000_000);
    const identitySubmit = await identityTx.execute(client);
    const identityReceipt = await identitySubmit.getReceipt(client);
    if (!identityReceipt.contractId) throw new Error("IdentityRegistry deployment failed.");
    const identityRecord = await identitySubmit.getRecord(client);
    const identityContractId = identityReceipt.contractId;
    const identityGas = Number(identityRecord.contractFunctionResult?.gasUsed ?? BigInt(0));
    const identityFee = Number(identityRecord.transactionFee.toTinybars());
    logExplorerUrl(network, identityContractId.toString());
    const identityResult = {
      name: "identityRegistry",
      contractId: identityContractId.toString(),
      evmAddress: identityContractId.toEvmAddress(),
      fee: identityFee,
      gasUsed: identityGas,
    };

    console.log("\nDeploying ReputationRegistry...");
    const reputationArtifact = loadArtifact("ReputationRegistry");
    const reputationParams = new ContractFunctionParameters().addAddress(identityContractId.toEvmAddress());
    const reputationTx = new ContractCreateFlow()
      .setBytecode(reputationArtifact.bytecode)
      .setGas(2_000_000)
      .setConstructorParameters(reputationParams);
    const reputationSubmit = await reputationTx.execute(client);
    const reputationReceipt = await reputationSubmit.getReceipt(client);
    if (!reputationReceipt.contractId) throw new Error("ReputationRegistry deployment failed.");
    const reputationRecord = await reputationSubmit.getRecord(client);
    const reputationContractId = reputationReceipt.contractId;
    const reputationGas = Number(reputationRecord.contractFunctionResult?.gasUsed ?? BigInt(0));
    const reputationFee = Number(reputationRecord.transactionFee.toTinybars());
    logExplorerUrl(network, reputationContractId.toString());
    const reputationResult = {
      name: "reputationRegistry",
      contractId: reputationContractId.toString(),
      evmAddress: reputationContractId.toEvmAddress(),
      fee: reputationFee,
      gasUsed: reputationGas,
      constructorParams: {
        identityRegistry: identityContractId.toEvmAddress(),
      },
    };

    console.log("\nDeploying ValidationRegistry...");
    const validationArtifact = loadArtifact("ValidationRegistry");
    const validationParams = new ContractFunctionParameters().addAddress(identityContractId.toEvmAddress());
    const validationTx = new ContractCreateFlow()
      .setBytecode(validationArtifact.bytecode)
      .setGas(2_000_000)
      .setConstructorParameters(validationParams);
    const validationSubmit = await validationTx.execute(client);
    const validationReceipt = await validationSubmit.getReceipt(client);
    if (!validationReceipt.contractId) throw new Error("ValidationRegistry deployment failed.");
    const validationRecord = await validationSubmit.getRecord(client);
    const validationContractId = validationReceipt.contractId;
    const validationGas = Number(validationRecord.contractFunctionResult?.gasUsed ?? BigInt(0));
    const validationFee = Number(validationRecord.transactionFee.toTinybars());
    logExplorerUrl(network, validationContractId.toString());
    const validationResult = {
      name: "validationRegistry",
      contractId: validationContractId.toString(),
      evmAddress: validationContractId.toEvmAddress(),
      fee: validationFee,
      gasUsed: validationGas,
      constructorParams: {
        identityRegistry: identityContractId.toEvmAddress(),
      },
    };

    const totalFee = identityResult.fee + reputationResult.fee + validationResult.fee;
    const totalGas = identityResult.gasUsed + reputationResult.gasUsed + validationResult.gasUsed;

    const deploymentInfo = {
      network,
      deployer: accountId.toString(),
      deployedAt: new Date().toISOString(),
      contracts: {
        identityRegistry: identityResult,
        reputationRegistry: reputationResult,
        validationRegistry: validationResult,
      },
      summary: {
        totalFee: {
          tinybar: totalFee,
          hbar: (totalFee / 100_000_000).toFixed(8),
        },
        totalGasUsed: totalGas,
      },
    };

    const deploymentPath = path.join(process.cwd(), `erc8004-deployment-${network}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log("\nDeployment complete.");
    console.log(`Details saved to ${deploymentPath}`);
    console.log("\nAdd these to your environment:");
    console.log(`ERC8004_IDENTITY_REGISTRY=${identityResult.contractId}`);
    console.log(`ERC8004_IDENTITY_REGISTRY_ADDRESS=${identityResult.evmAddress}`);
    console.log(`ERC8004_REPUTATION_REGISTRY=${reputationResult.contractId}`);
    console.log(`ERC8004_REPUTATION_REGISTRY_ADDRESS=${reputationResult.evmAddress}`);
    console.log(`ERC8004_VALIDATION_REGISTRY=${validationResult.contractId}`);
    console.log(`ERC8004_VALIDATION_REGISTRY_ADDRESS=${validationResult.evmAddress}`);
  } finally {
    client.close();
  }
}

deployContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
