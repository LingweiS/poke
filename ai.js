// ai.js - AI智能决策系统
// ai.js - AI智能决策系统
'use strict'; // 启用严格模式
class AIDecisionSystem {
  constructor(gameCore) {
    this.game = gameCore;
    this.history = []; // 用于记录对局历史辅助决策
  }

  // 主决策入口
  makeDecision(aiPlayer) {
    const personality = aiPlayer.personality;
    let action;

    switch(personality) {
      case 'conservative':
        action = this.conservativeAI(aiPlayer);
        break;
      case 'aggressive':
        action = this.aggressiveAI(aiPlayer);
        break;
      case 'deceptive':
        action = this.deceptiveAI(aiPlayer);
        break;
      case 'mathematician':
        action = this.mathematicianAI(aiPlayer);
        break;
    }

    return this.applyDynamicAdjustment(aiPlayer, action);
  }

  // 保守型AI：倾向弃牌与跟注
  conservativeAI(aiPlayer) {
    const handStrength = this.calculateHandStrength(aiPlayer);
    const phase = this.game.gamePhase;

    if (handStrength < 0.3 && Math.random() < 0.4) {
      return { action: 'fold' };
    }

    if (handStrength < 0.6 || phase === 'preflop') {
      return { action: 'call' };
    }

    return { 
      action: 'raise',
      amount: this.calculateRaiseAmount(aiPlayer, 0.1)
    };
  }

  // 激进型AI：高频加注施压
  aggressiveAI(aiPlayer) {
    const rand = Math.random();
    const baseBet = this.game.currentRaiseAmount || 50;

    if (rand < 0.7) {
      return {
        action: 'raise',
        amount: this.calculateRaiseAmount(aiPlayer, 0.3 + Math.random()*0.3)
      };
    }

    return { action: 'call' };
  }

  // 伪装型AI：反向策略欺骗
  deceptiveAI(aiPlayer) {
    const realStrength = this.calculateHandStrength(aiPlayer);
    const shownStrength = realStrength + (Math.random() - 0.5) * 0.4;
    
    if (realStrength > 0.7 && Math.random() < 0.6) {
      return { action: 'call' }; // 强牌伪装保守
    }

    if (realStrength < 0.4 && Math.random() < 0.5) {
      return { // 弱牌发动诈唬
        action: 'raise',
        amount: this.calculateRaiseAmount(aiPlayer, 0.4)
      };
    }

    return this.conservativeAI(aiPlayer); // 其余情况回归保守策略
  }

  // 数学型AI：精确概率计算
  mathematicianAI(aiPlayer) {
    const potOdds = this.calculatePotOdds();
    const winProbability = this.calculateWinProbability(aiPlayer);
    
    if (winProbability > potOdds + 0.15) {
      return {
        action: 'raise',
        amount: this.calculateRaiseAmount(aiPlayer, winProbability/2)
      };
    }

    return (winProbability > potOdds) 
      ? { action: 'call' }
      : { action: 'fold' };
  }

  // 基础工具方法
  calculateRaiseAmount(player, factor) {
    const maxAffordable = player.chips * 0.5; // 不超过50%筹码
    return Math.min(
      Math.ceil(this.game.pot * factor),
      maxAffordable
    );
  }

  calculateHandStrength(player) {
    // 简化的牌力评估算法（可后续扩展）
    const cards = [...player.cards, ...this.game.communityCards];
    return this.estimateHandPotential(cards);
  }

  estimateHandPotential(cards) {
    // 基础牌型概率估算（示例逻辑）
    const scoreMap = {
      highCard: 0.1,
      pair: 0.3,
      twoPairs: 0.5,
      threeOfAKind: 0.7,
      straight: 0.8,
      flush: 0.85,
      fullHouse: 0.9,
      fourOfAKind: 0.97,
      straightFlush: 1.0
    };
    return this.evaluatePokerHand(cards).score * 0.1 + Math.random()*0.1;
  }

