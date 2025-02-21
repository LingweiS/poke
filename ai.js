// ai.js - 增强型AI决策系统
window.monitorAIPerformance = () => {
  const start = performance.now();
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`AI 决策耗时: ${duration.toFixed(2)}ms`);
      if (duration > 100) {
        console.warn('AI 决策时间过长');
      }
    }
  };
};
class AIDecisionSystem {
  #interpretModelOutput;
  #model;
  #decisionCache;
  #history;
  #createInputTensor; // 添加私有字段声明
  constructor(gameCore) {
    this.game = gameCore;
    // 初始化私有字段
    this.#interpretModelOutput = (prediction) => {
      // 实现具体的模型解析逻辑
      return {
        action: 'raise',
        amount: prediction[0] * 100
      };
    };
    this.#model = null;
    this.#decisionCache = new Map();
    this.#history = [];
  }
  // ===== 核心决策方法 =====
async #machineLearningPredict(aiPlayer, signal) {
  if (!this.#model) return null;

  try {
    const inputTensor = this.#createInputTensor(aiPlayer);
    const prediction = await this.#model.executeAsync(inputTensor, { signal });
    return this.#interpretModelOutput(prediction);
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('AI 决策失败:', error);
      throw new Error('AI 决策超时，请稍后重试');
    }
    return null;
  }
}

  async #decisionWithTimeout(aiPlayer) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AIDecisionSystem.#PREDICTION_TIMEOUT);

    try {
      const [mlPrediction, ruleBased] = await Promise.all([
        this.#machineLearningPredict(aiPlayer, controller.signal),
        this.#ruleBasedPredict(aiPlayer)
      ]);
      
      return this.#fusionStrategies(mlPrediction, ruleBased, aiPlayer);
    } finally {
      clearTimeout(timeout);
    }
  }

  // ===== 混合决策策略 =====
  async #machineLearningPredict(aiPlayer, signal) {
    if (!this.#model) return null;
    
    const inputTensor = this.#createInputTensor(aiPlayer);
    try {
      const prediction = await this.#model.executeAsync(inputTensor, { signal });
      return this.#interpretModelOutput(prediction);
    } catch (error) {
      if (error.name !== 'AbortError') console.error('ML预测失败:', error);
      return null;
    }
  }

  #ruleBasedPredict(aiPlayer) {
    const strategyMap = {
      conservative: this.conservativeAI,
      aggressive: this.aggressiveAI,
      deceptive: this.deceptiveAI,
      mathematician: this.mathematicianAI
    };
    
    return strategyMap[aiPlayer.personality].call(this, aiPlayer);
  }

  #fusionStrategies(mlResult, ruleResult, aiPlayer) {
    const trustLevel = this.#calculateMLTrustLevel();
    return trustLevel > 0.7 && mlResult 
      ? mlResult
      : this.#applyDynamicAdjustment(aiPlayer, ruleResult);
  }

  // ===== 各策略实现 =====
  conservativeAI(aiPlayer) {
    const handStrength = this.#calculateHandStrength(aiPlayer);
    const phaseFactor = this.#getPhaseMultiplier();

    if (handStrength < 0.3 * phaseFactor) {
      return { action: 'fold', confidence: 1 - handStrength };
    }

    const baseAction = handStrength < 0.6 * phaseFactor ? 'call' : 'raise';
    return {
      action: baseAction,
      amount: this.#calculateRaiseAmount(aiPlayer, handStrength * 0.3)
    };
  }

  aggressiveAI(aiPlayer) {
    const riskFactor = Math.min(this.game.playerData.streak * 0.1, 0.5);
    const raiseAmount = this.#calculateRaiseAmount(
      aiPlayer, 
      0.4 + riskFactor + Math.random() * 0.2
    );
    
    return Math.random() < 0.75 
      ? { action: 'raise', amount: raiseAmount }
      : { action: 'call' };
  }

  deceptiveAI(aiPlayer) {
    const realStrength = this.#calculateHandStrength(aiPlayer);
    const bluffChance = realStrength < 0.4 ? 0.5 : 0.2;
    
    if (Math.random() < bluffChance) {
      return {
        action: 'raise',
        amount: this.#calculateRaiseAmount(aiPlayer, 0.4),
        isBluff: true
      };
    }
    
    return this.conservativeAI(aiPlayer);
  }

  mathematicianAI(aiPlayer) {
    const potOdds = this.#calculatePotOdds();
    const winProb = this.#calculateWinProbability(aiPlayer);
    const expectedValue = winProb - potOdds;

    if (expectedValue > 0.15) {
      return {
        action: 'raise',
        amount: this.#calculateRaiseAmount(aiPlayer, expectedValue * 2)
      };
    }

    return expectedValue > 0 
      ? { action: 'call' }
      : { action: 'fold' };
  }

  // ===== 核心计算逻辑 =====
