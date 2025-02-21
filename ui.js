// ui.js - 优化后的用户界面系统
class GameUI {
	#renderMenuHeader; // 添加私有字段声明
	#animationId;
	#eventHandlers;
	#visiblePlayers;
	#observer;
	
	  constructor(gameCore) {
    if (!gameCore) {
      throw new Error('必须传入有效的GameCore实例');
    }

  constructor(gameCore) {
    this.game = gameCore;
    // 初始化私有方法
    this.#renderMenuHeader = () => {
      return `
        <div class="menu-header">
          <h2>当前等级: ${this.game.playerData.level}</h2>
          <p>金币: ${this.game.playerData.coins}</p>
        </div>
      `;
    };

  // ===== 核心生命周期方法 =====
  async renderMainMenu() {
    this.#cleanup();
    await this.#renderTemplate(() => this.#mainMenuTemplate());
    this.#bindDynamicElements();
  }

  async renderGameInterface() {
    this.#cleanup();
    await this.#renderTemplate(() => this.#gameInterfaceTemplate());
    this.#startViewportOptimization();
    this.#bindDynamicElements();
  }

destroy() {
  this.#cleanup();
  this.#observer?.disconnect();
  cancelAnimationFrame(this.#animationId);

  // 清理事件绑定
  for (const [type, handler] of this.#eventHandlers) {
    document.removeEventListener(type, handler);
  }
  this.#eventHandlers.clear();
}

  // ===== 性能优化方法 =====
  #initPerformanceObserver() {
    this.#observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.duration > 50) {
          console.warn('Long task detected:', entry);
        }
      });
    });
    this.#observer.observe({ entryTypes: ['longtask'] });
  }
  
    // 保持其他方法不变
  #mainMenuTemplate() {
    return `
      <div class="menu-grid">
        ${this.#renderMenuHeader()} <!-- 现在可以正确调用 -->
        <!-- 其他内容... -->
      </div>
    `;
  }
}

  #startViewportOptimization() {
    const container = this.container.querySelector('.player-area');
    const virtualScroll = () => {
      const { top, bottom } = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      this.#visiblePlayers = this.game.players.filter((_, i) => {
        const elem = container.children[i];
        const elemTop = elem.offsetTop - container.offsetTop;
        return elemTop < viewportHeight && elemTop > -100;
      });
      this.#animationId = requestAnimationFrame(virtualScroll);
    };
    virtualScroll();
  }

  // ===== 渲染优化方法 =====
async #renderTemplate(templateFn) {
  const fragment = document.createDocumentFragment();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = templateFn();
  
  while (wrapper.firstChild) {
    fragment.appendChild(wrapper.firstChild);
  }
  
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      this.container.replaceChildren(fragment);
      resolve();
    });
  });
}

  #mainMenuTemplate() {
    return `
      <div class="menu-grid">
        ${this.#renderMenuHeader()}
        <div class="menu-options">
          ${['new', 'skills', 'history', 'settings'].map(opt => `
            <button class="holographic" data-action="${opt}">
              ${this.#getMenuLabel(opt)}
            </button>
          `).join('')}
        </div>
        ${this.#renderPlayerStats()}
      </div>
    `;
  }

  #gameInterfaceTemplate() {
    return `
      <div class="game-frame">
        ${this.#renderHeader()}
        <div class="player-area virtual-scroll"></div>
        ${this.#renderCommunityCards()}
        ${this.#renderActionPanel()}
        ${this.#renderStatusBar()}
      </div>
    `;
  }

  // ===== 事件管理系统 =====
  #initEventSystem() {
    this.#eventHandlers
      .set('click', this.#handleClick.bind(this))
      .set('keydown', this.#handleKeyPress.bind(this));
    
    for (const [type, handler] of this.#eventHandlers) {
      document.addEventListener(type, handler);
    }
  }

  #handleClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    this.#executeSafe(() => {
      this.game.processPlayerAction(action);
      this.#updateDynamicComponents();
    });
  }

  #handleKeyPress(event) {
    const keyMap = {
      ArrowLeft: () => this.navigateMenu(-1),
      ArrowRight: () => this.navigateMenu(1),
      Enter: () => this.selectMenu(),
      Escape: () => this.backToMainMenu()
    };
    
    this.#executeSafe(() => keyMap[event.key]?.());
  }

  // ===== 辅助方法 =====
#executeSafe(fn) {
  try {
    fn();
  } catch (error) {
    const errorBox = document.createElement('div');
    errorBox.className = 'error-toast';
    errorBox.textContent = `错误: ${error.message}`;
    this.container.prepend(errorBox);
    setTimeout(() => errorBox.remove(), 3000);
    console.error('UI Error:', error);
  }
}

  #showErrorUI(error) {
    const errorBox = document.createElement('div');
    errorBox.className = 'error-toast';
    errorBox.textContent = `UI Error: ${error.message}`;
    this.container.prepend(errorBox);
    setTimeout(() => errorBox.remove(), 3000);
  }

  #cleanup() {
    this.container.querySelectorAll('.dynamic').forEach(e => e.remove());
    cancelAnimationFrame(this.#animationId);
  }

  #bindDynamicElements() {
    this.container.querySelectorAll('[data-bind]').forEach(element => {
      const property = element.dataset.bind;
      Object.defineProperty(this.game.playerData, property, {
        set: (value) => {
          element.textContent = value;
        }
      });
    });
  }

  // ===== 保留原有业务逻辑 =====
showLoadingIndicator(message) {
  this.#renderTemplate(() => `
    <div class="loading-screen">
      <div class="loading-spinner"></div>
      <div class="loading-text">${message}</div>
    </div>
  `);
}

  #startQuantumAnimation() {
    const spinner = this.container.querySelector('.quantum-spinner');
    let phase = 0;
    
    const animate = () => {
      phase = (phase + 2) % 360;
      spinner.style.background = `
        conic-gradient(
          #00ff00 ${phase}deg,
          transparent ${phase + 20}deg
        )
      `;
      this.#animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  // ... 其他原有方法保持业务逻辑不变 ...
}

// 浏览器兼容性检查
if (typeof requestAnimationFrame === 'undefined') {
  document.body.innerHTML = `
    <div class="compatibility-error">
      您的浏览器不支持必要特性，请使用现代浏览器
    </div>
  `;
  throw new Error('Browser not supported');
}