  calculatePotOdds() {
    const costToCall = this.game.currentRaiseAmount;
    return costToCall / (this.game.pot + costToCall);
  }

  // 简化的扑克手牌评估（完整实现需扩展）
// 在AIDecisionSystem类中替换原有临时代码
  evaluatePokerHand(cards) {
    const countRanks = this.countCardRanks(cards);
    const countSuits = this.countCardSuits(cards);
    const rankOrder = '23456789TJQKA';
    const isStraight = this.checkStraight(cards, rankOrder);
    const isFlush = this.checkFlush(cards);
    
    // ===== 核心修正点 =====
    const evaluationResult = [
      this.checkStraightFlush(cards, rankOrder, isStraight, isFlush),
      this.checkFourOfAKind(countRanks),
      this.checkFullHouse(countRanks),
      isFlush,
      isStraight,
      this.checkThreeOfAKind(countRanks),
      this.checkTwoPairs(countRanks),
      this.checkOnePair(countRanks),
      this.checkHighCard(cards, rankOrder)
      // 修改参数名为 evaluationItem 
    ].find(evaluationItem => evaluationItem.valid); // ✅ 合规参数名
    
    return evaluationResult || { rank: 'highCard', score: 0 };
  }

// 辅助方法：统计花色与数字
countCardRanks(cards) {
  return cards.reduce((count, { rank }) => {
    count[rank] = (count[rank] || 0) + 1; 
    return count;
  }, {});
}

countCardSuits(cards) {
  return cards.reduce((count, { suit }) => {
    count[suit] = (count[suit] || 0) + 1;
    return count;
  }, {});
}

// 牌型判定逻辑
checkStraightFlush(cards, rankOrder, isStraight, isFlush) {
  if (isStraight.valid && isFlush.valid) {
    const isRoyal = isStraight.highCard === 'A';
    return {
      rank: isRoyal ? 'royalFlush' : 'straightFlush',
      score: isRoyal ? 100 : 90 + rankOrder.indexOf(isStraight.highCard)/13,
      valid: true
    };
  }
  return { valid: false };
}

checkFourOfAKind(rankCount) {
  const quad = Object.entries(rankCount).find(([_, n]) => n === 4);
  if (quad) {
    const remaining = this.getKickers(rankCount, 4);
    return { 
      rank: 'fourOfAKind', 
      score: 80 + this.rankValue(quad[0]) + remaining[0]/20,
      valid: true 
    };
  }
  return { valid: false };
}

checkFullHouse(rankCount) {
  const triple = Object.entries(rankCount).find(([_, n]) => n === 3);
  const pair = triple && Object.entries(rankCount).find(([k, n]) => n >= 2 && k !== triple[0]);
  if (triple && pair) {
    return { 
      rank: 'fullHouse', 
      score: 70 + this.rankValue(triple[0]) + this.rankValue(pair[0])/20,
      valid: true 
    };
  }
  return { valid: false };
}

checkFlush(cards) {
  const suits = this.countCardSuits(cards);
  const flushSuit = Object.entries(suits).find(([_, n]) => n >= 5);
  if (flushSuit) {
    const flushCards = cards.filter(c => c.suit === flushSuit[0])
                          .sort((a,b) => this.rankValue(b.rank) - this.rankValue(a.rank));
    const score = 60 + this.rankValue(flushCards[0].rank) + 
                  this.rankValue(flushCards[1].rank)/20;
    return { rank: 'flush', score, valid: true };
  }
  return { valid: false };
}

checkStraight(cards, rankOrder) {
  const rankSet = new Set(cards.map(c => c.rank));
  const uniqueRanks = [...rankSet].sort((a,b) => rankOrder.indexOf(b) - rankOrder.indexOf(a));
  
  // 特殊处理A-2-3-4-5顺子
  if (uniqueRanks.join('') === 'A5432') {
    return { valid: true, highCard: '5', score: 50 };
  }

  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    const subset = uniqueRanks.slice(i, i+5);
    if (this.isConsecutive(subset, rankOrder)) {
      return { 
        valid: true, 
        highCard: subset[0], 
        score: 50 + rankOrder.indexOf(subset[0])/13 
      };
    }
  }
  return { valid: false };
}

