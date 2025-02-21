// data.js - 游戏数据管理系统 (v2.0)
window.showDataError = (message) => {
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="error-message">
        <h2>数据错误</h2>
        <p>${message}</p>
        <button onclick="location.reload()">刷新页面</button>
      </div>
    `;
    errorContainer.style.display = 'block';
  }
};
const STORAGE_KEY = 'TexasPokerData_v2';
const LZ = typeof LZString !== 'undefined' ? LZString : null;

// ===== 数据版本控制 =====
const DATA_SCHEMA = {
  version: 2.3,
  migrations: {
    1.0: (data) => ({ ...data, unlockedAITypes: ['conservative'] }),
    2.0: (data) => ({ ...data, achievements: [] }),
    2.3: (data) => ({ 
      ...data,
      skills: data.skills.filter(skill => window.SKILL_TREE.some(t => t.id === skill))
    })
  }
};

// ===== 默认数据结构 =====
window.DEFAULT_PLAYER_DATA = Object.freeze({
  _schema: DATA_SCHEMA.version,
  coins: 1500,
  level: 1,
  exp: 0,
  streak: 0,
  skills: [],
  unlockedAITypes: ['conservative'],
  achievements: [],
  lastPlayed: null,
  stats: {
    handsPlayed: 0,
    handsWon: 0,
    totalProfit: 0
  }
});

// ===== 技能树配置 =====
window.SKILL_TREE = Object.freeze([
  {
    id: 'prob_hint',
    name: '胜率预测',
    cost: 3,
    unlockLevel: 5,
    effectType: 'visual',
    dependencies: []
  },
  {
    id: 'card_reset',
    name: '手牌重置',
    cost: 5,
    unlockLevel: 8,
    effectType: 'mechanic',
    dependencies: ['prob_hint']
  },
  {
    id: 'advanced_ai',
    name: 'AI分析',
    cost: 7,
    unlockLevel: 12,
    effectType: 'ai',
    dependencies: ['prob_hint']
  }
]);

// ===== 数据存储系统 =====
window.PlayerDataManager = {
  // 加载并验证数据
async load() {
  try {
    const compressed = localStorage.getItem(STORAGE_KEY);
    if (!compressed) return this._resetData(); // 如果数据为空，重置数据

    const json = LZ ? LZ.decompress(compressed) : compressed;
    const rawData = JSON.parse(json);

    if (!rawData || typeof rawData !== 'object') { // 检查数据是否有效
      console.warn('数据损坏，重置为默认数据');
      return this._resetData();
    }

    return this._validateData(this._migrateData(rawData));
  } catch (error) {
    console.error('数据加载失败:', error);
    return this._resetData(); // 捕获所有错误并重置数据
  }
}

  // 保存并压缩数据
async save(gameInstance) {
  const data = this._prepareData(gameInstance);
  const validated = this._validateData(data);

  try {
    const json = JSON.stringify(validated);
    const compressed = LZ ? LZ.compress(json) : json;

    if (compressed.length > 5 * 1024 * 1024) { // 检查数据大小是否超过 5MB
      console.warn('数据过大，可能无法存储');
      return false; // 添加 return 语句
    }

    localStorage.setItem(STORAGE_KEY, compressed);
    return true;
  } catch (error) {
    console.error('数据保存失败:', error);
    return false;
  }
}

  // 数据准备
  _prepareData(game) {
    return {
      ...game.playerData,
      stats: { 
        ...game.playerData.stats,
        lastSession: new Date().toISOString()
      }
    };
  },

  // 数据迁移
  _migrateData(rawData) {
    const currentVersion = DATA_SCHEMA.version;
    let version = rawData._schema || 1.0;
    
    while (version < currentVersion) {
      const migrator = DATA_SCHEMA.migrations[version];
      if (migrator) {
        rawData = migrator(rawData);
        version = Math.min(version + 0.1, currentVersion);
      } else {
        version = currentVersion;
      }
    }
    
    return { ...window.DEFAULT_PLAYER_DATA, ...rawData };
  },

  // 数据验证
  _validateData(data) {
    const validators = {
      coins: v => Number.isFinite(v) && v >= 0,
      level: v => Number.isInteger(v) && v >= 1,
      exp: v => Number.isFinite(v) && v >= 0,
      skills: v => Array.isArray(v) && v.every(s => 
        window.SKILL_TREE.some(t => t.id === s)
      ),
      unlockedAITypes: v => Array.isArray(v) && v.every(t =>
        ['conservative', 'aggressive', 'deceptive'].includes(t)
      )
    };

    for (const [key, validate] of Object.entries(validators)) {
      if (!validate(data[key])) {
        console.warn(`数据验证失败: ${key}`, data[key]);
        data[key] = window.DEFAULT_PLAYER_DATA[key];
      }
    }
    
    return data;
  },

  // 重置数据
  _resetData() {
    localStorage.removeItem(STORAGE_KEY);
    return { ...window.DEFAULT_PLAYER_DATA };
  }
};

// ===== 兼容旧版 API =====
window.loadPlayerData = () => PlayerDataManager.load();
window.savePlayerData = (game) => PlayerDataManager.save(game);

// ===== 数据监控 =====
if (typeof Proxy !== 'undefined') {
  window.PlayerData = new Proxy({ ...window.DEFAULT_PLAYER_DATA }, {
    set(target, prop, value) {
      const valid = Reflect.set(target, prop, value);
      if (valid) PlayerDataManager.save(window.gameInstance);
      return valid;
    }
  });
}
