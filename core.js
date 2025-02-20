// core.js - 游戏核心系统
class GameCore {
  constructor() {
    this.aiSystem = null;
    this.deck = []; // 建议明确声明牌堆属性
	    // ==== 基础牌局状态 ====
    this.gamePhase = 'preflop'; // preflop/flop/turn/river
    this.players = [];
    this.deck = [];
    this.communityCards = [];
    
    // ==== 资金系统 ====
    this.pot = 0;                // 总奖池
    this.mainPot = 0;            // 主池
    this.sidePots = [];          // 边池数组
    this.playerBets = new Map(); // 玩家累计下注映射表
    this.currentBettor = 0;      // 当前行动玩家索引
    this.currentRaiseAmount = 0; // 当前轮次加注基准

    // ==== 成长系统 ====
    this.playerData = {
      coins: 1000,
      level: 1,
      exp: 0,
      streak: 0,
      skills: []
    };

    // ==== 依赖模块 ====
    this.ui = null;       // UI控制器
  }

  // 异步化洗牌算法 (分帧处理)
  async asyncInitGame(aiCount, progressCallback) {
    try {
      // 0~10%: 准备牌堆
      this.generateDeck();
      this._updateProgress(progressCallback, 0.1);

      // 10%~80%: 分批次洗牌
      await this.shuffleDeckAsync(progress => 
        this._updateProgress(progressCallback, 0.1 + 0.7 * progress)
      );

      // 80%~90%: 发牌
      this.dealInitialCards();
      this._updateProgress(progressCallback, 0.9);

      // 90%~100%: AI初始化
      await this.initAIPlayersAsync(aiCount);
      this.aiSystem = new AIDecisionSystem(this);
      this._updateProgress(progressCallback, 1);
      
      return true; // 明确返回成功状态
    } catch (error) {
      console.error('初始化失败:', error);
      return false;
    }
  }

  // 私有方法：进度回调保护
  _updateProgress(callback, value) {
    const progress = Math.min(Math.max(value, 0), 1);
    callback?.(progress);
  }

  // 以下方法需要具体实现（示例）
  generateDeck() {
    /* 生成牌堆逻辑 */
  }

  async shuffleDeckAsync(progressCallback) {
    /* 异步洗牌逻辑 */
  }

  dealInitialCards() {
    /* 发牌逻辑 */
  }

  async initAIPlayersAsync(count) {
    /* 异步初始化AI */
  }

  shuffleDeckAsync(progressCallback) {
    return new Promise(resolve => {
      let completed = 0;
      const total = this.deck.length;

      const processChunk = () => {
        // 每次处理 10 张牌，让出主线程
        for (let i = 0; i < 10 && completed < total; i++) {
          const j = Math.floor(Math.random() * (completed + 1));
          [this.deck[completed], this.deck[j]] = [this.deck[j], this.deck[completed]];
          completed++;
        }

        progressCallback(completed / total);

        if (completed < total) {
          requestIdleCallback(processChunk); // 空闲时段执行
        } else {
          resolve();
        }
      };

      requestIdleCallback(processChunk);
    });
  }
    // ===== 补全 AI 玩家创建函数 =====
  createAIPlayer() {
    return {
      isAI: true,
      chips: 1000,
      cards: [],
      isFolded: false,
      personality: 'conservative', 
      bet(amount) { this.chips -= amount; }
    };
  }
  
    generateAIBatch(n) {
    for (let i = 0; i < n; i++) {
      this.players.push(this.createAIPlayer()); // 使用新创建的createAIPlayer
    }
  }

  async initAIPlayersAsync(count) {
    // 分批创建 AI
    const batchSize = 2;
    for (let i = 0; i < count; i += batchSize) {
      await new Promise(r => setTimeout(r, 0));
      this.generateAIBatch(batchSize);
    }
  }

  generateAIBatch(n) {
    for (let i = 0; i < n; i++) {
      this.players.push(this.createAIPlayer());
    }
  }
  
	  async initNewGameAsync(aiCount = 3) {
    return new Promise((resolve) => {
      this.generateDeck();
      this.players = [
        this.createHumanPlayer(),
        ...this.generateAIPlayers(aiCount)
      ];
      
      // 分解洗牌算法
      this.shuffleDeckInSteps(() => {
        this.resetRoundState();
        this.dealInitialCards();
        this.collectBlinds();
        this.aiSystem = new AIDecisionSystem(this);
        resolve();
      });
    });
  }

