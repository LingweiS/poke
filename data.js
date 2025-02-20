// data.js - 游戏数据管理系统
const STORAGE_KEY = 'TexasPlayerData';

// ==== 全局常量 ====
window.DEFAULT_PLAYER_DATA = {
  coins: 1000,
  level: 1,
  exp: 0,
  streak: 0,
  skills: [],
  unlockedAITypes: ['conservative'],
  lastPlayed: null
};

window.SKILL_TREE = [
  {
    id: 'prob_hint',
    name: '胜率预测',
    cost: 3,
    unlockLevel: 5,
    effect: '显示当前手牌获胜概率'
  },
  {
    id: 'card_reset',
    name: '手牌重置',
    cost: 5,
    unlockLevel: 8,
    effect: '每局可更换一次初始手牌'
  }
];

// ==== 存档方法 ====
window.loadPlayerData = function() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...window.DEFAULT_PLAYER_DATA, ...saved };
  } catch {
    return { ...window.DEFAULT_PLAYER_DATA };
  }
};

window.savePlayerData = function(game) {
  const data = {
    coins: game.playerData.coins,
    level: game.playerData.level,
    exp: game.playerData.exp,
    streak: game.playerData.streak,
    skills: [...game.playerData.skills],
    unlockedAITypes: [...game.playerData.unlockedAITypes],
    lastPlayed: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};