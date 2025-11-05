import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaChainId,
  HederaSessionEvent
} from '@hashgraph/hedera-wallet-connect';
import { LedgerId } from '@hashgraph/sdk';
import { WalletConnectionResult } from '../types/auth';

/**
 * WalletConnector service using Hedera WalletConnect
 *
 * Official implementation following Hedera documentation:
 * @see https://docs.hedera.com/hedera/tutorials/more-tutorials/develop-a-hedera-dapp-integrated-with-walletconnect
 * @see https://github.com/hashgraph/hedera-wallet-connect
 */
export class WalletConnector {
  private dAppConnector: DAppConnector | null = null;
  private session: any = null;  // Session type from WalletConnect
  private projectId: string;
  private network: 'mainnet' | 'testnet';

  constructor() {
    this.projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
    this.network = (import.meta.env.VITE_HEDERA_NETWORK || 'testnet') as 'mainnet' | 'testnet';

    if (!this.projectId) {
      console.error('❌ VITE_WALLETCONNECT_PROJECT_ID is not set');
      console.error('Get your Project ID from: https://cloud.reown.com');
    }

    console.log(`🔧 WalletConnector initialized for ${this.network}`);
  }

  /**
   * Initialize DAppConnector
   */
  private async initDAppConnector(): Promise<void> {
    if (this.dAppConnector) {
      return; // Already initialized
    }

    const metadata = {
      name: 'Jimo market',
      description: 'AIエージェントで地域取引を自動化',
      url: window.location.origin,
      icons: [`${window.location.origin}/icon.png`]
    };

    const ledgerId = this.network === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;

    this.dAppConnector = new DAppConnector(
      metadata,
      ledgerId,
      this.projectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [HederaChainId.Testnet]
    );

    await this.dAppConnector.init({ logger: 'error' });

    // Setup event listeners
    this.setupEventListeners();

    console.log('✅ DAppConnector initialized');
  }

  /**
   * Setup event listeners for session changes
   * Note: Event listener API may vary by version
   */
  private setupEventListeners(): void {
    if (!this.dAppConnector) return;

    // TODO: Setup event listeners when API is stable
    // Current version may not support onSessionEvent
    console.log('✅ Event listeners would be set up here');
  }

  /**
   * Connect to wallet via WalletConnect
   * Opens modal for user to scan QR code or connect via extension
   */
  async connect(): Promise<WalletConnectionResult> {
    try {
      // Initialize if not already done
      await this.initDAppConnector();

      if (!this.dAppConnector) {
        throw new Error('Failed to initialize DAppConnector');
      }

      // Check for existing session
      const existingSessions = this.dAppConnector.walletConnectClient?.session.getAll();
      if (existingSessions && existingSessions.length > 0) {
        console.log('📱 Using existing WalletConnect session');
        this.session = existingSessions[0];
      } else {
        // Open modal for new connection
        console.log('📱 Opening WalletConnect modal...');
        await this.dAppConnector.openModal();

        // Wait for session to be established
        const sessions = this.dAppConnector.walletConnectClient?.session.getAll();
        if (!sessions || sessions.length === 0) {
          throw new Error('No session established');
        }

        this.session = sessions[0];
      }

      // Extract account ID from session
      const accountId = this.getAccountIdFromSession();

      console.log('✅ Connected to wallet:', accountId);

      return {
        accountId,
        topic: this.session.topic
      };
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      throw error;
    }
  }

  /**
   * Extract account ID from WalletConnect session
   */
  private getAccountIdFromSession(): string {
    if (!this.session) {
      throw new Error('No active session');
    }

    // Session namespaces contain the account information
    const hederaNamespace = this.session.namespaces.hedera;
    if (!hederaNamespace || !hederaNamespace.accounts || hederaNamespace.accounts.length === 0) {
      throw new Error('No Hedera account found in session');
    }

    // Account format: hedera:testnet:0.0.12345
    const accountString = hederaNamespace.accounts[0];
    const parts = accountString.split(':');

    if (parts.length < 3) {
      throw new Error(`Invalid account format: ${accountString}`);
    }

    // Return the account ID (e.g., "0.0.12345")
    return parts[2];
  }

  /**
   * Disconnect from wallet
   */
  /**
   * Sign message using connected wallet
   */
  async signMessage(message: string): Promise<string> {
    if (!this.dAppConnector || !this.session) {
      throw new Error('Wallet not connected');
    }

    try {
      const accountId = this.getAccountIdFromSession();

      // Sign message using hedera_signMessage
      const result = await this.dAppConnector.signMessage({
        signerAccountId: `hedera:${this.network}:${accountId}`,
        message: message
      });

      if (!result.signatureMap) {
        throw new Error('No signature returned');
      }

      // Convert base64 signature to hex
      const binaryString = atob(result.signatureMap);
      const hexSignature = Array.from(binaryString)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');

      return hexSignature;
    } catch (error) {
      console.error('❌ Message signing failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.dAppConnector && this.session) {
      try {
        await this.dAppConnector.disconnectAll();
        this.session = null;
        console.log('👋 Wallet disconnected');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
  }

  /**
   * Get current connected account
   */
  getConnectedAccount(): string | null {
    try {
      return this.session ? this.getAccountIdFromSession() : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.session !== null;
  }

  /**
   * Get DAppConnector instance (for advanced usage)
   */
  getDAppConnector(): DAppConnector | null {
    return this.dAppConnector;
  }
}

// Export singleton instance
export const walletConnector = new WalletConnector();
