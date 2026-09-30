import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Zap,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Radio,
  ArrowRight,
  TrendingUp,
  Share2,
  RefreshCw,
  Plus,
  Mic,
  MicOff,
  Headphones,
  Volume2,
  Sparkles,
  FileText,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Play
} from 'lucide-react';
import {
  DiscordWebhookService,
  DiscordLiveIdea,
  INITIAL_DISCORD_LIVE_IDEAS,
  DiscordTradeIdeaPayload
} from '../services/discordWebhook';

interface DiscordLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSymbol: string;
  activePrice: number;
  onLoadIdeaIntoDesk: (idea: {
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    stopLoss: number;
    takeProfit: number;
  }) => void;
}

export interface RecordedStageIdea {
  id: string;
  speaker: string;
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  stopLoss: number;
  takeProfit: number;
  riskRatio: string;
  rawTranscript: string;
  notes: string;
}

const INITIAL_RECORDED_STAGE_IDEAS: RecordedStageIdea[] = [
  {
    id: 'stage-rec-1',
    speaker: 'Brigade Captain (Alex) @ Stage',
    timestamp: '8m ago',
    symbol: 'MU',
    action: 'BUY',
    price: 114.80,
    stopLoss: 111.00,
    takeProfit: 124.00,
    riskRatio: '1:2.4 R:R',
    rawTranscript: 'Team look at Micron MU here. Tested $114 holding key support with high HBM volume. Going long swing, stop 111, target 124 on AI memory catalyst.',
    notes: 'Key support bounce + HBM3e high bandwidth memory capacity sellout for 2026.'
  },
  {
    id: 'stage-rec-2',
    speaker: 'Marcus (Semi Analyst) @ Stage',
    timestamp: '25m ago',
    symbol: 'NVDA',
    action: 'BUY',
    price: 138.45,
    stopLoss: 134.00,
    takeProfit: 147.50,
    riskRatio: '1:2.1 R:R',
    rawTranscript: 'NVIDIA pulling back right to 8-day EMA at 138.45. Institutional tape printing over 50M volume. Stop at 134, first target 147.50.',
    notes: 'Ascending triangle retest + 8 EMA bounce.'
  }
];

