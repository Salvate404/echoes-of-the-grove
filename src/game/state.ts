import type { GamePhase, InventoryItem, PlayerStats, Quest } from './types';

export class GameState {
  phase: GamePhase = 'title';
  stats: PlayerStats = {
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    damage: 12,
    speed: 130,
  };

  inventory: InventoryItem[] = [
    { id: 'sword', name: 'Espada enferrujada', count: 1 },
  ];

  quests: Quest[] = [
    {
      id: 'main',
      title: 'Purificar a Pedra-Coração',
      description: 'Derrote o Guardião nas ruínas e purifique a Pedra-Coração.',
      completed: false,
    },
    {
      id: 'herbs',
      title: 'Ervas curativas',
      description: 'Colete 3 ervas da clareira para a curandeira.',
      completed: false,
      progress: 0,
      target: 3,
    },
    {
      id: 'wolves',
      title: 'Lobos da clareira',
      description: 'Elimine 3 lobos corrompidos.',
      completed: false,
      progress: 0,
      target: 3,
    },
  ];

  mainQuestStarted = false;
  heartstonePurified = false;
  herbQuestStarted = false;
  wolfQuestStarted = false;
  healthUpgrade = false;
  weaponUpgrade = false;
  bossDefeated = false;

  getQuest(id: string): Quest | undefined {
    return this.quests.find((q) => q.id === id);
  }

  startMainQuest(): void {
    this.mainQuestStarted = true;
  }

  collectHerb(): void {
    const q = this.getQuest('herbs');
    if (!q || q.completed) return;
    q.progress = (q.progress ?? 0) + 1;
    const item = this.inventory.find((i) => i.id === 'herb');
    if (item) item.count++;
    else this.inventory.push({ id: 'herb', name: 'Erva curativa', count: 1 });
    if ((q.progress ?? 0) >= (q.target ?? 3)) {
      q.completed = true;
      if (!this.healthUpgrade) {
        this.healthUpgrade = true;
        this.stats.maxHp += 30;
        this.stats.hp = this.stats.maxHp;
      }
    }
  }

  killWolf(): void {
    const q = this.getQuest('wolves');
    if (!q || q.completed) return;
    q.progress = (q.progress ?? 0) + 1;
    if ((q.progress ?? 0) >= (q.target ?? 3)) {
      q.completed = true;
      if (!this.weaponUpgrade) {
        this.weaponUpgrade = true;
        this.stats.damage += 10;
        const sword = this.inventory.find((i) => i.id === 'sword');
        if (sword) sword.name = 'Espada abençoada';
      }
    }
  }

  completeMainQuest(): void {
    const q = this.getQuest('main');
    if (q) q.completed = true;
    this.heartstonePurified = true;
    this.phase = 'victory';
  }

  takeDamage(amount: number): boolean {
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    return this.stats.hp <= 0;
  }

  useStamina(amount: number): boolean {
    if (this.stats.stamina < amount) return false;
    this.stats.stamina -= amount;
    return true;
  }

  regenStamina(dt: number): void {
    this.stats.stamina = Math.min(
      this.stats.maxStamina,
      this.stats.stamina + 25 * dt
    );
  }

  reset(): void {
    this.phase = 'title';
    this.stats = {
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      damage: 12,
      speed: 130,
    };
    this.inventory = [{ id: 'sword', name: 'Espada enferrujada', count: 1 }];
    this.quests.forEach((q) => {
      q.completed = false;
      q.progress = 0;
    });
    this.mainQuestStarted = false;
    this.heartstonePurified = false;
    this.herbQuestStarted = false;
    this.wolfQuestStarted = false;
    this.healthUpgrade = false;
    this.weaponUpgrade = false;
    this.bossDefeated = false;
  }
}