#calculateHandStrength(aiPlayer) {
  const cacheKey = this.#generateHandHash(aiPlayer);

  if (this.#decisionCache.has(cacheKey)) {
    return this.#decisionCache.get(cacheKey);
  }

  // 如果缓存过大，清空缓存
  if (this.#decisionCache.size > 1000) {
    this.#decisionCache.clear();
  }

  const cards = [...aiPlayer.cards, ...this.game.communityCards];
  const evaluation = this.evaluatePokerHand(cards);
  const strength = evaluation.score + Math.random() * 0.05;

  this.#decisionCache.set(cacheKey, strength);
  return strength;
}

  evaluatePokerHand(cards) {
    const evaluator = new PokerEvaluator(cards);
    return evaluator.result;
  }

  // ===== 机器学习集成 =====
 async #initModel() {
  if (typeof tf !== 'object') {
    console.warn('TensorFlow.js 未加载，AI 使用规则引擎');
    return;
  }

  try {
    this.#model = await tf.loadGraphModel('/models/poker-ai/model.json');
    console.log('AI 模型加载成功');
  } catch (error) {
    console.warn('AI 模型加载失败:', error);
    this.#model = null; // 禁用机器学习，使用规则引擎
  }
}

  #createInputTensor(aiPlayer) {
    const inputFeatures = [
      this.#normalize(aiPlayer.chips),
      this.#normalize(this.game.pot),
      ...this.#encodeCards(aiPlayer.cards),
      ...this.#encodeCards(this.game.communityCards),
      this.#getPersonalityCode(aiPlayer.personality)
    ];
    
    return tf.tensor2d([inputFeatures]);
  }

  // ===== 工具方法 =====
  #calculateRaiseAmount(player, factor) {
    const maxBet = Math.min(
      player.chips * 0.6,
      this.game.pot * factor * (1 + Math.random() * 0.2)
    );
    return Math.round(Math.max(50, maxBet));
  }

  #applyDynamicAdjustment(aiPlayer, baseAction) {
    const history = this.#history.filter(h => 
      h.timestamp > Date.now() - 30000
    );
    
    const humanAggression = history.filter(h => 
      !h.player.isAI && h.action === 'raise'
    ).length / history.length || 0;

    if (humanAggression > 0.3 && aiPlayer.personality === 'aggressive') {
      baseAction.amount *= 1.3;
    }

    return baseAction;
  }

  #generateHandHash(aiPlayer) {
    return [...aiPlayer.cards, ...this.game.communityCards]
      .map(c => c.suit + c.rank)
      .sort()
      .join('-');
  }

  #normalize(value, max = 10000) {
    return Math.min(value / max, 1);
  }

  #encodeCards(cards) {
    const encoding = new Array(52).fill(0);
    cards.forEach(card => {
      const index = PokerEvaluator.cardToIndex(card);
      if (index !== -1) encoding[index] = 1;
    });
    return encoding;
  }

  #getPersonalityCode(personality) {
    const codes = { conservative: 0, aggressive: 1, deceptive: 2, mathematician: 3 };
    return codes[personality] / 3;
  }
}

// ===== 扑克牌评估器 =====
class PokerEvaluator {
  static #RANK_ORDER = '23456789TJQKA';
  static #SUIT_ORDER = ['♠', '♥', '♦', '♣'];

  constructor(cards) {
    this.cards = cards;
    this.result = this.#evaluate();
  }

  static cardToIndex(card) {
    const rankIndex = this.#RANK_ORDER.indexOf(card.rank);
    const suitIndex = this.#SUIT_ORDER.indexOf(card.suit);
    return rankIndex !== -1 && suitIndex !== -1 
      ? suitIndex * 13 + rankIndex 
      : -1;
  }