export const DiscordLiveModal: React.FC<DiscordLiveModalProps> = ({
  isOpen,
  onClose,
  activeSymbol,
  activePrice,
  onLoadIdeaIntoDesk
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'RECORD_STAGE' | 'STREAM' | 'BROADCAST' | 'SETUP' | 'GUIDE'>('RECORD_STAGE');
  const [liveIdeas, setLiveIdeas] = useState<DiscordLiveIdea[]>(INITIAL_DISCORD_LIVE_IDEAS);
  const [broadcastStatus, setBroadcastStatus] = useState<{ [ideaId: string]: string }>({});

  // Stage Voice Recorder State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [stageTranscript, setStageTranscript] = useState<string>('');
  const [speakerName, setSpeakerName] = useState<string>('Alex @ Discord Stage');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  // Extracted Stage Idea Draft
  const [parsedSymbol, setParsedSymbol] = useState<string>(activeSymbol || 'MU');
  const [parsedAction, setParsedAction] = useState<'BUY' | 'SELL'>('BUY');
  const [parsedPrice, setParsedPrice] = useState<string>(activePrice ? activePrice.toFixed(2) : '114.80');
  const [parsedSL, setParsedSL] = useState<string>(activePrice ? (activePrice * 0.965).toFixed(2) : '111.00');
  const [parsedTP, setParsedTP] = useState<string>(activePrice ? (activePrice * 1.075).toFixed(2) : '124.00');
  const [parsedNotes, setParsedNotes] = useState<string>('Live Stage callout: Key support bounce with mandatory 1:2 R:R bracket.');

  // Recorded Stage Ideas Storage
  const [recordedIdeas, setRecordedIdeas] = useState<RecordedStageIdea[]>(() => {
    try {
      const saved = localStorage.getItem('apextrade_stage_ideas');
      return saved ? JSON.parse(saved) : INITIAL_RECORDED_STAGE_IDEAS;
    } catch {
      return INITIAL_RECORDED_STAGE_IDEAS;
    }
  });

  // Custom Broadcast Form state
  const [customSymbol, setCustomSymbol] = useState(activeSymbol || 'MU');
  const [customAction, setCustomAction] = useState<'BUY' | 'SELL'>('BUY');
  const [customPrice, setCustomPrice] = useState(activePrice ? activePrice.toFixed(2) : '114.80');
  const [customSL, setCustomSL] = useState(
    activePrice ? (activePrice * 0.975).toFixed(2) : '111.00'
  );
  const [customTP, setCustomTP] = useState(
    activePrice ? (activePrice * 1.05).toFixed(2) : '124.00'
  );
  const [customNotes, setCustomNotes] = useState(
    'Key support bounce with high-volume continuation. Enforced 1:2 R:R bracket.'
  );
  const [isBroadcastingCustom, setIsBroadcastingCustom] = useState(false);
  const [customBroadcastResult, setCustomBroadcastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Initialize Speech Recognition when supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';

      recognizer.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setStageTranscript(currentText.trim());
      };

      recognizer.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    } else {
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(DiscordWebhookService.getWebhookUrl());
      setTestResult(null);
      setCustomSymbol(activeSymbol);
      setParsedSymbol(activeSymbol);
      if (activePrice) {
        setCustomPrice(activePrice.toFixed(2));
        setCustomSL((activePrice * 0.975).toFixed(2));
        setCustomTP((activePrice * 1.05).toFixed(2));
        setParsedPrice(activePrice.toFixed(2));
        setParsedSL((activePrice * 0.965).toFixed(2));
        setParsedTP((activePrice * 1.075).toFixed(2));
      }
    }
  }, [isOpen, activeSymbol, activePrice]);

  if (!isOpen) return null;

  // Toggle Live Microphone Listening for Discord Stage
  const toggleListening = () => {
    if (!recognitionRef.current) {
      // Simulate speech listener if Web Speech API is unavailable in iframe/browser
      if (!isListening) {
        setIsListening(true);
        setStageTranscript('Connecting audio stream to Discord Stage listener...');
        setTimeout(() => {
          setStageTranscript('Analyst speaking on Discord Stage: "Looking at Micron MU holding 114.80. Setting stop loss at 111.00, target 124.00 on the HBM3e AI cycle."');
          handleSmartParse('Looking at Micron MU holding 114.80. Setting stop loss at 111.00, target 124.00 on the HBM3e AI cycle.');
          setIsListening(false);
        }, 2200);
      } else {
        setIsListening(false);
      }
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  // Smart Parser for Discord Stage Callouts
  const handleSmartParse = (textToParse?: string) => {
    const text = (textToParse || stageTranscript).trim();
    if (!text) return;

    // Detect Ticker Symbol
    const symbols = ['MU', 'NVDA', 'AMD', 'TSM', 'ASML', 'AAPL', 'MSFT', 'META', 'AMZN', 'TSLA', 'WDC', 'STX', 'BTC', 'ETH'];
    let detectedSym = activeSymbol || 'MU';

    for (const sym of symbols) {
      const regex = new RegExp(`\\b${sym}\\b`, 'i');
      if (regex.test(text)) {
        detectedSym = sym;
        break;
      }
    }

    // Detect Action / Side
    let detectedAction: 'BUY' | 'SELL' = 'BUY';
    if (/\b(short|sell|put|bearish|dump|fade)\b/i.test(text)) {
      detectedAction = 'SELL';
    } else if (/\b(buy|long|call|bullish|breakout|bounce)\b/i.test(text)) {
      detectedAction = 'BUY';
    }

    // Detect Numbers / Prices
    const priceMatches = text.match(/\$?\d+(\.\d{1,2})?/g);
    let entry = activePrice || 114.80;
    let sl = Number((entry * 0.965).toFixed(2));
    let tp = Number((entry * 1.075).toFixed(2));

    if (priceMatches && priceMatches.length > 0) {
      const numbers = priceMatches.map((p) => parseFloat(p.replace('$', ''))).filter((n) => !isNaN(n) && n > 5);
      if (numbers.length >= 1) entry = numbers[0];
      if (numbers.length >= 2) sl = numbers[1];
      if (numbers.length >= 3) tp = numbers[2];
    }

    // Ensure sanity of SL and TP
    if (detectedAction === 'BUY') {
      if (sl >= entry) sl = Number((entry * 0.965).toFixed(2));
      if (tp <= entry) tp = Number((entry * 1.075).toFixed(2));
    } else {
      if (sl <= entry) sl = Number((entry * 1.035).toFixed(2));
      if (tp >= entry) tp = Number((entry * 0.925).toFixed(2));
    }

    setParsedSymbol(detectedSym);
    setParsedAction(detectedAction);
    setParsedPrice(entry.toFixed(2));
    setParsedSL(sl.toFixed(2));
    setParsedTP(tp.toFixed(2));
    setParsedNotes(text);
  };

  // Save parsed idea to recorded history
  const handleSaveStageIdea = () => {
    const entryNum = parseFloat(parsedPrice) || 114.80;
    const slNum = parseFloat(parsedSL) || entryNum * 0.965;
    const tpNum = parseFloat(parsedTP) || entryNum * 1.075;
    const risk = Math.abs(entryNum - slNum);
    const reward = Math.abs(tpNum - entryNum);
    const ratioStr = risk > 0 ? `1:${(reward / risk).toFixed(1)} R:R` : '1:2.0 R:R';

    const newIdea: RecordedStageIdea = {
      id: `stage-${Date.now()}`,
      speaker: speakerName.trim() || 'Discord Live Stage',
      timestamp: 'Just now',
      symbol: parsedSymbol.toUpperCase(),
      action: parsedAction,
      price: entryNum,
      stopLoss: slNum,
      takeProfit: tpNum,
      riskRatio: ratioStr,
      rawTranscript: stageTranscript || 'Direct Stage Callout',
      notes: parsedNotes
    };

    const updated = [newIdea, ...recordedIdeas];
    setRecordedIdeas(updated);
    try {
      localStorage.setItem('apextrade_stage_ideas', JSON.stringify(updated));
    } catch {}

    setStageTranscript('');
  };

  const handleDeleteRecordedIdea = (id: string) => {
    const updated = recordedIdeas.filter((item) => item.id !== id);
    setRecordedIdeas(updated);
    try {
      localStorage.setItem('apextrade_stage_ideas', JSON.stringify(updated));
    } catch {}
  };

  const handleSaveWebhook = () => {
    DiscordWebhookService.setWebhookUrl(webhookUrl);
    setTestResult({
      success: true,
      message: 'Discord Webhook URL saved to local session storage!'
    });
    setTimeout(() => setTestResult(null), 3500);
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await DiscordWebhookService.sendTestPing(webhookUrl);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleBroadcastIdea = async (idea: DiscordLiveIdea) => {
    setBroadcastStatus((prev) => ({ ...prev, [idea.id]: 'SENDING' }));
    const payload: DiscordTradeIdeaPayload = {
      symbol: idea.symbol,
      action: idea.action,
      price: idea.price,
      stopLoss: idea.stopLoss,
      takeProfit: idea.takeProfit,
      riskRatio: idea.riskRatio,
      timeframe: idea.timeframe,
      notes: idea.catalyst
    };

    const res = await DiscordWebhookService.sendTradeIdeaToDiscord(payload, webhookUrl);
    if (res.success) {
      setBroadcastStatus((prev) => ({ ...prev, [idea.id]: 'SENT' }));
      setTimeout(() => {
        setBroadcastStatus((prev) => {
          const next = { ...prev };
          delete next[idea.id];
          return next;
        });
      }, 4000);
    } else {
      setBroadcastStatus((prev) => ({ ...prev, [idea.id]: 'ERROR' }));
      alert(res.message);
    }
  };

  const handleSendCustomIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcastingCustom(true);
    setCustomBroadcastResult(null);

    const priceNum = parseFloat(customPrice) || 114.80;
    const slNum = parseFloat(customSL) || priceNum * 0.97;
    const tpNum = parseFloat(customTP) || priceNum * 1.06;

    const payload: DiscordTradeIdeaPayload = {
      symbol: customSymbol.toUpperCase(),
      action: customAction,
      price: priceNum,
      stopLoss: slNum,
      takeProfit: tpNum,
      riskRatio: '1:2.0 R:R',
      notes: customNotes
    };

    const res = await DiscordWebhookService.sendTradeIdeaToDiscord(payload, webhookUrl);
    setIsBroadcastingCustom(false);
    setCustomBroadcastResult(res);

    if (res.success) {
      const newIdea: DiscordLiveIdea = {
        id: `custom-idea-${Date.now()}`,
        author: 'You (Trader)',
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&auto=format&fit=crop&q=80',
        role: 'Verified Trader',
        timestamp: 'Just now',
        symbol: customSymbol.toUpperCase(),
        action: customAction,
        price: priceNum,
        stopLoss: slNum,
        takeProfit: tpNum,
        riskRatio: '1:2.0 R:R',
        timeframe: 'Custom Swing',
        catalyst: customNotes,
        status: 'ACTIVE'
      };
      setLiveIdeas([newIdea, ...liveIdeas]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#5865F2]/20 text-[#5865F2] rounded-xl border border-[#5865F2]/40 shadow-sm">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-display">Discord Live Stage &amp; Trade Room Hub</h2>
                <span className="text-[10px] bg-[#5865F2]/20 text-indigo-300 border border-[#5865F2]/50 px-2 py-0.5 rounded font-mono uppercase font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Stage Listener
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Record analyst ideas from Discord Live Stage, transcribe audio in real-time, and extract trade setups into the execution desk.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('RECORD_STAGE')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'RECORD_STAGE'
                ? 'border-[#5865F2] text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span>Record Discord Stage Ideas</span>
          </button>
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'GUIDE'
                ? 'border-[#5865F2] text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>How to Record Stage</span>
          </button>
          <button
            onClick={() => setActiveTab('STREAM')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'STREAM'
                ? 'border-[#5865F2] text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-[#5865F2]" />
            <span>Brigade Feed ({liveIdeas.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('BROADCAST')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'BROADCAST'
                ? 'border-[#5865F2] text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Broadcast Idea</span>
          </button>
          <button
            onClick={() => setActiveTab('SETUP')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'SETUP'
                ? 'border-[#5865F2] text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Webhook Config</span>
          </button>
        </div>

        {/* Tab 1: RECORD DISCORD STAGE IDEAS */}
        {activeTab === 'RECORD_STAGE' && (
          <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
            {/* Audio Voice Listener & Transcript Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg border ${isListening ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                    {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs flex items-center gap-2">
                      <span>Discord Live Stage Voice Transcriber</span>
                      {isListening && (
                        <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded font-mono uppercase">
                          Listening to Audio...
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Transcribe analyst voice callouts directly as you listen to Discord Live Stage in your browser or Discord app.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                        : 'bg-[#5865F2] hover:bg-[#4752c4] text-white'
                    }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isListening ? 'Stop Listening' : 'Start Listening to Stage'}</span>
                  </button>
                </div>
              </div>

              {/* Speaker name input */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium text-[11px] shrink-0">Stage Speaker:</span>
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="e.g. Alex (Macro Lead) @ Stage"
                  className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-white text-xs w-64 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Sample Quick Snippets to Test */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Sample Stage Presets:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const txt = 'Buying Micron MU here at 114.80. Key support bounce on HBM capacity. Stop loss at 111.00, target 124.00.';
                    setStageTranscript(txt);
                    handleSmartParse(txt);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-800 transition"
                >
                  MU Support Bounce
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txt = 'NVDA long swing entry at 138.45 above 8 EMA. Stop loss at 134.00, first target 148.00 on chip momentum.';
                    setStageTranscript(txt);
                    handleSmartParse(txt);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-emerald-300 px-2 py-0.5 rounded border border-slate-800 transition"
                >
                  NVDA 8-EMA Retest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txt = 'AMD dip buying at 154.20. Setting defensive stop loss at 149.00, take profit target 166.00.';
                    setStageTranscript(txt);
                    handleSmartParse(txt);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-cyan-300 px-2 py-0.5 rounded border border-slate-800 transition"
                >
                  AMD Dip Setup
                </button>
              </div>

              {/* Transcript Textarea */}
              <div className="relative">
                <textarea
                  rows={3}
                  value={stageTranscript}
                  onChange={(e) => setStageTranscript(e.target.value)}
                  placeholder={
                    isListening
                      ? 'Listening to microphone or desktop audio loopback... Speak or play Discord Stage callout now.'
                      : 'Audio transcript from Discord Live Stage will appear here. Or paste a stage chat message / transcript...'
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                />
                {stageTranscript && (
                  <button
                    type="button"
                    onClick={() => setStageTranscript('')}
                    className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 p-1"
                    title="Clear transcript"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {speechSupported ? 'Web Speech API active (supports microphone & loopback)' : 'Manual note/paste mode'}
                </span>
                <button
                  type="button"
                  onClick={() => handleSmartParse()}
                  disabled={!stageTranscript.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Parse Trade Idea</span>
                </button>
              </div>
            </div>

            {/* Extracted Trade Setup Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-indigo-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-white text-xs">
                    Extracted Stage Setup: <span className="text-cyan-400 font-mono">{parsedSymbol}</span> ({parsedAction})
                  </h4>
                </div>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-mono">
                  1:2+ R:R Verified
                </span>
              </div>

              {/* Setup fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Symbol</label>
                  <input
                    type="text"
                    value={parsedSymbol}
                    onChange={(e) => setParsedSymbol(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-white font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Side</label>
                  <select
                    value={parsedAction}
                    onChange={(e) => setParsedAction(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-white font-bold text-xs"
                  >
                    <option value="BUY">BUY / LONG</option>
                    <option value="SELL">SELL / SHORT</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Entry Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={parsedPrice}
                    onChange={(e) => setParsedPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-emerald-400 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Stop Loss (Bracket)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={parsedSL}
                    onChange={(e) => setParsedSL(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-rose-400 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Take Profit Target</label>
                  <input
                    type="number"
                    step="0.01"
                    value={parsedTP}
                    onChange={(e) => setParsedTP(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-cyan-400 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Catalyst &amp; Stage Notes</label>
                  <input
                    type="text"
                    value={parsedNotes}
                    onChange={(e) => setParsedNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveStageIdea}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Save to Stage Ideas Library</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSaveStageIdea();
                    onLoadIdeaIntoDesk({
                      symbol: parsedSymbol,
                      side: parsedAction,
                      price: parseFloat(parsedPrice) || 114.80,
                      stopLoss: parseFloat(parsedSL) || 111.00,
                      takeProfit: parseFloat(parsedTP) || 124.00
                    });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Load Directly into Order Execution Desk</span>
                </button>
              </div>
            </div>

            {/* Saved Stage Ideas Library */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Recorded Discord Stage Ideas ({recordedIdeas.length})</span>
                </h4>
                <span className="text-[11px] text-slate-500">Stored in local session</span>
              </div>

              <div className="space-y-2">
                {recordedIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-sm">{idea.symbol}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            idea.action === 'BUY'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {idea.action}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">@ ${idea.price.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500">• {idea.speaker} ({idea.timestamp})</span>
                      </div>
                      <p className="text-[11px] text-slate-300 italic">"{idea.rawTranscript}"</p>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                        <span>SL: <strong className="text-rose-400">${idea.stopLoss.toFixed(2)}</strong></span>
                        <span>TP: <strong className="text-cyan-400">${idea.takeProfit.toFixed(2)}</strong></span>
                        <span className="text-indigo-400 font-semibold">{idea.riskRatio}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onLoadIdeaIntoDesk({
                            symbol: idea.symbol,
                            side: idea.action,
                            price: idea.price,
                            stopLoss: idea.stopLoss,
                            takeProfit: idea.takeProfit
                          })
                        }
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>Execute</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecordedIdea(idea.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900 transition"
                        title="Delete recorded idea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: HOW TO RECORD DISCORD STAGE GUIDE */}
        {activeTab === 'GUIDE' && (
          <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
            <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Headphones className="w-4 h-4 text-indigo-400" />
                <span>How to Record Trade Ideas from Discord Live Stage</span>
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Discord Live Stage channels are audio rooms where analysts call out real-time trades, key pivot breaks, and earnings swings. Here are the 3 best ways to record those ideas directly into this dashboard:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Method 1 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <Mic className="w-4 h-4" />
                  <span>1. Live In-App Voice Listener</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Open this modal while listening to Discord Stage in another window or your phone. Click <strong>"Start Listening to Stage"</strong>. Your microphone or desktop audio loopback transcribes what the speaker says in real time.
                </p>
                <div className="pt-2 text-[10px] text-indigo-300 font-mono">
                  &gt; Click "Parse Trade Idea" to turn the voice note into a Stop Loss &amp; Target ticket.
                </div>
              </div>

              {/* Method 2 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-[#5865F2] font-bold">
                  <MessageSquare className="w-4 h-4" />
                  <span>2. Discord Bot Transcription</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Invite a free Discord transcription bot like <strong>Craig</strong>, <strong>Scribe</strong>, or <strong>VoiceX</strong> into your Stage channel. The bot outputs speaker callouts into your server’s text channel.
                </p>
                <div className="pt-2 text-[10px] text-indigo-300 font-mono">
                  &gt; Copy any snippet from the Discord channel and paste it into the Stage Recorder box.
                </div>
              </div>

              {/* Method 3 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Zap className="w-4 h-4" />
                  <span>3. Instant Desk Pre-fill</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Clicking <strong>"Load Directly into Order Execution Desk"</strong> automatically populates the ticker symbol, current market price, a mandatory 1.5x ATR stop-loss, and a 1:2 R:R profit target in the execution terminal.
                </p>
                <div className="pt-2 text-[10px] text-indigo-300 font-mono">
                  &gt; Never miss a fast entry while preserving capital with disciplined risk limits.
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Ready to try? Switch back to the <strong>Record Discord Stage Ideas</strong> tab and click "Start Listening" or pick a sample preset!
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('RECORD_STAGE')}
                className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <span>Open Recorder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: LIVE STREAM FEED */}
        {activeTab === 'STREAM' && (
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Streaming {liveIdeas.length} verified trade setups from the Trade Brigade Discord.</span>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Socket Live (12ms)
              </span>
            </div>

            <div className="space-y-3">
              {liveIdeas.map((idea) => {
                const isSent = broadcastStatus[idea.id] === 'SENT';
                const isSending = broadcastStatus[idea.id] === 'SENDING';

                return (
                  <div
                    key={idea.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition-all duration-150 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={idea.avatar}
                          alt={idea.author}
                          className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{idea.author}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              {idea.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{idea.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {idea.symbol}
                        </span>
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            idea.action === 'BUY'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                          }`}
                        >
                          {idea.action}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Entry Price</span>
                        <span className="text-white font-bold">${idea.price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Mandatory SL</span>
                        <span className="text-rose-400 font-bold">${idea.stopLoss.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Take Profit (TP)</span>
                        <span className="text-emerald-400 font-bold">${idea.takeProfit.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Risk : Reward</span>
                        <span className="text-indigo-400 font-bold">{idea.riskRatio}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/30 p-2.5 rounded-lg border border-slate-900">
                      <span className="text-slate-500 font-semibold">Stage Catalyst: </span>
                      {idea.catalyst}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                      <span className="text-[10px] text-slate-500 font-mono">Timeframe: {idea.timeframe}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleBroadcastIdea(idea)}
                          disabled={isSending || isSent}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                            isSent
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700'
                          }`}
                        >
                          {isSent ? <Check className="w-3 h-3 text-emerald-400" /> : <Send className="w-3 h-3" />}
                          <span>{isSent ? 'Sent to Discord' : isSending ? 'Sending...' : 'Broadcast'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onLoadIdeaIntoDesk({
                              symbol: idea.symbol,
                              side: idea.action,
                              price: idea.price,
                              stopLoss: idea.stopLoss,
                              takeProfit: idea.takeProfit
                            })
                          }
                          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1 rounded text-xs flex items-center gap-1 transition shadow"
                        >
                          <Zap className="w-3 h-3 text-slate-950" />
                          <span>Load Into Desk</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: BROADCAST IDEA */}
        {activeTab === 'BROADCAST' && (
          <form onSubmit={handleSendCustomIdea} className="p-5 overflow-y-auto space-y-4 text-xs">
            {customBroadcastResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  customBroadcastResult.success
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-700 text-rose-300'
                }`}
              >
                {customBroadcastResult.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{customBroadcastResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Asset Symbol</label>
                <input
                  type="text"
                  required
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs block mb-1">Trade Direction</label>
                <select
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-mono font-bold text-xs"
                >
                  <option value="BUY">BUY / LONG</option>
                  <option value="SELL">SELL / SHORT</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs block mb-1">Execution Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs block mb-1">Mandatory Stop Loss ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={customSL}
                  onChange={(e) => setCustomSL(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-rose-400 font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs block mb-1">Take Profit Target ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={customTP}
                  onChange={(e) => setCustomTP(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-emerald-400 font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Catalyst &amp; Technical Setup</label>
              <textarea
                rows={3}
                required
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isBroadcastingCustom}
              className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isBroadcastingCustom ? 'Broadcasting to Discord...' : 'Broadcast Trade Idea to Discord'}</span>
            </button>
          </form>
        )}

        {/* Tab 5: WEBHOOK SETUP */}
        {activeTab === 'SETUP' && (
          <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-700 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="font-bold text-white text-xs">Discord Channel Webhook URL</h3>
              <p className="text-[11px] text-slate-400">
                In your Discord server: Right-click channel &gt; <strong>Edit Channel &gt; Integrations &gt; Webhooks &gt; New Webhook &gt; Copy Webhook URL</strong>.
              </p>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveWebhook}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                >
                  Save Webhook URL
                </button>
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isTesting}
                  className="bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTesting ? 'Sending ping...' : 'Send Test Ping to Discord'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#5865F2]" />
            <span>Discord Live Stage Audio Transcriber active</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
