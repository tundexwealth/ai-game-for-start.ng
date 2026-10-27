import * as THREE from 'three';
import './style.css';
import { MISSION_CHAIN, MissionSystem } from './MissionSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { WARDROBE_ITEMS, WardrobeSystem } from './WardrobeSystem.js';
import { createPlayer, createWorld } from './world.js';
import { getStartNgPlayer, signinUrl } from './startng.js';

const mount = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
mount.append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, .1, 180);
const world = createWorld(scene);
const clock = new THREE.Clock();
let player = await getStartNgPlayer();
let saveSystem = new SaveSystem(player.id);
let saved = saveSystem.load() || {};
let economy = { cash: saved.cash || 0, reputation: saved.reputation || 0 };
let mission = new MissionSystem(MISSION_CHAIN, saved.mission);
let wardrobe = new WardrobeSystem(saved.wardrobe);
let playerModel = createPlayer(player.style, wardrobe.equipped);
scene.add(playerModel);
updateMissionWorld();

const name = document.querySelector('#player-name');
const account = document.querySelector('#player-account');
const avatar = document.querySelector('#avatar');
const cashLabel = document.querySelector('#cash');
const repLabel = document.querySelector('#reputation');
const prompt = document.querySelector('#interact-prompt');
const toast = document.querySelector('#toast');
const mapCanvas = document.querySelector('#minimap');
const mapContext = mapCanvas.getContext('2d');
const expandedMapCanvas = document.querySelector('#expanded-map');
const expandedMapContext = expandedMapCanvas.getContext('2d');
const mapOverlay = document.querySelector('#map-overlay');
const mapExpandButton = document.querySelector('#map-expand');
const expandedMapTarget = document.querySelector('#expanded-map-target');
const questTitle = document.querySelector('#quest-title');
const questObjective = document.querySelector('#quest-objective');
const questTimer = document.querySelector('#quest-timer');
const lifeIcons = document.querySelector('#life-icons');
const gameOverScreen = document.querySelector('#game-over-screen');
const missionFailedScreen = document.querySelector('#mission-failed-screen');
const missionFailedMessage = document.querySelector('#mission-failed-message');
const signinTop = document.querySelector('#signin-top');
const wardrobeModal = document.querySelector('#wardrobe-modal');
const wardrobeItems = document.querySelector('#wardrobe-items');
const wardrobeCash = document.querySelector('#wardrobe-cash');
const signinUrlValue = signinUrl();
const CAR_INTERACTION_RANGE = 4.8;
const MISSION_GIVER_RANGE = 3.2;
const state = { x: -10.4, z: 27, yaw: 0, cameraYaw: 0, cameraPitch: .48, vehicleYaw: 0, vehicle: null, active: false, menuOpen: false, keys: new Set(), pointer: null, moving: false, inVehicle: false, vehicleSpeed: 0, lives: 3, hitCooldown: 0 };

function updateLives() {
  lifeIcons.innerHTML = Array.from({ length: 3 }, (_, index) => `<span aria-hidden="true">${index < state.lives ? '♥' : '♡'}</span>`).join(' ');
  lifeIcons.setAttribute('aria-label', `${state.lives} of 3 lives`);
  lifeIcons.dataset.lives = String(state.lives);
}
function checkPlayerTrafficHit(dt) {
  state.hitCooldown = Math.max(0, state.hitCooldown - dt);
  if (!state.active || state.menuOpen || state.inVehicle || state.hitCooldown > 0) return;
  const hit = world.trafficCars.find(({ vehicle, active }) => active &&
    Math.abs(state.x - vehicle.position.x) < 1.35 && Math.abs(state.z - vehicle.position.z) < 2.15,
  );
  if (!hit) return;
  state.lives -= 1;
  state.hitCooldown = 1.4;
  const dx = state.x - hit.vehicle.position.x;
  const dz = state.z - hit.vehicle.position.z;
  const distance = Math.hypot(dx, dz) || 1;
  const knockX = state.x + dx / distance * 1.15;
  const knockZ = state.z + dz / distance * 1.15;
  if (!blocked(knockX, knockZ)) { state.x = knockX; state.z = knockZ; }
  playerModel.position.set(state.x, 0, state.z);
  if (state.lives <= 0) {
    startFreshRun();
    state.menuOpen = true;
    gameOverScreen.hidden = false;
    hud.hidden = false;
    document.querySelector('#game-over-start').focus();
  } else {
    showToast(`Traffic hit! ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left.`);
  }
  updateLives();
}

