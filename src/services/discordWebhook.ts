// Discord Webhook integration service for live trade ideas and alerts

export interface DiscordTradeIdeaPayload {
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  stopLoss: number;
  takeProfit: number;
  riskRatio?: string;
  timeframe?: string;
  sector?: string;
  notes?: string;
  shares?: number;
}

export interface DiscordLiveIdea {
  id: string;
  author: string;
  avatar: string;
  role: string;
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  stopLoss: number;
  takeProfit: number;
  riskRatio: string;
  timeframe: string;
  catalyst: string;
  status: 'ACTIVE' | 'TARGET_HIT' | 'RUNNER';
}

const STORAGE_KEY_DISCORD_WEBHOOK = 'apextrade_discord_webhook_url';

export const DiscordWebhookService = {
  getWebhookUrl(): string {
    return localStorage.getItem(STORAGE_KEY_DISCORD_WEBHOOK) || '';
  },

  setWebhookUrl(url: string): void {
    localStorage.setItem(STORAGE_KEY_DISCORD_WEBHOOK, url.trim());
  },

  async sendTradeIdeaToDiscord(
    idea: DiscordTradeIdeaPayload,
    customWebhookUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const webhookUrl = customWebhookUrl || this.getWebhookUrl();

    if (!webhookUrl) {
      return {
        success: false,
        message: 'No Discord Webhook URL configured. Please paste your Discord Webhook URL in the settings.'
      };
    }

    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') && !webhookUrl.startsWith('https://canary.discord.com/api/webhooks/')) {
      return {
        success: false,
        message: 'Invalid Discord Webhook URL. It must start with https://discord.com/api/webhooks/...'
      };
    }

    const isLong = idea.action === 'BUY';
    const colorHex = isLong ? 3066993 : 15158332; // Emerald Green or Crimson Red

    const payload = {
      username: 'ApexTrade Live Ideas Desk',
      avatar_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=128&auto=format&fit=crop&q=80',
      content: `⚡ **NEW LIVE TRADING IDEA: ${isLong ? '🟢 BUY / LONG' : '🔴 SELL / SHORT'} ${idea.symbol}**`,
      embeds: [
        {
          title: `${isLong ? '🚀 LONG SWING SETUP' : '🔻 SHORT SETUP'}: ${idea.symbol} @ $${idea.price.toLocaleString()}`,
          description: idea.notes || 'High-probability technical swing setup with strict 1:2 R:R bracket protection.',
          color: colorHex,
          fields: [
            {
              name: '🎯 Entry Price',
              value: `**$${idea.price.toLocaleString()}**`,
              inline: true
            },
            {
              name: '🛑 Mandatory Stop Loss',
              value: `**$${idea.stopLoss.toLocaleString()}**`,
              inline: true
            },
            {
              name: '🏆 Take Profit Target',
              value: `**$${idea.takeProfit.toLocaleString()}**`,
              inline: true
            },
            {
              name: '⚖️ Risk to Reward',
              value: idea.riskRatio || '1:2.0 R:R',
              inline: true
            },
            {
              name: '⏱️ Timeframe',
              value: idea.timeframe || 'Daily / 4H Swing',
              inline: true
            },
            {
              name: '🌐 Sector',
              value: idea.sector || 'SOX / Tech',
              inline: true
            }
          ],
          footer: {
            text: 'ApexTrade Institutional Desk • Enforced Capital Preservation Rules'
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok || response.status === 204) {
        return {
          success: true,
          message: `Trade idea for ${idea.symbol} successfully broadcasted to your Discord channel!`
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          message: `Discord rejected webhook (${response.status}): ${errorText || 'Check webhook permissions'}`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Network error connecting to Discord: ${err.message || 'CORS or offline error'}`
      };
    }
  },

  async sendTestPing(customWebhookUrl?: string): Promise<{ success: boolean; message: string }> {
    const webhookUrl = customWebhookUrl || this.getWebhookUrl();

    if (!webhookUrl) {
      return {
        success: false,
        message: 'Please paste your Discord Webhook URL before testing.'
      };
    }

    const payload = {
      username: 'ApexTrade Live Ideas Desk',
      avatar_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=128&auto=format&fit=crop&q=80',
      content: '✅ **ApexTrade Discord Live Feed Connected Successfully!**',
      embeds: [
        {
          title: 'Discord Live Trading Ideas Synchronized',
          description: 'Your ApexTrade terminal is now hooked up to Discord. Real-time trade signals, bracket orders, and swing setups will broadcast directly to this channel.',
          color: 5814783, // Blurple
          fields: [
            { name: 'Gateway Status', value: '🟢 Active & Streaming', inline: true },
            { name: 'Enforced Risk Rules', value: '1% Max Risk • Bracket SL/TP', inline: true },
            { name: 'Active Ticker Universe', value: 'MU, NVDA, AMD, TSM, WDC, BTC', inline: true }
          ],
          footer: { text: 'ApexTrade Pro • Discord Webhook Integration' },
          timestamp: new Date().toISOString()
        }
      ]
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok || response.status === 204) {
        return {
          success: true,
          message: 'Success! A test ping was sent to your Discord channel. Check your Discord to confirm.'
        };
      } else {
        const errText = await response.text();
        return {
          success: false,
          message: `Discord error (${response.status}): ${errText || 'Invalid webhook token or channel deleted'}`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Connection error: ${err.message || 'Please check your connection and webhook URL'}`
      };
    }
  }
};

export const INITIAL_DISCORD_LIVE_IDEAS: DiscordLiveIdea[] = [
  {
    id: 'disc-idea-1',
    author: 'Brigade Captain (Alex)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80',
    role: 'Lead Macro & Semis',
    timestamp: '14m ago',
    symbol: 'MU',
    action: 'BUY',
    price: 114.80,
    stopLoss: 111.00,
    takeProfit: 124.00,
    riskRatio: '1:2.4 R:R',
    timeframe: 'Daily Swing',
    catalyst: 'HBM3e supply contract extensions + 8-day EMA retest holding firm above $112 key pivot level.',
    status: 'ACTIVE'
  },
  {
    id: 'disc-idea-2',
    author: 'VolTrader (Marcus)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&auto=format&fit=crop&q=80',
    role: 'SOX Technicals',
    timestamp: '32m ago',
    symbol: 'NVDA',
    action: 'BUY',
    price: 222.27,
    stopLoss: 216.00,
    takeProfit: 235.00,
    riskRatio: '1:2.0 R:R',
    timeframe: '4-Hour Breakout',
    catalyst: 'Continuation out of 3-week ascending triangle with institutional tape printing over 54M volume.',
    status: 'ACTIVE'
  },
  {
    id: 'disc-idea-3',
    author: 'QuantumFlow',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&auto=format&fit=crop&q=80',
    role: 'Hardware & Storage',
    timestamp: '1h ago',
    symbol: 'AMD',
    action: 'BUY',
    price: 615.52,
    stopLoss: 590.00,
    takeProfit: 665.00,
    riskRatio: '1:1.9 R:R',
    timeframe: 'Daily Momentum',
    catalyst: 'Surpassed $1 Trillion market cap with massive +9.9% gap and go. Trailing stop recommended.',
    status: 'RUNNER'
  },
  {
    id: 'disc-idea-4',
    author: 'SMC Trader (Elena)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&auto=format&fit=crop&q=80',
    role: 'NAND & Flash',
    timestamp: '2h ago',
    symbol: 'WDC',
    action: 'BUY',
    price: 443.06,
    stopLoss: 428.00,
    takeProfit: 475.00,
    riskRatio: '1:2.1 R:R',
    timeframe: 'Swing Structure',
    catalyst: 'Enterprise SSD cycle pricing revision. Accumulation candles breaking out of multi-week base.',
    status: 'ACTIVE'
  },
  {
    id: 'disc-idea-5',
    author: 'CryptoDesk',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=96&auto=format&fit=crop&q=80',
    role: 'Digital Assets',
    timestamp: '3h ago',
    symbol: 'BTC-USD',
    action: 'BUY',
    price: 85000.00,
    stopLoss: 83500.00,
    takeProfit: 88500.00,
    riskRatio: '1:2.3 R:R',
    timeframe: '1-Hour Flag',
    catalyst: 'Consolidating tight flag above $84,800 VWAP. Liquidity sweep complete on weekend low.',
    status: 'ACTIVE'
  }
];