  #evaluate() {
    return {
      ...this.#checkStraightFlush(),
      ...this.#checkFourOfAKind(),
      ...this.#checkFullHouse(),
      ...this.#checkFlush(),
      ...this.#checkStraight(),
      ...this.#checkThreeOfAKind(),
      ...this.#checkTwoPairs(),
      ...this.#checkOnePair(),
      ...this.#checkHighCard()
    };
  }

  // ...具体评估方法实现（保持原有逻辑）...
}
window.AIDecisionSystem = AIDecisionSystem;

// ===== 浏览器兼容性检查 =====
(function() {
  const requiredAPIs = [
    'Promise',
    'Map',
    'AbortController',
    'requestAnimationFrame'
  ];
  
  const missingFeatures = requiredAPIs.filter(api => !window[api]);
  
  if (missingFeatures.length > 0) {
    document.body.innerHTML = `
      <div class="compatibility-error">
        <h2>浏览器不兼容</h2>
        <p>缺失必要特性：${missingFeatures.join(', ')}</p>
        <p>请使用 Chrome 79+/Firefox 67+/Edge 18+</p>
      </div>
    `;
    throw new Error('Browser compatibility check failed');
  }

  // TensorFlow.js 延迟加载
  if (!window.tf) {
    const tfScript = document.createElement('script');
    tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js';
    tfScript.onload = () => console.log('TensorFlow.js loaded');
    document.head.appendChild(tfScript);
  }
})();

// ===== 性能监控系统 =====
class AIPerformanceMonitor {
  static #METRICS_INTERVAL = 30000;
  
  constructor() {
    this.metrics = {
      decisionTime: [],
      cacheHitRate: [],
      modelUsage: 0
    };
    this.#startMonitoring();
  }

  #startMonitoring() {
    setInterval(() => {
      this.#reportMetrics();
      this.#adjustPerformance();
    }, AIPerformanceMonitor.#METRICS_INTERVAL);
  }

  #reportMetrics() {
    const avgDecisionTime = this.metrics.decisionTime.reduce((a,b) => a+b, 0) 
      / (this.metrics.decisionTime.length || 1);
    
    performance.mark('aiMetrics');
    console.table({
      '平均决策时间': `${avgDecisionTime.toFixed(2)}ms`,
      '缓存命中率': `${this.#calculateCacheHitRate()}%`,
      '模型使用率': `${this.metrics.modelUsage}%`
    });
  }

  #calculateCacheHitRate() {
    const total = this.metrics.cacheHitRate.length;
    const hits = this.metrics.cacheHitRate.filter(Boolean).length;
    return ((hits / total) * 100 || 0).toFixed(1);
  }

  #adjustPerformance() {
    const avgLoad = performance.getEntriesByName('aiMetrics')
      .map(m => m.duration)
      .reduce((a,b) => a + b, 0);
    
    if (avgLoad > 100) {
      AIDecisionSystem.#PREDICTION_TIMEOUT = Math.max(
        500, 
        AIDecisionSystem.#PREDICTION_TIMEOUT - 100
      );
    }
  }
}

// ===== AI 系统全局初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  // 预热AI线程
  if (window.Worker) {
    const aiWorker = new Worker('/js/ai-worker.js');
    aiWorker.postMessage({ type: 'warmup' });
  }

  // 初始化性能监控
  window.aiPerfMonitor = new AIPerformanceMonitor();

  // 注册开发者工具钩子
  if (window.__TAURI_INTERNALS__) {
    window.__TAURI_INTERNALS__.registerPlugin('ai-debug', {
      getDecisionCache: () => AIDecisionSystem.#decisionCache,
      flushCache: () => AIDecisionSystem.#decisionCache.clear(),
      simulateDecision: (playerType) => {
        const testPlayer = { personality: playerType, chips: 1500 };
        return new AIDecisionSystem().makeDecision(testPlayer);
      }
    });
  }
});

// ===== 错误边界处理 =====
window.addEventListener('error', (e) => {
  if (e.message.includes('AIDecisionSystem')) {
    document.dispatchEvent(new CustomEvent('ai-crash', {
      detail: { 
        error: e.error,
        component: 'AI Decision System'
      }
    }));
  }
});

// ===== 热更新支持（开发环境） =====
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    console.log('AI模块热更新中...');
    window.AIDecisionSystem = newModule.AIDecisionSystem;
    document.dispatchEvent(new Event('ai-module-updated'));
  });
}

