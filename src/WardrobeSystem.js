export const WARDROBE_ITEMS = Object.freeze([
  { id: 'everyday-tee', name: 'Everyday Tee', category: 'top', price: 0, starter: true, assetRef: 'procedural:base-outfit', silhouette: 'base', color: null },
  { id: 'market-dashiki', name: 'Market Day Dashiki', category: 'top', price: 75, assetRef: 'procedural:dashiki-shell', silhouette: 'dashiki', color: '#d36d4d' },
  { id: 'lagoon-jacket', name: 'Lagoon Track Jacket', category: 'top', price: 110, assetRef: 'procedural:track-jacket', silhouette: 'jacket', color: '#2f7772' },
  { id: 'woven-sneakers', name: 'Woven Street Sneakers', category: 'shoes', price: 45, assetRef: 'procedural:street-sneakers', silhouette: 'sneakers', color: '#e4af4b' },
  { id: 'coastal-backpack', name: 'Coastal Carryall', category: 'accessory', price: 60, assetRef: 'procedural:carryall-backpack', silhouette: 'backpack', color: '#ba7049' },
]);

export class WardrobeSystem {
  constructor(saved = {}) {
    const validIds = new Set(WARDROBE_ITEMS.map(item => item.id));
    this.owned = new Set(Array.isArray(saved.owned) ? saved.owned.filter(id => validIds.has(id)) : ['everyday-tee']);
    this.owned.add('everyday-tee');
    this.equipped = { top: 'everyday-tee', shoes: null, accessory: null };
    for (const category of Object.keys(this.equipped)) {
      const itemId = saved.equipped?.[category];
      const item = WARDROBE_ITEMS.find(entry => entry.id === itemId && entry.category === category);
      if (item && this.owned.has(itemId)) this.equipped[category] = itemId;
    }
  }

  purchase(itemId, cash) {
    const item = WARDROBE_ITEMS.find(entry => entry.id === itemId);
    if (!item) return { ok: false, reason: 'unknown-item' };
    if (this.owned.has(item.id)) return { ok: false, reason: 'already-owned' };
    if (!Number.isSafeInteger(cash) || cash < item.price) return { ok: false, reason: 'not-enough-cash' };
    this.owned.add(item.id);
    this.equipped[item.category] = item.id;
    return { ok: true, item, balance: cash - item.price };
  }

  equip(itemId) {
    const item = WARDROBE_ITEMS.find(entry => entry.id === itemId);
    if (!item || !this.owned.has(item.id)) return false;
    this.equipped[item.category] = item.id;
    return true;
  }

  getSnapshot() {
    return { owned: [...this.owned], equipped: { ...this.equipped } };
  }
}
