// ui.js - 文字界面渲染系统
class GameUI {
	
	  // 使用文档片段批量更新
  renderPlayers() {
    const fragment = document.createDocumentFragment();
    this.game.players.forEach((player, index) => {
      const div = document.createElement('div');
      div.innerHTML = this.getPlayerHTML(player, index);
      fragment.appendChild(div);
    });
    this.container.querySelector('.player-area').appendChild(fragment);
  }

  // 采用 CSS transforms 优化渲染性能
  showLoadingIndicator(text) {
    // 使用硬件加速
    this.loadingElement.style.transform = 'translateZ(0)';
  }

	
	  showLoadingIndicator(message) {
    this.container.innerHTML = `
      <div class="loading-screen">
        <pre>${this.renderHeader()}</pre>
        <div class="loading-text">${message}</div>
        <div class="loading-spinner">█▒▒▒▒▒▒▒</div>
      </div>
    `;
    this.startSpinnerAnimation();
  }

  startSpinnerAnimation() {
    const spinner = this.container.querySelector('.loading-spinner');
    let progress = 0;
    this.spinnerInterval = setInterval(() => {
      progress = (progress + 1) % 8;
      spinner.textContent = '█'.repeat(progress).padEnd(8, '▒');
    }, 100);
  }

  hideLoadingIndicator() {
    clearInterval(this.spinnerInterval);
    this.container.querySelector('.loading-screen').remove();
  }
  constructor(gameCore) {
    this.game = gameCore;
    this.container = document.getElementById('gameContainer');
    this.initEventListeners();
  }

  //===== 核心渲染方法 =====//
  renderMainMenu() {
    this.container.innerHTML = `
      ${this.renderHeader()}
      <div class="menu">
        <button data-action="new">新游戏 (当前等级: ${this.game.playerData.level})</button>
        <button data-action="skills">技能树 (空闲点数: ${this.calcAvailableSkillPoints()})</button>
        <button data-action="history">历史战绩</button>
        <button data-action="settings">设置</button>
      </div>
      ${this.renderPlayerStats()}
    `;
    this.bindMenuActions();
  }

  renderSkillTree() {
    return `
      <div class="skill-tree">
        ${window.SKILL_TREE.map(skill => `
          <div class="skill ${this.isSkillUnlocked(skill.id) ? 'unlocked' : ''} 
              ${this.canUnlockSkill(skill) ? 'unlockable' : 'locked'}">
            <h3>${skill.name}</h3>
            <p>要求: LV${skill.unlockLevel} | 消耗点数: ${skill.cost}</p>
            <p>效果: ${skill.effect}</p>
            ${!this.isSkillUnlocked(skill.id) && this.canUnlockSkill(skill) ? 
              `<button data-skill="${skill.id}">解锁</button>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  //===== 事件系统 =====//
  initEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.navigateMenu(-1);
      if (e.key === 'ArrowRight') this.navigateMenu(1);
      if (e.key === 'Enter') this.selectMenu();
      if (e.key === 'Escape') this.backToMainMenu();
    });
  }

  bindMenuActions() {
    this.container.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleMenuAction(action);
      });
    });
  }

  //===== 缺失的辅助方法 (需补全) =====//
  calcAvailableSkillPoints() {
    // 示例：计算可用技能点数
    return this.game.playerData.level - this.game.playerData.skills.length;
  }

  isSkillUnlocked(skillId) {
    return this.game.playerData.skills.includes(skillId);
  }

  canUnlockSkill(skill) {
    return this.game.playerData.level >= skill.unlockLevel && 
           this.calcAvailableSkillPoints() >= skill.cost;
  }

  navigateMenu(direction) {/* 菜单导航逻辑 */}
  selectMenu() {/* 菜单选择逻辑 */}
  backToMainMenu() {/* 返回主菜单 */}
  handleMenuAction(action) {/* 处理菜单操作 */}

  //===== 原有界面渲染方法保持不变 =====//
  renderMainInterface() {/*...*/}
  renderHeader() {/*...*/}
  renderCommunityCards() {/*...*/}
  renderPlayers() {/*...*/}
  getPlayerAvatar(index) {/*...*/}
  renderPlayerCards(player) {/*...*/}
  renderActionMenu() {/*...*/}
  getActionType(text) {/*...*/}
  getActionDetail(action) {/*...*/}
  renderStatusBar() {/*...*/}
  isPlayerTurn() {/*...*/}
}

//===== 初始化示例 ====//
// 在index.html中通过window.onload调用，不要在此直接调用