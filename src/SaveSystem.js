const SAVE_VERSION = 1;
const CASH_LIMIT = 10000000;
const REP_LIMIT = 1000000;
const STATUSES = new Set(['available', 'active', 'completed']);

export class SaveSystem {
  constructor(playerId = null) {
    this.key = `lagos-legends-save-v${SAVE_VERSION}:${Number.isSafeInteger(playerId) ? playerId : 'guest'}`;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || value.version !== SAVE_VERSION || typeof value !== 'object') return null;
      return {
        cash: validInt(value.cash, 0, CASH_LIMIT) ? value.cash : 0,
        reputation: validInt(value.reputation, 0, REP_LIMIT) ? value.reputation : 0,
        mission: {
          completedIds: Array.isArray(value.mission?.completedIds) ? value.mission.completedIds.filter(id => typeof id === 'string') : [],
          activeMissionId: typeof value.mission?.activeMissionId === 'string' ? value.mission.activeMissionId : null,
          status: STATUSES.has(value.mission?.status) ? value.mission.status : 'available',
          rewardGranted: value.mission?.rewardGranted === true,
          remainingSeconds: validTimer(value.mission?.remainingSeconds) ? value.mission.remainingSeconds : null,
        },
        wardrobe: value.wardrobe && typeof value.wardrobe === 'object' ? value.wardrobe : {},
      };
    } catch {
      return null;
    }
  }

  save(state) {
    const safe = {
      version: SAVE_VERSION,
      cash: validInt(state.cash, 0, CASH_LIMIT) ? state.cash : 0,
      reputation: validInt(state.reputation, 0, REP_LIMIT) ? state.reputation : 0,
      mission: {
        completedIds: Array.isArray(state.mission?.completedIds) ? state.mission.completedIds.filter(id => typeof id === 'string') : [],
        activeMissionId: typeof state.mission?.activeMissionId === 'string' ? state.mission.activeMissionId : null,
        status: STATUSES.has(state.mission?.status) ? state.mission.status : 'available',
        rewardGranted: state.mission?.rewardGranted === true,
        remainingSeconds: validTimer(state.mission?.remainingSeconds) ? state.mission.remainingSeconds : null,
      },
      wardrobe: {
        owned: Array.isArray(state.wardrobe?.owned) ? state.wardrobe.owned : [],
        equipped: state.wardrobe?.equipped && typeof state.wardrobe.equipped === 'object' ? state.wardrobe.equipped : {},
      },
    };
    try { localStorage.setItem(this.key, JSON.stringify(safe)); return true; }
    catch { return false; }
  }

  reset() {
    try { localStorage.removeItem(this.key); return true; }
    catch { return false; }
  }
}

function validInt(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function validTimer(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 3600;
}
