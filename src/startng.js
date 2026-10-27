const ORIGIN = 'https://start.ng';
const KNOWN_HAIR = new Set(['short', 'afro', 'braids', 'bun', 'ponytail', 'dreads', 'bald']);
const KNOWN_HATS = new Set(['none', 'cap', 'beanie', 'tophat', 'crown']);
const KNOWN_ACCESSORIES = new Set(['none', 'glasses', 'earrings', 'beard', 'scarf', 'backpack']);
const color = (value, fallback) => /^#[\da-f]{6}$/i.test(value || '') ? value : fallback;

export const guestPlayer = {
  id: null, name: 'Guest', account: null,
  style: { body: 'male', primaryColor: '#e8794f', secondaryColor: '#334f69', skinColor: '#8d5524', hairColor: '#17120f', hair: 'short', hat: 'none', accessory: 'none' },
};

export function normalizePlayer(player) {
  if (!player || typeof player !== 'object') return { ...guestPlayer, style: { ...guestPlayer.style } };
  const style = player.style && typeof player.style === 'object' ? player.style : {};
  return {
    id: Number.isInteger(player.id) ? player.id : null,
    name: typeof player.name === 'string' && player.name.trim() ? player.name.slice(0, 32) : 'Guest',
    account: typeof player.account === 'string' ? player.account.slice(0, 32) : null,
    style: {
      body: style.body === 'female' ? 'female' : 'male',
      primaryColor: color(style.primaryColor, guestPlayer.style.primaryColor),
      secondaryColor: color(style.secondaryColor, guestPlayer.style.secondaryColor),
      skinColor: color(style.skinColor, guestPlayer.style.skinColor),
      hairColor: color(style.hairColor, guestPlayer.style.hairColor),
      hair: KNOWN_HAIR.has(style.hair) ? style.hair : 'short',
      hat: KNOWN_HATS.has(style.hat) ? style.hat : 'none',
      accessory: KNOWN_ACCESSORIES.has(style.accessory) ? style.accessory : 'none',
    },
  };
}

export async function getStartNgPlayer() {
  if (!location.hostname.endsWith('.start.ng') || location.search.includes('guest')) return normalizePlayer(null);
  let frame;
  try {
    frame = document.createElement('iframe');
    frame.src = `${ORIGIN}/connect`;
    frame.hidden = true;
    document.body.append(frame);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('start.ng connection timed out')), 4500);
      frame.onload = () => { clearTimeout(timeout); resolve(); };
      frame.onerror = () => { clearTimeout(timeout); reject(new Error('start.ng connection failed')); };
    });
    return await askIdentity(frame);
  } catch (error) {
    console.info('Using the guest character until start.ng responds.', error.message);
    return normalizePlayer(null);
  } finally {
    frame?.remove();
  }
}

function askIdentity(frame) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('No identity reply')); }, 3500);
    const cleanup = () => { clearTimeout(timeout); window.removeEventListener('message', onMessage); };
    const onMessage = (event) => {
      if (event.origin !== ORIGIN || event.source !== frame.contentWindow) return;
      const data = event.data;
      if (data?.type === 'startng:user') { cleanup(); resolve(normalizePlayer(data.user || data.guest)); }
    };
    window.addEventListener('message', onMessage);
    frame.contentWindow.postMessage({ type: 'startng:whoami' }, ORIGIN);
  });
}

export function signinUrl() {
  const returnTo = `${location.origin}${location.pathname}`;
  return `${ORIGIN}/?return_to=${encodeURIComponent(returnTo)}`;
}
