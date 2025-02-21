window.gameLogger = {
  log: (message) => {
    const logContainer = document.getElementById('gameLog');
    if (logContainer) {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logContainer.appendChild(logEntry);
    }
    console.log(message);
  },
  error: (message) => {
    const logContainer = document.getElementById('gameLog');
    if (logContainer) {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry error';
      logEntry.textContent = `[${new Date().toLocaleTimeString()}] ERROR: ${message}`;
      logContainer.appendChild(logEntry);
    }
    console.error(message);
  }
};
// =============== core.js 第一部分 ===============
class GameCore {
  static GAME_PHASES = ['preflop', 'flop', 'turn', 'river'];
  
  constructor() {
    // 核心游戏状态
    this.players = [];
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.mainPot = 0;
    this.sidePots = [];
    this.currentBettor = 0;
    this.currentRaiseAmount = 0;
    this.gamePhase = 'preflop';
    
    // 玩家数据系统
    this.playerData = {
      coins: 1000,
      level: 1,
      exp: 0,
      streak: 0,
      skills: [],
      unlockedAITypes: ['conservative']
    };
    
    // 子系统初始化
    this.aiSystem = null;
    this.ui = null;
  }

  // ===== 基础生命周期方法 =====
  async asyncInitGame(aiCount, progressCallback) {
    try {
      this._updateProgress(progressCallback, 0.1);
      await this.initializeDeck(progressCallback);
      this.dealInitialCards();
      await this.initializeAIPlayers(aiCount);
      this._updateProgress(progressCallback, 1);
    } catch (err) {
      console.error('游戏初始化失败:', err);
      throw err;
    }
  }

  // ===== 牌堆管理 =====
  generateDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    this.deck = suits.flatMap(suit => 
      ranks.map(rank => ({
        suit,
        rank,
        toString: () => suit + rank,
        value: this._cardValue(rank)
      }))
    );
  }
// =============== core.js 第二部分 ===============
  // ===== 异步洗牌实现 =====
async shuffleDeckAsync(progressCallback) {
  return new Promise((resolve) => {
    const chunkSize = 10;
    let currentIndex = this.deck.length - 1;

    const processChunk = () => {
      for (let i = 0; i < chunkSize; i++) {
        if (currentIndex <= 0) {
          resolve();
          return;
        }
        const randIndex = Math.floor(Math.random() * (currentIndex + 1));
        [this.deck[currentIndex], this.deck[randIndex]] = 
          [this.deck[randIndex], this.deck[currentIndex]];
        currentIndex--;
      }
      
      this._updateProgress(
        progressCallback, 
        1 - (currentIndex / this.deck.length)
      );
      requestIdleCallback(processChunk);
    };

    requestIdleCallback(processChunk);
  });
}

  // ===== 发牌逻辑 =====
  dealInitialCards() {
    this.players.forEach(player => {
      player.cards = [
        this.drawCard(),
        this.drawCard()
      ];
    });
  }

  drawCard() {
    return this.deck.pop() || { 
      suit: '❌', 
      rank: 'NULL', 
      toString: () => 'NULL' 
    };
  }

  // ===== 下注系统 =====
processPlayerAction(actionType, amount = 0) {
  const player = this.players[this.currentBettor];
  if (player.isFolded) return this.advanceToNextPlayer();

  // 检查玩家余额
  if (actionType === 'call' && player.chips < this.currentRaiseAmount) {
    actionType = 'fold'; // 自动弃牌
  }
  if (actionType === 'raise' && player.chips < amount) {
    amount = player.chips; // 使用最大可用金额
  }

  switch(actionType) {
    case 'fold':
      this._handleFold(player);
      break;
    case 'call':
      this._handleCall(player);
      break;
    case 'raise':
      this._handleRaise(player, amount);
      break;
  }
  
  this.updatePotStructures();
  this.advanceToNextPlayer();
}
// =============== core.js 第三部分 ===============
  // ===== 辅助方法 =====
  _updateProgress(callback, value) {
    if (typeof callback === 'function') {
      const clampedValue = Math.min(Math.max(value, 0), 1);
      callback(clampedValue);
    }
  }

  _cardValue(rank) {
    const values = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
      '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank] || 0;
  }

  // ===== 玩家推进系统 =====
advanceToNextPlayer() {
  do {
    this.currentBettor = (this.currentBettor + 1) % this.players.length;
  } while(
    this.currentBettor !== 0 && 
    this.players[this.currentBettor].isFolded
  );
  
  if (this.players[this.currentBettor].isAI) {
    setTimeout(() => this._processAITurn(), 100); // 延迟触发 AI 决策
  }
}

  // ===== AI集成 =====
  _processAITurn() {
    if (!this.aiSystem) {
      this.aiSystem = new window.AIDecisionSystem(this);
    }
    
    const aiPlayer = this.players[this.currentBettor];
    const action = this.aiSystem.makeDecision(aiPlayer);
    this.processPlayerAction(action.action, action.amount);
  }

  // ===== 经济系统 =====
  updateProgression(result) {
    const isWin = result.winners.includes(this.players[0]);
    this.playerData.streak = isWin ? this.playerData.streak + 1 : 0;
    
    // 经验值计算
    const expGain = isWin ? 100 : 50;
    this.playerData.exp += expGain + result.winners.length * 20;
    
    // 等级提升
    while (this.playerData.exp >= this.requiredExp) {
      this.playerData.exp -= this.requiredExp;
      this.playerData.level++;
    }
  }

  get requiredExp() {
    return 100 * Math.pow(1.5, this.playerData.level);
  }
}

// 导出核心类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameCore;
} else {
  window.GameCore = GameCore;
}
