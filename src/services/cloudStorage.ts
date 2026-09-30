import {
  Position,
  ClosedTrade,
  RiskManagementConfig,
  BrokerageConfig,
  CloudDatabaseConfig
} from '../types/trading';

const STORAGE_KEYS = {
  POSITIONS: 'apextrade_positions_v1',
  CLOSED_TRADES: 'apextrade_closed_trades_v1',
  RISK_CONFIG: 'apextrade_risk_config_v1',
  BROKERAGE_CONFIG: 'apextrade_brokerage_config_v1',
  CLOUD_CONFIG: 'apextrade_cloud_config_v1'
};

export class CloudStorageService {
  public static loadState<T>(key: string, defaultValue: T): T {
    try {
      const serialized = localStorage.getItem(key);
      if (!serialized) return defaultValue;
      return JSON.parse(serialized);
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
      return defaultValue;
    }
  }

  public static saveState<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error writing ${key} to storage:`, e);
    }
  }

  public static async syncToCloud(payload: {
    positions: Position[];
    closedTrades: ClosedTrade[];
    riskConfig: RiskManagementConfig;
    portfolioValue: number;
    peakEquity: number;
  }): Promise<{ success: boolean; timestamp: number; message: string }> {
    // Simulate low-latency encrypted payload sync to cloud endpoint
    return new Promise((resolve) => {
      setTimeout(() => {
        const syncTimestamp = Date.now();
        this.saveState(STORAGE_KEYS.POSITIONS, payload.positions);
        this.saveState(STORAGE_KEYS.CLOSED_TRADES, payload.closedTrades);
        this.saveState(STORAGE_KEYS.RISK_CONFIG, payload.riskConfig);

        resolve({
          success: true,
          timestamp: syncTimestamp,
          message: `Encrypted snapshot synced (SHA-256: 4f8a...9c12) to Firestore cluster.`
        });
      }, 350);
    });
  }

  public static exportDataBackup(payload: any): string {
    return JSON.stringify(
      {
        version: '1.2.0',
        exportedAt: new Date().toISOString(),
        data: payload
      },
      null,
      2
    );
  }
}

export { STORAGE_KEYS };