// 其他次级牌型判断（同三条/两对等）
checkThreeOfAKind(rankCount) {
  const triples = Object.entries(rankCount).filter(([_, n]) => n === 3);
  if (triples.length > 0) {
    const kickers = this.getKickers(rankCount, 3, 2);
    return {
      rank: 'threeOfAKind',
      score: 60 + this.rankValue(triples[0][0]) + kickers[0]/20,
      valid: true
    };
  }
  return { valid: false };
}
 checkTwoPairs(rankCount) {
    const pairs = Object.entries(rankCount).filter(([_, n]) => n === 2);
    if (pairs.length >= 2) {
      const sortedPairs = pairs.sort((a, b) => this.rankValue(b[0]) - this.rankValue(a[0]));
      const kicker = this.getKickers(rankCount, 2, 1)[0];
      return {
        rank: 'twoPairs',
        score: 50 + this.rankValue(sortedPairs[0][0])*0.6 + 
                   this.rankValue(sortedPairs[1][0])*0.3 +
                   kicker*0.1,
        valid: true
      };
    }
    return { valid: false };
  }

  checkOnePair(rankCount) {
    const pair = Object.entries(rankCount).find(([_, n]) => n === 2);
    if (pair) {
      const kickers = this.getKickers(rankCount, 2, 3);
      return {
        rank: 'onePair',
        score: 40 + this.rankValue(pair[0])*0.7 +
                   kickers.reduce((a, b) => a + b, 0)*0.1,
        valid: true
      };
    }
    return { valid: false };
  }

  checkHighCard(cards) {
    const highCard = cards.reduce((max, card) => 
      this.rankValue(card.rank) > this.rankValue(max.rank) ? card : max
    );
    return {
      rank: 'highCard',
      score: this.rankValue(highCard.rank),
      valid: true
    };
  }

// 通用工具方法
rankValue(rank) {
  const order = '23456789TJQKA';
  return order.indexOf(rank) / (order.length - 1);
}

isConsecutive(ranks, order) {
  const indices = ranks.map(r => order.indexOf(r));
  return Math.max(...indices) - Math.min(...indices) === 4;
}

getKickers(rankCount, excludeCount, num = 1) {
  return Object.keys(rankCount)
    .filter(k => rankCount[k] !== excludeCount)
    .sort((a,b) => this.rankValue(b) - this.rankValue(a))
    .slice(0, num)
    .map(k => this.rankValue(k));
}

  // 根据玩家行为动态调整策略
  applyDynamicAdjustment(aiPlayer, baseAction) {
    const humanActions = this.history.filter(a => !a.player.isAI);
    
    // 检测人类频繁加注
    const recentRaises = humanActions.filter(a => a.action === 'raise').length;
    if (recentRaises > 2) {
      if (aiPlayer.personality === 'aggressive') {
        baseAction.amount *= 1.2; // 激进型加倍回应
      }
    }

    return baseAction;
  }
  
    // 进阶版玩家推进方法
  advanceToNextPlayer() {
    do {
      this.currentBettor = (this.currentBettor + 1) % this.players.length;
      
      // AI自动决策
      const current = this.players[this.currentBettor];
      if (current.isAI) {
        const aiSystem = new AIDecisionSystem(this);
        const action = aiSystem.makeDecision(current);
        this.processPlayerAction(action.action, action.amount);
      }
      
    } while(!this.players[this.currentBettor].isHuman && !this.isBettingRoundComplete());
  }
}
window.AIDecisionSystem = AIDecisionSystem;