function updateProfile() {
  name.textContent = player.name;
  account.textContent = player.account ? `@${player.account}` : (player.id ? 'start.ng explorer' : 'Guest explorer');
  avatar.textContent = player.name.slice(0, 1).toUpperCase();
  avatar.style.background = player.style.primaryColor;
  signinTop.hidden = Boolean(player.id);
  signinTop.href = signinUrlValue;
  document.querySelector('#signin-link').href = signinUrlValue;
}
function updateStats() {
  cashLabel.textContent = `₦${economy.cash}`;
  repLabel.textContent = String(economy.reputation);
  wardrobeCash.textContent = `₦${economy.cash}`;
}
function updateMissionCard() {
  updateMissionTimer();
  if (mission.status === 'completed') {
    questTitle.textContent = 'Marina Quarter helped';
    questObjective.textContent = 'You completed all four deliveries. More stories are on the way.';
  } else if (mission.status === 'available') {
    questTitle.textContent = `Meet ${mission.definition.giver.name}`;
    questObjective.textContent = mission.index === 0
      ? 'Find Wale at the orange market stall and press E.'
      : `Find ${mission.definition.giver.name} and press E to take the next job.`;
  } else {
    questTitle.textContent = mission.definition.title;
    questObjective.textContent = `${mission.definition.objective}${mission.definition.requiresVehicle ? ' A car is required.' : ''} Follow the gold marker.`;
  }
}
function updateMissionTimer() {
  const timed = mission.status === 'active' && mission.remainingSeconds !== null;
  questTimer.hidden = !timed;
  questTimer.classList.toggle('urgent', timed && mission.remainingSeconds <= 10);
  if (timed) {
    const total = Math.ceil(mission.remainingSeconds);
    questTimer.textContent = `TIME LEFT · ${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
}
function updateMissionWorld() {
  const giverId = mission.definition.giver.id;
  for (const [id, person] of Object.entries(world.missionPeople)) {
    person.marker.visible = mission.status === 'available' && id === giverId;
  }
  world.destinationMarker.visible = mission.status === 'active';
  if (mission.status === 'active') {
    const { x, z } = mission.definition.destination;
    world.destinationMarker.position.set(x, .1, z);
  }
}
function persistProgress() {
  saveSystem.save({ cash: economy.cash, reputation: economy.reputation, mission: mission.getSnapshot(), wardrobe: wardrobe.getSnapshot() });
}
function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3600);
}
function disposeCharacter(model) {
  model.traverse(object => {
    if (!object.isMesh) return;
    if (!object.userData.sharedGeometry) object.geometry.dispose();
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
    else object.material.dispose();
  });
}
function rebuildPlayerModel() {
  const nextModel = createPlayer(player.style, wardrobe.equipped);
  nextModel.position.copy(playerModel.position);
  nextModel.rotation.copy(playerModel.rotation);
  scene.remove(playerModel);
  disposeCharacter(playerModel);
  playerModel = nextModel;
  scene.add(playerModel);
}
function startFreshRun() {
  saveSystem.reset();
  economy = { cash: 0, reputation: 0 };
  mission = new MissionSystem(MISSION_CHAIN);
  wardrobe = new WardrobeSystem();
  state.x = -10.4; state.z = 27; state.lives = 3; state.hitCooldown = 1.4;
  state.inVehicle = false; state.vehicle = null; state.vehicleSpeed = 0; state.moving = false; state.keys.clear();
  playerModel.visible = true;
  playerModel.position.set(state.x, 0, state.z);
  world.vehicle.position.set(-12.8, 0, 27);
  world.vehicle.rotation.set(0, 0, 0);
  for (const wheel of world.vehicle.userData.wheels) wheel.rotation.x = 0;
  for (const wheel of world.vehicle.userData.frontWheels) wheel.rotation.y = 0;
  updateMissionWorld(); updateStats(); updateMissionCard(); updateLives(); renderWardrobe(); rebuildPlayerModel();
  persistProgress();
}
function restoreSavedProgress() {
  saved = saveSystem.load() || {};
  economy = { cash: saved.cash || 0, reputation: saved.reputation || 0 };
  mission = new MissionSystem(MISSION_CHAIN, saved.mission);
  wardrobe = new WardrobeSystem(saved.wardrobe);
  updateMissionWorld();
  updateStats();
  updateMissionCard();
}
function renderWardrobe() {
  wardrobeCash.textContent = `₦${economy.cash}`;
  wardrobeItems.innerHTML = WARDROBE_ITEMS.map(item => {
    const owned = wardrobe.owned.has(item.id);
    const equipped = wardrobe.equipped[item.category] === item.id;
    const label = item.category === 'top' ? 'Top' : item.category === 'shoes' ? 'Shoes' : 'Accessory';
    const buttonText = equipped ? 'Wearing' : owned ? 'Wear this' : `Buy · ₦${item.price}`;
    const disabled = equipped || (!owned && economy.cash < item.price);
    const action = owned ? 'equip' : 'buy';
    return `<article class="wardrobe-item"><small>${label}${item.starter ? ' · starter' : ''}</small><strong>${item.name}</strong><button type="button" data-action="${action}" data-item="${item.id}" ${disabled ? 'disabled' : ''}>${buttonText}</button></article>`;
  }).join('');
}
function openWardrobe() {
  state.menuOpen = true;
  state.keys.clear();
  renderWardrobe();
  wardrobeModal.hidden = false;
  document.querySelector('#close-wardrobe').focus();
}
function closeWardrobe() {
  wardrobeModal.hidden = true;
  state.menuOpen = false;
  state.keys.clear();
}
function updateExpandedMapTarget() {
  if (mission.status === 'active') expandedMapTarget.textContent = `DESTINATION · ${mission.definition.destination.name}`;
  else if (mission.status === 'available') expandedMapTarget.textContent = `NEXT CONTACT · ${mission.definition.giver.name}`;
  else expandedMapTarget.textContent = 'All deliveries complete';
}
function openExpandedMap() {
  if (!state.active || !mapOverlay.hidden) return;
  state.menuOpen = true;
  state.keys.clear();
  stopLook();
  mapOverlay.hidden = false;
  mapExpandButton.setAttribute('aria-expanded', 'true');
  updateExpandedMapTarget();
  renderMinimap();
  document.querySelector('#close-map').focus();
}
function closeExpandedMap() {
  if (mapOverlay.hidden) return;
  mapOverlay.hidden = true;
  mapExpandButton.setAttribute('aria-expanded', 'false');
  state.menuOpen = false;
  state.keys.clear();
  mapExpandButton.focus();
}
function resetProgress() {
  if (!window.confirm('Reset your cash, reputation, mission, and wardrobe progress?')) return;
  startFreshRun();
  showToast('Your local progress has been reset.');
}
updateProfile();
updateStats();
updateMissionCard();
updateLives();

const startButton = document.querySelector('#start-button');
const intro = document.querySelector('#intro');
const hud = document.querySelector('#hud');
startButton.addEventListener('click', () => { state.active = true; intro.hidden = true; hud.hidden = false; startButton.blur(); });
document.querySelector('#close-wardrobe').addEventListener('click', closeWardrobe);
mapExpandButton.addEventListener('click', openExpandedMap);
document.querySelector('#close-map').addEventListener('click', closeExpandedMap);
document.querySelector('#reset-save').addEventListener('click', resetProgress);
document.querySelector('#game-over-start').addEventListener('click', () => {
  gameOverScreen.hidden = true;
  state.menuOpen = false; state.active = true; state.keys.clear();
});
document.querySelector('#mission-failed-continue').addEventListener('click', () => {
  missionFailedScreen.hidden = true;
  state.menuOpen = false; state.keys.clear();
});
wardrobeItems.addEventListener('click', event => {
  const button = event.target.closest('button[data-item]');
  if (!button || button.disabled) return;
  if (button.dataset.action === 'buy') {
    const result = wardrobe.purchase(button.dataset.item, economy.cash);
    if (!result.ok) return;
    economy.cash = result.balance;
    updateStats(); rebuildPlayerModel(); persistProgress(); renderWardrobe();
    showToast(`${result.item.name} is yours. Your character is wearing it.`);
  } else if (button.dataset.action === 'equip' && wardrobe.equip(button.dataset.item)) {
    rebuildPlayerModel(); persistProgress(); renderWardrobe();
    const item = WARDROBE_ITEMS.find(entry => entry.id === button.dataset.item);
    showToast(`${item.name} equipped.`);
  }
});

function interact() {
  const giver = mission.definition.giver;
  const giverDistance = Math.hypot(state.x - giver.x, state.z - giver.z);
  const delivery = mission.definition.destination;
  const destinationDistance = Math.hypot(state.x - delivery.x, state.z - delivery.z);
  const shopDistance = Math.hypot(state.x - world.shop.position.x, state.z - world.shop.position.z);
  if (state.inVehicle) {
    if (mission.status === 'active' && mission.definition.requiresVehicle && destinationDistance < 4.2) {
      const result = mission.interactAt('destination', { inVehicle: true });
      if (result.type === 'completed') completeMission(result);
      return;
    }
    const exitOffsets = [
      [-Math.sin(state.vehicleYaw) * 2.85, Math.cos(state.vehicleYaw) * 2.85],
      [Math.cos(state.vehicleYaw) * 1.8, -Math.sin(state.vehicleYaw) * 1.8],
      [-Math.cos(state.vehicleYaw) * 1.8, Math.sin(state.vehicleYaw) * 1.8],
    ];
    const exit = exitOffsets.map(([dx, dz]) => [state.x + dx, state.z + dz]).find(([x, z]) => !blocked(x, z));
    if (!exit) { showToast('There is no room to get out here.'); return; }
    state.inVehicle = false;
    state.vehicleSpeed = 0;
    [state.x, state.z] = exit;
    for (const wheel of state.vehicle.userData.frontWheels) wheel.rotation.y = 0;
    state.vehicle = null;
    playerModel.visible = true;
    showToast('You stepped out of the car.');
    return;
  }
  if (mission.status === 'available' && giverDistance < MISSION_GIVER_RANGE) {
    const result = mission.interactAt('giver');
    if (result.type === 'accepted') {
      updateMissionWorld();
      updateMissionCard(); persistProgress();
      showToast(result.mission.acceptedMessage);
    }
  } else if (mission.status === 'active' && destinationDistance < 2.5) {
    const result = mission.interactAt('destination', { inVehicle: false });
    if (result.type === 'vehicle-required') {
      showToast('This delivery needs to be completed from a car.');
    } else if (result.type === 'completed') completeMission(result);
  } else {
    const nearestCar = world.vehicles.map(vehicle => ({ vehicle, distance: Math.hypot(state.x - vehicle.position.x, state.z - vehicle.position.z) })).sort((a, b) => a.distance - b.distance)[0];
    if (nearestCar?.distance < CAR_INTERACTION_RANGE) {
      state.inVehicle = true;
      state.vehicle = nearestCar.vehicle;
      state.x = state.vehicle.position.x; state.z = state.vehicle.position.z;
      state.vehicleYaw = state.vehicle.rotation.y;
      playerModel.visible = false;
      showToast('You got in. Use W/S to drive and A/D or ←/→ to steer. Press E to exit.');
    } else if (shopDistance < 2.8) openWardrobe();
  }
}
function completeMission(result) {
  economy.cash += result.mission.rewards.cash;
  economy.reputation += result.mission.rewards.reputation;
  updateMissionWorld();
  updateStats(); updateMissionCard(); persistProgress();
  showToast(`Mission complete · +₦${result.mission.rewards.cash} · +${result.mission.rewards.reputation} rep`);
}
function updateInteractionHint() {
  if (!state.active || state.menuOpen) { prompt.hidden = true; return; }
  const giver = mission.definition.giver;
  const nearGiver = mission.status === 'available' && Math.hypot(state.x - giver.x, state.z - giver.z) < MISSION_GIVER_RANGE;
  const destination = mission.definition.destination;
  const destinationDistance = Math.hypot(state.x - destination.x, state.z - destination.z);
  const nearDestination = mission.status === 'active' && destinationDistance < (state.inVehicle ? 4.2 : 2.5);
  const nearShop = Math.hypot(state.x - world.shop.position.x, state.z - world.shop.position.z) < 2.8;
  const nearCar = !state.inVehicle && world.vehicles.some(vehicle => Math.hypot(state.x - vehicle.position.x, state.z - vehicle.position.z) < CAR_INTERACTION_RANGE);
  prompt.hidden = !(nearGiver || nearDestination || nearShop || nearCar || state.inVehicle);
  prompt.innerHTML = state.inVehicle
    ? nearDestination && mission.definition.requiresVehicle ? 'Press <kbd>E</kbd> to complete the delivery' : 'Press <kbd>E</kbd> to exit the car'
    : nearGiver ? `Press <kbd>E</kbd> to talk to ${giver.name}`
      : nearCar ? 'Press <kbd>E</kbd> to enter a car'
        : nearDestination && mission.definition.requiresVehicle ? 'This delivery requires a car'
          : nearDestination ? `Press <kbd>E</kbd> to deliver to ${destination.name}`
            : 'Press <kbd>E</kbd> to browse the wardrobe';
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (key === 'escape' && !mapOverlay.hidden) { closeExpandedMap(); return; }
  if (key === 'escape' && !wardrobeModal.hidden) { closeWardrobe(); return; }
  if (!state.active || state.menuOpen || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(key)) {
    event.preventDefault();
    if (key === 'e' && !event.repeat) interact();
    else state.keys.add(key);
  }
});
window.addEventListener('keyup', event => state.keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => state.keys.clear());
renderer.domElement.addEventListener('pointerdown', event => {
  if (!state.active || state.menuOpen || event.button !== 0) return;
  state.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  renderer.domElement.classList.add('looking');
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', event => {
  if (!state.pointer || event.pointerId !== state.pointer.id) return;
  state.cameraYaw -= (event.clientX - state.pointer.x) * .006;
  state.cameraPitch = THREE.MathUtils.clamp(state.cameraPitch + (event.clientY - state.pointer.y) * .004, .05, 1.18);
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
});
const stopLook = () => { state.pointer = null; renderer.domElement.classList.remove('looking'); };
renderer.domElement.addEventListener('pointerup', stopLook);
renderer.domElement.addEventListener('pointercancel', stopLook);

let identitySyncInProgress = false;
async function refreshStartNgIdentity() {
  if (identitySyncInProgress || !location.hostname.endsWith('.start.ng') || document.visibilityState !== 'visible') return;
  identitySyncInProgress = true;
  try {
    const nextPlayer = await getStartNgPlayer();
    const changed = nextPlayer.id !== player.id || nextPlayer.name !== player.name || JSON.stringify(nextPlayer.style) !== JSON.stringify(player.style);
    if (!changed) return;
    player = nextPlayer;
    saveSystem = new SaveSystem(player.id);
    restoreSavedProgress();
    updateProfile(); rebuildPlayerModel(); renderWardrobe();
  } finally {
    identitySyncInProgress = false;
  }
}
window.addEventListener('focus', refreshStartNgIdentity);
document.addEventListener('visibilitychange', refreshStartNgIdentity);
document.querySelector('#share-button').addEventListener('click', () => {
  const text = `Come explore Lagos Legends: Street Quest with me!`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});

function blocked(x, z, vehicle = false) {
  const radius = vehicle ? 1.25 : .38;
  if (x < -34 + radius || x > 34 - radius || z < -39 + radius || z > 39 - radius) return true;
  for (const parkedCar of world.vehicles) {
    if (parkedCar === state.vehicle) continue;
    if (Math.abs(x - parkedCar.position.x) < 1.15 + radius && Math.abs(z - parkedCar.position.z) < 2.05 + radius) return true;
  }
  for (const traffic of world.trafficCars) {
    if (!traffic.active) continue;
    const car = traffic.vehicle.position;
    if (Math.abs(x - car.x) < .9 + radius && Math.abs(z - car.z) < 1.8 + radius) return true;
  }
  const people = [
    ...world.pedestrians,
    ...Object.values(world.missionPeople).map(person => ({ position: person.position || person.giver })),
    { position: world.shop.position },
  ];
  if (people.some(person => Math.hypot(x - person.position.x, z - person.position.z) < (vehicle ? 1.15 : .68))) return true;
  return world.colliders.some(c => Math.abs(x-c.x) < c.w/2 + radius && Math.abs(z-c.z) < c.d/2 + radius);
}

function drawObjectiveMarker(ctx, x, y, scale) {
  ctx.save();
  ctx.shadowColor = '#f3215b'; ctx.shadowBlur = 8 * scale;
  ctx.beginPath(); ctx.arc(x, y, 7 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(x, y, 5.2 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#f3215b'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8 * scale; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 1.5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
}
function renderMinimap() {
  drawMap(mapCanvas, mapContext);
  if (!mapOverlay.hidden) drawMap(expandedMapCanvas, expandedMapContext);
}
function drawMap(canvas, ctx) {
  const width = canvas.width; const height = canvas.height;
  const scale = width / 180;
  const pad = 9 * scale; const mapWidth = width - pad * 2; const mapHeight = height - pad * 2;
  const point = (x, z) => [pad + (x + 34) / 68 * mapWidth, pad + (z + 39) / 78 * mapHeight];
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#b6c5a9'; ctx.fillRect(0, 0, width, height);
  const roadLeft = point(-9, -39)[0]; const roadRight = point(9, -39)[0];
  ctx.fillStyle = '#d4c49b';
  ctx.fillRect(point(-15, -39)[0], pad, roadLeft - point(-15, -39)[0], mapHeight);
  ctx.fillRect(roadRight, pad, point(15, -39)[0] - roadRight, mapHeight);
  ctx.fillStyle = '#5f7774'; ctx.fillRect(roadLeft, pad, roadRight - roadLeft, mapHeight);
  ctx.strokeStyle = '#e4c267'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]);
  ctx.beginPath(); ctx.moveTo((roadLeft + roadRight) / 2, pad); ctx.lineTo((roadLeft + roadRight) / 2, height - pad); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#857c68';
  for (const collider of world.colliders) {
    const [x, y] = point(collider.x, collider.z);
    ctx.fillRect(x - collider.w / 2 / 68 * mapWidth, y - collider.d / 2 / 78 * mapHeight, collider.w / 68 * mapWidth, collider.d / 78 * mapHeight);
  }
  for (const person of world.pedestrians) {
    const [x, y] = point(person.position.x, person.position.z);
    ctx.fillStyle = '#f2e6d0'; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  }
  for (const traffic of world.trafficCars) {
    if (!traffic.active) continue;
    const [x, y] = point(traffic.vehicle.position.x, traffic.vehicle.position.z);
    ctx.fillStyle = '#80b4ad'; ctx.fillRect(x - 2.2, y - 3.2, 4.4, 6.4);
  }
  for (const [index, car] of world.vehicles.entries()) {
    const [x, y] = point(car.position.x, car.position.z);
    ctx.fillStyle = car.userData.mapColor || (index === 0 ? '#d87943' : '#3f7f7a'); ctx.fillRect(x - 3.2, y - 4.5, 6.4, 9);
  }
  if (mission.status === 'available') {
    const [x, y] = point(mission.definition.giver.x, mission.definition.giver.z);
    drawObjectiveMarker(ctx, x, y, scale);
  }
  if (mission.status === 'active') {
    const [x, y] = point(mission.definition.destination.x, mission.definition.destination.z);
    drawObjectiveMarker(ctx, x, y, scale);
  }
  const [playerX, playerY] = point(state.x, state.z);
  const heading = state.inVehicle ? state.vehicleYaw + Math.PI : playerModel.rotation.y;
  ctx.save(); ctx.translate(playerX, playerY); ctx.rotate(heading);
  ctx.fillStyle = '#f08a4c'; ctx.strokeStyle = '#fff7e8'; ctx.lineWidth = 1.5 * scale;
  ctx.beginPath(); ctx.moveTo(0, 6 * scale); ctx.lineTo(-4.5 * scale, -4 * scale); ctx.lineTo(0, -2.5 * scale); ctx.lineTo(4.5 * scale, -4 * scale); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}

const cameraTarget = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .04);
  if (state.active && !state.menuOpen) {
    const timerEvent = mission.tick(dt);
    if (timerEvent?.type === 'expired') {
      updateMissionWorld(); updateMissionCard(); persistProgress();
      missionFailedMessage.textContent = `You ran out of time on “${timerEvent.mission.title}.” Your progress is safe. Find ${timerEvent.mission.giver.name} to retry.`;
      state.menuOpen = true; state.keys.clear();
      missionFailedScreen.hidden = false;
      document.querySelector('#mission-failed-continue').focus();
    } else if (timerEvent?.type === 'tick') {
      updateMissionTimer(); persistProgress();
    }
  }
  world.updateTraffic(dt, clock.elapsedTime, state.active && !state.menuOpen);
  checkPlayerTrafficHit(dt);
  const forward = Number(state.keys.has('w') || state.keys.has('arrowup')) - Number(state.keys.has('s') || state.keys.has('arrowdown'));
  const steer = Number(state.keys.has('d') || state.keys.has('arrowright')) - Number(state.keys.has('a') || state.keys.has('arrowleft'));
  const strafe = state.inVehicle ? 0 : steer;
  const length = Math.hypot(forward, strafe);
  state.moving = state.active && !state.menuOpen && length > 0;
  if (state.active && !state.menuOpen && state.inVehicle) {
    const previousSpeed = state.vehicleSpeed;
    if (forward) {
      const changingDirection = Math.abs(previousSpeed) > .05 && Math.sign(forward) !== Math.sign(previousSpeed);
      state.vehicleSpeed += forward * (changingDirection ? 6.5 : 3.2) * dt;
      if (changingDirection && Math.sign(state.vehicleSpeed) !== Math.sign(previousSpeed)) state.vehicleSpeed = 0;
    } else {
      state.vehicleSpeed *= Math.exp(-.28 * dt);
      if (Math.abs(state.vehicleSpeed) < .04) state.vehicleSpeed = 0;
    }
    state.vehicleSpeed = THREE.MathUtils.clamp(state.vehicleSpeed, -3.8, 7.8);
    const steeringAngle = steer * (.5 / (1 + Math.abs(state.vehicleSpeed) * .18));
    for (const wheel of state.vehicle.userData.frontWheels) wheel.rotation.y = -steeringAngle;
    const turnRate = Math.abs(state.vehicleSpeed) > .08 ? -state.vehicleSpeed / 2.8 * Math.tan(steeringAngle) : 0;
    const nextYaw = state.vehicleYaw + turnRate * dt;
    const travelYaw = state.vehicleYaw + turnRate * dt * .5;
    const dx = -Math.sin(travelYaw) * state.vehicleSpeed * dt;
    const dz = -Math.cos(travelYaw) * state.vehicleSpeed * dt;
    if (!blocked(state.x + dx, state.z + dz, true)) {
      state.x += dx; state.z += dz; state.vehicleYaw = nextYaw;
      state.vehicle.position.set(state.x, 0, state.z);
      state.vehicle.rotation.y = state.vehicleYaw;
      for (const wheel of state.vehicle.userData.wheels) wheel.rotation.x -= state.vehicleSpeed * dt / .32;
    } else state.vehicleSpeed = 0;
  } else if (state.moving) {
    const speed = 3.25 * dt / length;
    const dx = (-Math.sin(state.cameraYaw) * forward + Math.cos(state.cameraYaw) * strafe) * speed;
    const dz = (-Math.cos(state.cameraYaw) * forward - Math.sin(state.cameraYaw) * strafe) * speed;
    if (!blocked(state.x + dx, state.z)) state.x += dx;
    if (!blocked(state.x, state.z + dz)) state.z += dz;
    if (dx || dz) playerModel.rotation.y = Math.atan2(dx, dz);
  }
  const walk = clock.elapsedTime * 8.4;
  playerModel.userData.legs.forEach((leg, i) => { leg.rotation.x = state.moving ? Math.sin(walk + i * Math.PI) * .58 : 0; });
  playerModel.userData.arms.forEach((arm, i) => { arm.rotation.x = state.moving ? Math.sin(walk + (i === 0 ? Math.PI : 0)) * .32 : 0; });
  if (!state.inVehicle) playerModel.position.set(state.x, state.moving ? Math.abs(Math.sin(walk * 2)) * .025 : 0, state.z);
  for (const person of Object.values(world.missionPeople)) person.marker.position.y = 2.75 + Math.sin(clock.elapsedTime * 2.2) * .12;
  world.shop.marker.position.y = 2.7 + Math.sin(clock.elapsedTime * 1.8 + .7) * .1;
  updateInteractionHint();
  renderMinimap();
  cameraTarget.set(state.x, state.inVehicle ? 1.05 : 1.35, state.z);
  const viewDistance = state.inVehicle ? 10 : 8.3;
  const horizontalDistance = Math.cos(state.cameraPitch) * viewDistance;
  desiredCamera.set(
    state.x + Math.sin(state.cameraYaw) * horizontalDistance,
    cameraTarget.y + Math.sin(state.cameraPitch) * viewDistance,
    state.z + Math.cos(state.cameraYaw) * horizontalDistance,
  );
  camera.position.lerp(desiredCamera, 1 - Math.exp(-5 * dt));
  camera.lookAt(cameraTarget);
  renderer.render(scene, camera);
}
function resize() {
  const width = mount.clientWidth || innerWidth; const height = mount.clientHeight || innerHeight;
  renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
loading.hidden = true;
animate();