  // 分阶段洗牌避免阻塞
  shuffleDeckInSteps(onComplete) {
    let i = this.deck.length - 1;
    const chunkSize = 10; // 每批洗 10 张牌
    
    const step = () => {
      for (let j = 0; j < chunkSize; j++) {
        if (i <= 0) {
          onComplete();
          return;
        }
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[randomIndex]] = [this.deck[randomIndex], this.deck[i]];
        i--;
      }
      
      requestAnimationFrame(step); // 利用空闲帧完成洗牌
    };
    
    requestAnimationFrame(step);
  }


  //===== 牌局生命周期 =====//
  initNewGame(aiCount = 3) {
    this.generateDeck();
    this.players = [
      this.createHumanPlayer(),
      ...this.generateAIPlayers(aiCount)
    ];
    this.resetRoundState();
    this.dealInitialCards();
    this.collectBlinds();
    this.aiSystem = new AIDecisionSystem(this);
  }

  resetRoundState() {
    this.pot = 0;
    this.mainPot = 0;
    this.sidePots = [];
    this.playerBets.clear();
    this.communityCards = [];
    this.gamePhase = 'preflop';
    this.currentBettor = 0;
    this.currentRaiseAmount = 0;
    this.players.forEach(p => {
      p.cards = [];
      p.isFolded = false;
    });
  }

  //===== 牌堆操作 =====//
  generateDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    this.deck = suits.flatMap(suit => 
      ranks.map(rank => ({ suit, rank, toString: () => suit + rank }))
    );
    this.shuffleDeck();
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealInitialCards() {
    this.players.forEach(player => {
      player.cards = [this.drawCard(), this.drawCard()];
    });
  }

  drawCard() {
    return this.deck.pop() || { suit: '❌', rank: 'NULL' }; // 防越界保护
  }

  //===== 下注流程 =====//
  processPlayerAction(actionType, amount = 0) {
    const player = this.players[this.currentBettor];
    if (player.isFolded) return this.advanceToNextPlayer();

    switch(actionType) {
      case 'fold':
        player.isFolded = true;
        break;
      case 'call':
        this.handleCallAction(player);
        break;
      case 'raise':
        this.handleRaiseAction(player, amount);
        break;
    }
    this.updatePotStructures();
    this.advanceToNextPlayer();
  }

  handleCallAction(player) {
    const requireCall = this.currentRaiseAmount - (this.playerBets.get(player) || 0);
    const actualCall = Math.min(requireCall, player.chips);
    this.placeBet(player, actualCall);
  }

  handleRaiseAction(player, raiseAmount) {
    const currentBet = this.playerBets.get(player) || 0;
    const totalRequired = currentBet + raiseAmount;
    const actualRaise = Math.min(raiseAmount, player.chips);
    
    this.placeBet(player, actualRaise);
    this.currentRaiseAmount = totalRequired;
  }

  placeBet(player, amount) {
    if (amount <= 0) return;
    const realBet = Math.min(amount, player.chips);
    player.chips -= realBet;
    this.playerBets.set(player, (this.playerBets.get(player) || 0) + realBet);
    this.pot += realBet;
  }

  //===== 分池系统 =====//
  updatePotStructures() {
    const activePlayers = this.players.filter(p => !p.isFolded);
    if (activePlayers.length === 0) return;

    const bets = [...this.playerBets.values()];
    const minContrib = Math.min(...bets);
    
    // 更新主池
    this.mainPot = minContrib * activePlayers.length;
    
    // 生成边池
    this.sidePots = bets
      .filter(b => b > minContrib)
      .sort((a,b) => a - b)
      .map(level => {
        const excess = level - minContrib;
        const eligible = activePlayers.filter(p => this.playerBets.get(p) >= level);
        return { amount: excess * eligible.length, eligiblePlayers: eligible };
      });
  }

  //===== 阶段推进 =====//
  nextStage() {
    const phases = ['preflop', 'flop', 'turn', 'river'];
    const currentPhaseIndex = phases.indexOf(this.gamePhase);
    if (currentPhaseIndex >= phases.length - 1) return this.endGame();

    this.gamePhase = phases[currentPhaseIndex + 1];
    this.releaseCommunityCards();
    this.startBettingRound();
  }

  releaseCommunityCards() {
    const releaseCount = {
      flop: 3,
      turn: 1,
      river: 1
    }[this.gamePhase] || 0;
    
    this.communityCards.push(...Array.from({ length: releaseCount }, () => this.drawCard()));
  }

  startBettingRound() {
    this.currentBettor = 0;
    this.currentRaiseAmount = 0;
    this.playerBets.clear();
  }

  //===== 胜负判定 =====//
  endGame() {
    const activePlayers = this.players.filter(p => !p.isFolded);
    const winnerData = this.determineWinner(activePlayers);
    
    this.distributePot(winnerData);
    this.updateProgression(winnerData);
    this.ui?.renderGameOver(winnerData);
  }

  determineWinner(players) {
    if (players.length === 1) {
      return { 
        winners: players,
        handRank: '默认胜利',
        splitPot: this.mainPot 
      };
    }

    const evaluations = players.map(player => ({
      source: player,
      eval: this.evaluatePlayerHand(player)
    })).sort((a, b) => b.eval.score - a.eval.score);

    const maxScore = evaluations[0].eval.score;
    const winners = evaluations.filter(e => e.eval.score === maxScore);

    return {
      winners: winners.map(w => w.source),
      handRank: winners[0].eval.rank,
      splitPot: Math.floor(this.mainPot / winners.length)
    };
  }

  evaluatePlayerHand(player) {
    const fullHand = [...player.cards, ...this.communityCards];
    return this.aiSystem.evaluatePokerHand(fullHand);
  }

  //===== 经济系统 =====//
  collectBlinds() {
    this.players.forEach((player, index) => {
      const blind = index === 0 ? 100 : 50; // 玩家大盲, AI小盲
      this.placeBet(player, blind);
    });
  }

  distributePot(winnerData) {
    // 主池分配
    const mainWinners = winnerData.winners.filter(winner => 
      this.sidePots.every(pot => pot.eligiblePlayers.includes(winner))
    );
    const mainShare = this.mainPot / mainWinners.length;
    mainWinners.forEach(winner => winner.chips += mainShare);

    // 边池分配
    this.sidePots.forEach(pot => {
      const eligibleWinners = winnerData.winners.filter(w => pot.eligiblePlayers.includes(w));
      if (eligibleWinners.length === 0) return;
      const share = pot.amount / eligibleWinners.length;
      eligibleWinners.forEach(w => w.chips += share);
    });
  }

  //===== 成长系统 =====//
  updateProgression(result) {
    const isWin = result.winners.includes(this.players[0]);
    
    // 连胜计算
    this.playerData.streak = isWin ? (this.playerData.streak || 0) + 1 : 0;
    if (this.playerData.streak % 3 === 0) {
      this.playerData.coins += 300;
    }

    // 经验计算
    const baseExp = isWin ? 100 : 50;
    this.playerData.exp += baseExp + result.winners.length * 20;

    // 等级提升
    while (this.playerData.exp >= this.requiredExp) {
      this.playerData.exp -= this.requiredExp;
      this.playerData.level++;
    }
  }

  get requiredExp() {
    return 100 * Math.pow(1.5, this.playerData.level);
  }

  //===== 玩家管理 =====//
  createHumanPlayer() {
    return {
      isAI: false,
      chips: 1000,
      cards: [],
      isFolded: false,
      bet: function(amount) { this.chips -= amount; }
    };
  }

  generateAIPlayers(count) {
    return Array.from({ length: count }, () => ({
      isAI: true,
      chips: 1000,
      cards: [],
      isFolded: false,
      personality: 'conservative',
      bet: function(amount) { this.chips -= amount; }
    }));
  }

  //===== 辅助方法 =====//
  advanceToNextPlayer() {
	  console.log('当前 AI 系统状态:', this.aiSystem); // 应为对象实例
    do {
      this.currentBettor = (this.currentBettor + 1) % this.players.length;
    } while (this.currentBettor !== 0 && this.players[this.currentBettor].isFolded);
  }

  isBettingRoundComplete() {
    return this.players.every(p => 
      p.isFolded || 
      (this.playerBets.get(p) === this.currentRaiseAmount)
    );
  }
  
}