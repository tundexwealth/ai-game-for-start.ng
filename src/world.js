import * as THREE from 'three';
import { FIRST_MISSION, FOURTH_MISSION, SECOND_MISSION, THIRD_MISSION } from './MissionSystem.js';
import { WARDROBE_ITEMS } from './WardrobeSystem.js';

const mat = (color, roughness = 0.88) => new THREE.MeshStandardMaterial({ color, roughness });
const materials = {
  road: mat('#5e7775'), pavement: mat('#d9b987'), cream: mat('#f1d3a1'), coral: mat('#df805d'),
  teal: mat('#5d9d91'), yellow: mat('#e9b64d'), blue: mat('#789ab0'), dark: mat('#34454a'), leaf: mat('#4c8064'),
  trunk: mat('#795d45'), white: mat('#f6e9cd'), window: new THREE.MeshStandardMaterial({ color: '#83b7b5', roughness: .25, metalness: .1 }),
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function box(parent, material, x, y, z, sx, sy, sz, cast = false) {
  const mesh = new THREE.Mesh(boxGeo, material);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = cast; mesh.receiveShadow = true; mesh.userData.sharedGeometry = true;
  parent.add(mesh); return mesh;
}
function palm(scene, x, z, scale = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.16 * scale, .25 * scale, 3.8 * scale, 7), materials.trunk);
  trunk.position.set(x, 1.9 * scale, z); trunk.castShadow = true; scene.add(trunk);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(.33 * scale, 2.6 * scale, 5), materials.leaf);
    leaf.position.set(x + Math.sin(i * Math.PI / 3.5) * .82 * scale, 3.7 * scale, z + Math.cos(i * Math.PI / 3.5) * .82 * scale);
    leaf.rotation.z = Math.cos(i * Math.PI / 3.5) * .8; leaf.rotation.x = Math.sin(i * Math.PI / 3.5) * .8; scene.add(leaf);
  }
}
function building(scene, x, z, width, depth, height, color, label, signColor) {
  const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
  box(group, mat(color), 0, height / 2, 0, width, height, depth, true);
  box(group, materials.dark, 0, height + .12, 0, width + .22, .24, depth + .22);
  for (let y = 2.0; y < height - .4; y += 1.65) {
    for (let col = -1; col <= 1; col++) {
      const wx = col * width * .29;
      box(group, materials.window, wx, y, depth / 2 + .012, .72, .86, .04);
      box(group, materials.dark, wx, y, depth / 2 + .04, .055, .93, .04);
    }
  }
  box(group, mat(signColor), 0, 1.65, depth / 2 + .07, width * .84, .55, .12);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff3d5'; ctx.font = 'bold 45px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 256, 49);
  const texture = new THREE.CanvasTexture(canvas); const sign = new THREE.Mesh(new THREE.PlaneGeometry(width * .75, .35), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  sign.position.set(0, 1.65, depth / 2 + .14); group.add(sign);
}
function residence(scene, x, z, width, depth, height, wallColor, roofColor, facingRoad = 'north') {
  const group = new THREE.Group(); group.position.set(x, 0, z);
  if (facingRoad === 'south') group.rotation.y = Math.PI;
  scene.add(group);
  box(group, mat(wallColor), 0, height / 2, 0, width, height, depth, true);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * .76, 2.8, 4), mat(roofColor));
  roof.position.y = height + 1.1; roof.rotation.y = Math.PI / 4; roof.scale.z = depth / width; roof.castShadow = true; group.add(roof);
  const front = depth / 2 + .025;
  box(group, materials.dark, 0, 1.05, front, .95, 2.1, .09);
  box(group, mat('#d9b987'), 0, 1.1, front + .055, .76, 1.9, .045);
  for (const side of [-1, 1]) {
    box(group, materials.window, side * width * .29, 2.1, front + .015, 1.15, .95, .06);
    box(group, mat('#fff0cd'), side * width * .29, 2.1, front + .055, .06, 1.05, .07);
    box(group, mat('#fff0cd'), side * width * .29, 2.1, front + .055, 1.25, .06, .07);
  }
  box(group, mat('#d0ad75'), 0, .12, front + .25, 2.35, .22, .8);
  box(group, mat('#e7c891'), 0, 2.55, front + .18, 2.6, .18, .55);
  return group;
}
function addMissionPerson(scene, position, colors) {
  const { x, z } = position;
  const npc = new THREE.Group(); npc.position.set(x, 0, z); scene.add(npc);
  sphere(npc, mat(colors.top), 0, 1.15, 0, [.36,.45,.24]);
  sphere(npc, mat(colors.skin), 0, 1.79, 0, [.25,.3,.22]);
  sphere(npc, mat(colors.hair), 0, 1.99, -.015, [.26,.13,.23]);
  for (const side of [-1,1]) {
    limb(npc, mat(colors.skin), [side*.29,1.45,0], [side*.34,1.05,.05], .09);
    limb(npc, mat(colors.bottom), [side*.14,.86,0], [side*.14,.22,0], .11);
    sphere(npc, mat('#f3e6ce'), side*.14,.12,.07,[.13,.08,.2]);
  }
  const marker = new THREE.Group(); marker.position.set(x, 2.75, z); scene.add(marker);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 10), mat('#df805d', .35)); marker.add(orb);
  const glyphCanvas = document.createElement('canvas'); glyphCanvas.width = 128; glyphCanvas.height = 128;
  const ctx = glyphCanvas.getContext('2d'); ctx.fillStyle = '#fff4d6'; ctx.font = 'bold 100px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!',64,66);
  const glyph = new THREE.Mesh(new THREE.PlaneGeometry(.2,.28), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glyphCanvas),transparent:true,depthWrite:false})); glyph.position.z=.205; marker.add(glyph);
  return { position: new THREE.Vector3(x,0,z), marker, npc };
}
function addMissionGiver(scene) {
  const person = addMissionPerson(scene, FIRST_MISSION.giver, { skin: '#75472e', hair: '#25211f', top: '#e1aa69', bottom: '#405c65' });
  return { giver: person.position, marker: person.marker, npc: person.npc };
}
function addShopKeeper(scene) {
  const position = new THREE.Vector3(-22, 0, 15.4);
  const npc = new THREE.Group(); npc.position.copy(position); scene.add(npc);
  sphere(npc, mat('#2f7772'), 0, 1.15, 0, [.35,.43,.24]);
  sphere(npc, mat('#8d5524'), 0, 1.79, 0, [.25,.3,.22]);
  sphere(npc, mat('#251d1a'), 0, 1.98, -.01, [.27,.16,.23]);
  for (const side of [-1,1]) {
    limb(npc, mat('#8d5524'), [side*.3,1.45,0], [side*.34,1.05,.05], .09);
    limb(npc, mat('#304b5d'), [side*.15,.86,0], [side*.15,.22,0], .11);
    sphere(npc, mat('#f3e6ce'), side*.15,.12,.07,[.13,.08,.2]);
  }
  const marker = new THREE.Group(); marker.position.set(position.x, 2.7, position.z); scene.add(marker);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.25,.075,6,16),mat('#e9b64d'));
  ring.rotation.x=Math.PI/2; marker.add(ring);
  const labelCanvas=document.createElement('canvas'); labelCanvas.width=128;labelCanvas.height=128;
  const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#fff4d6';ctx.font='bold 72px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('S',64,65);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(.25,.25),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(labelCanvas),transparent:true,depthWrite:false}));label.position.z=.2;marker.add(label);
  return { position, marker };
}
function addDestinationMarker(scene, p = FIRST_MISSION.destination) {
  const marker = new THREE.Group(); marker.position.set(p.x, .1, p.z); scene.add(marker);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.7,.08,6,18),mat('#e9b64d'));
  ring.rotation.x=-Math.PI/2; marker.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.05,.28,2.2,8),new THREE.MeshBasicMaterial({color:'#ffe29b',transparent:true,opacity:.3,depthWrite:false})); beam.position.y=1.4; marker.add(beam);
  marker.visible=false;
  return marker;
}

function makeCar(scene, x, z, color, width = 1.8, depth = 3.5) {
  const vehicle = new THREE.Group(); vehicle.position.set(x, 0, z); scene.add(vehicle);
  vehicle.userData.mapColor = color;
  box(vehicle, mat(color), 0, .72, 0, width, .72, depth, true);
  box(vehicle, mat('#34454a'), 0, 1.2, .18, width * .88, .62, depth * .5);
  box(vehicle, materials.window, 0, 1.23, -.72, width * .75, .4, .06);
  box(vehicle, materials.window, 0, 1.23, depth * .31, width * .75, .4, .06);
  const wheels = []; const frontWheels = [];
  for (const side of [-1, 1]) for (const zOffset of [-depth * .32, depth * .32]) {
    const wheelPivot = new THREE.Group(); wheelPivot.position.set(side * width * .51, .37, zOffset); vehicle.add(wheelPivot);
    const wheelSpin = new THREE.Group(); wheelPivot.add(wheelSpin);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.18,12), materials.dark);
    wheel.rotation.z = Math.PI / 2; wheelSpin.add(wheel); wheels.push(wheelSpin);
    if (zOffset < 0) frontWheels.push(wheelPivot);
  }
  vehicle.userData.wheels = wheels; vehicle.userData.frontWheels = frontWheels;
  return vehicle;
}

function addPedestrian(scene, x, z, topColor, skinColor, direction, pace) {
  const person = new THREE.Group(); person.position.set(x, 0, z); scene.add(person);
  sphere(person, mat(topColor), 0, 1.15, 0, [.3,.43,.21]);
  sphere(person, mat(skinColor), 0, 1.78, 0, [.23,.28,.2]);
  sphere(person, mat('#28211d'), 0, 2.02, -.02, [.25,.13,.23]);
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * .14, .86, 0); person.add(pivot);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.085,.1,.62,7), mat('#415760'));
    leg.position.y = -.31; pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(.18,.1,.28), materials.white); shoe.position.set(0,-.62,.06); pivot.add(shoe);
    return pivot;
  });
  person.userData.legs = legs; person.userData.direction = direction; person.userData.pace = pace;
  person.rotation.y = direction > 0 ? 0 : Math.PI;
  person.userData.walkPhase = 0;
  return person;
}

function addMarketStall(scene, x, z) {
  const stall = new THREE.Group(); stall.position.set(x, 0, z); scene.add(stall);
  box(stall, materials.coral, 0, .88, 0, 2.8, .78, 1.4, true);
  box(stall, materials.yellow, 0, 1.62, 0, 3.2, .18, 1.8, true);
  for (const side of [-1,1]) box(stall, materials.teal, side * 1.42, 1.12, 0, .13, 1.05, 1.7, true);
  return stall;
}

function endArch(scene, z, label, facesSouth = false) {
  const group = new THREE.Group(); group.position.z = z;
  if (facesSouth) group.rotation.y = Math.PI;
  scene.add(group);
  for (const x of [-8.45, 8.45]) {
    box(group, materials.coral, x, 1.25, 0, .65, 2.5, .75, true);
    box(group, materials.cream, x, 2.45, 0, .9, .18, .95);
  }
  box(group, materials.coral, 0, 2.62, 0, 17.3, .5, .75, true);
  box(group, materials.yellow, 0, 2.62, .4, 8.1, .66, .08);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#34454a'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 256, 49);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, .42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
  sign.position.set(0, 2.63, .46); group.add(sign);
}

export function createWorld(scene) {
  scene.background = new THREE.Color('#edbd76');
  scene.fog = new THREE.Fog('#d9c69d', 32, 88);
  scene.add(new THREE.HemisphereLight('#fff2d1', '#56736d', 2.2));
  const sun = new THREE.DirectionalLight('#fff0ce', 2.8); sun.position.set(-12, 24, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -35; sun.shadow.camera.right = 35; sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35; scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), mat('#779f91')); ground.rotation.x = -Math.PI / 2; ground.position.y = -.04; ground.receiveShadow = true; scene.add(ground);
  box(scene, materials.road, 0, .01, 0, 18, .08, 86);
  box(scene, materials.pavement, -12, .04, 0, 6, .14, 86); box(scene, materials.pavement, 12, .04, 0, 6, .14, 86);
  for (let z = -38; z <= 38; z += 8) box(scene, materials.yellow, 0, .065, z, .16, .02, 3.1);
  building(scene, -22, -13, 13, 12, 10, '#dc9570', 'MAMA T’S', '#49796d');
  building(scene, -22, 8, 12, 13, 13, '#edc276', 'TIDE & THREAD', '#c86f51');
  building(scene, 22, -9, 13, 13, 12, '#81aaa2', 'PALM HOUSE', '#bd7952');
  building(scene, 22, 15, 12, 12, 9, '#e8c28d', 'CORNER STORE', '#4b7c73');
  for (const [x,z] of [[-15,-25],[-15,22],[15,-28],[15,29],[-30,1],[30,-20]]) palm(scene,x,z,.85);
  const vehicle = makeCar(scene, -12.8, 27, '#d87943');
  const workshopCar = makeCar(scene, 9.5, -28.3, '#3f7f7a');
  const vehicles = [vehicle, workshopCar];
  box(scene, materials.coral, -14, .65, 4, 1.5, 1.15, 1.2, true); box(scene, materials.yellow, -14, 1.27, 4, 1.8, .12, 1.45);
  for (const [x, z] of [[-14.8, 6], [-12.2, 5.2]]) { const crate = box(scene, materials.teal, x, .35, z, .62, .68, .62, true); crate.rotation.y = .2; }
  const missionGiver = addMissionGiver(scene);
  const mamaT = addMissionPerson(scene, SECOND_MISSION.giver, { skin: '#7b4d32', hair: '#271e1a', top: '#2f7772', bottom: '#384a53' });
  const tailor = addMissionPerson(scene, SECOND_MISSION.destination, { skin: '#895a3c', hair: '#30241f', top: '#536d88', bottom: '#354b55' });
  const depotManager = addMissionPerson(scene, THIRD_MISSION.destination, { skin: '#7a4d31', hair: '#26201c', top: '#cb8957', bottom: '#44515a' });
  const marketVendor = addMissionPerson(scene, FOURTH_MISSION.destination, { skin: '#815434', hair: '#261f1c', top: '#b85643', bottom: '#37545c' });
  addMarketStall(scene, -13, 34.2);
  const trafficCars = [
    { vehicle: makeCar(scene, -3.15, -30, '#e0b343', 1.55, 3.2), direction: 1, speed: 5.1, spawnDelay: .25, phaseZ: -30 },
    { vehicle: makeCar(scene, -3.15, 5, '#c96e52', 1.55, 3.2), direction: 1, speed: 5.1, spawnDelay: 5, phaseZ: 5 },
    { vehicle: makeCar(scene, -5.35, -12, '#668da2', 1.55, 3.2), direction: 1, speed: 3.2, spawnDelay: 1.4, phaseZ: -12 },
    { vehicle: makeCar(scene, -5.35, 23, '#e3c56b', 1.55, 3.2), direction: 1, speed: 3.2, spawnDelay: 6.8, phaseZ: 23 },
    { vehicle: makeCar(scene, 3.15, 28, '#c96e52', 1.55, 3.2), direction: -1, speed: 5.1, spawnDelay: .85, phaseZ: 28 },
    { vehicle: makeCar(scene, 3.15, -7, '#73978d', 1.55, 3.2), direction: -1, speed: 5.1, spawnDelay: 5.6, phaseZ: -7 },
    { vehicle: makeCar(scene, 5.35, 11, '#d4d2bd', 1.55, 3.2), direction: -1, speed: 3.2, spawnDelay: 2.1, phaseZ: 11 },
    { vehicle: makeCar(scene, 5.35, -24, '#d88b52', 1.55, 3.2), direction: -1, speed: 3.2, spawnDelay: 7.5, phaseZ: -24 },
  ];
  for (const traffic of trafficCars) {
    traffic.vehicle.rotation.y = traffic.direction > 0 ? Math.PI : 0;
    traffic.vehicle.visible = false;
    traffic.active = false;
    traffic.vehicle.traverse(object => { if (object.isMesh) object.castShadow = false; });
  }
  const pedestrians = [
    addPedestrian(scene, -11.3, -31, '#a65a42', '#71482f', 1, 1.1),
    addPedestrian(scene, -11.3, -14, '#577d78', '#875532', -1, .95),
    addPedestrian(scene, -11.3, 5, '#cf9d4f', '#68452e', 1, 1.2),
    addPedestrian(scene, -11.3, 23, '#6b7e9a', '#7a4b30', -1, 1.05),
    addPedestrian(scene, 11.3, -23, '#b55d4a', '#805335', 1, .9),
    addPedestrian(scene, 11.3, -3, '#56837a', '#68452e', -1, 1.15),
    addPedestrian(scene, 11.3, 16, '#d0a84f', '#875532', 1, 1.0),
    addPedestrian(scene, 11.3, 31, '#70889a', '#71482f', -1, 1.1),
  ];
  for (const person of pedestrians) person.traverse(object => { if (object.isMesh) object.castShadow = false; });
  const shop = addShopKeeper(scene);
  const destinationMarker = addDestinationMarker(scene);
  building(scene, -18, -31, 9, 9, 6, '#d99a72', 'HARBOUR DEPOT', '#4b7c73');
  building(scene, 22, -31, 10, 9, 6, '#d9b77d', 'ADEBAYO’S', '#a95d47');
  residence(scene, -22, 27, 9, 9, 6, '#8db4a9', '#b6674b');
  residence(scene, 22, 31, 9, 9, 6, '#ddb183', '#5e8375');
  residence(scene, 0, -48, 15, 9, 7, '#e2bb7f', '#b6674b');
  residence(scene, 0, 48, 15, 9, 7, '#88aaa0', '#b6674b', 'south');
  endArch(scene, -39.5, 'MARINA QUARTER');
  endArch(scene, 39.5, 'MARKET STREET', true);
  for (const side of [-1, 1]) {
    box(scene, materials.dark, side * 33.8, .48, 0, .28, .96, 76);
    for (let z = -36; z <= 36; z += 6) box(scene, materials.coral, side * 33.8, .68, z, .42, 1.36, .42);
  }
  function circleHitsBox(x, z, radius, collider) {
    const closestX = THREE.MathUtils.clamp(x, collider.x - collider.w / 2, collider.x + collider.w / 2);
    const closestZ = THREE.MathUtils.clamp(z, collider.z - collider.d / 2, collider.z + collider.d / 2);
    return Math.hypot(x - closestX, z - closestZ) < radius;
  }
  const worldColliders = [
    { x: -22, z: -13, w: 13.8, d: 12.8 }, { x: -22, z: 8, w: 12.8, d: 13.8 },
    { x: 22, z: -9, w: 13.8, d: 13.8 }, { x: 22, z: 15, w: 12.8, d: 12.8 },
    { x: -14, z: 4, w: 2, d: 1.7 }, { x: -14.8, z: 6, w: .82, d: .82 },
    { x: -12.2, z: 5.2, w: .82, d: .82 }, { x: -13, z: 34.2, w: 3.4, d: 2.1 },
    { x: -18, z: -31, w: 9.8, d: 9.8 }, { x: 22, z: -31, w: 10.8, d: 9.8 },
    { x: -22, z: 27, w: 9.8, d: 9.8 }, { x: 22, z: 31, w: 9.8, d: 9.8 },
    { x: 0, z: -48, w: 15.8, d: 9.8 }, { x: 0, z: 48, w: 15.8, d: 9.8 },
    ...[[-15,-25],[-15,22],[15,-28],[15,29],[-30,1],[30,-20]].map(([x,z]) => ({ x, z, w: .72, d: .72 })),
  ];
  function pedestrianBlocked(person, x, z, movedPeople) {
    const radius = .42;
    if (Math.abs(x) > 32.8 || Math.abs(z) > 38.5) return true;
    if (worldColliders.some(collider => circleHitsBox(x, z, radius, collider))) return true;
    for (const other of [...movedPeople, ...pedestrians.filter(candidate => candidate !== person && !movedPeople.includes(candidate))]) {
      if (Math.hypot(x - other.position.x, z - other.position.z) < radius * 2) return true;
    }
    for (const other of [missionGiver, mamaT, tailor, depotManager, marketVendor]) {
      const position = other.position || other.giver;
      if (position && Math.hypot(x - position.x, z - position.z) < .86) return true;
    }
    if (Math.hypot(x - shop.position.x, z - shop.position.z) < .86) return true;
    for (const car of vehicles) {
      if (Math.abs(x - car.position.x) < 1.15 && Math.abs(z - car.position.z) < 2.15) return true;
    }
    for (const traffic of trafficCars) {
      if (!traffic.active) continue;
      const car = traffic.vehicle.position;
      if (Math.abs(x - car.x) < 1.15 && Math.abs(z - car.z) < 2.15) return true;
    }
    return false;
  }
  let trafficElapsed = 0;
  function updateTraffic(dt, elapsed, enabled = true) {
    if (!enabled) return;
    trafficElapsed += dt;
    for (const traffic of trafficCars) {
      const car = traffic.vehicle;
      if (!traffic.active) {
        if (trafficElapsed < traffic.spawnDelay) continue;
        traffic.active = true;
        car.visible = true;
        const progress = ((traffic.phaseZ + traffic.direction * traffic.speed * trafficElapsed + 35) % 70 + 70) % 70;
        car.position.z = progress - 35;
      }
      car.position.z += traffic.direction * traffic.speed * dt;
      if (car.position.z > 35) car.position.z = -35;
      if (car.position.z < -35) car.position.z = 35;
      for (const wheel of car.userData.wheels) wheel.rotation.x -= traffic.direction * traffic.speed * dt / .29;
    }
    const movedPeople = [];
    for (const person of pedestrians) {
      const direction = person.userData.direction;
      const nextZ = person.position.z + direction * person.userData.pace * dt;
      if (nextZ > 34 || nextZ < -34 || pedestrianBlocked(person, person.position.x, nextZ, movedPeople)) {
        person.userData.direction *= -1;
        person.rotation.y = person.userData.direction > 0 ? 0 : Math.PI;
      } else {
        person.position.z = nextZ;
        person.userData.walkPhase += person.userData.pace * dt * 5.5;
      }
      movedPeople.push(person);
      const step = Math.sin(person.userData.walkPhase) * .42;
      person.userData.legs.forEach((leg, index) => { leg.rotation.x = index === 0 ? step : -step; });
    }
  }
  return { colliders: worldColliders, missionGiver, missionPeople: { wale: missionGiver, 'mama-t': mamaT, adebayo: tailor, 'harbour-depot': depotManager, 'south-market': marketVendor }, destinationMarker, shop, vehicle, vehicles, trafficCars, pedestrians, updateTraffic };
}

function sphere(parent, material, x, y, z, scale) { const obj = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), material); obj.position.set(x,y,z); obj.scale.set(...scale); obj.castShadow=true; parent.add(obj); return obj; }
function limb(parent, material, a, b, radius) { const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b); const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.76,radius,va.distanceTo(vb),8),material);mesh.position.copy(va).add(vb).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());mesh.castShadow=true;parent.add(mesh);return mesh; }

function hingedLimb(parent, material, side, y, length, radius, isLeg = false, shoeColor = null, armOffset = .32) {
  const pivot = new THREE.Group(); pivot.position.set(side * (isLeg ? .16 : armOffset), y, 0); parent.add(pivot);
  const segment = new THREE.Mesh(new THREE.CylinderGeometry(radius * .78, radius, length, 9), material);
  segment.position.y = -length / 2; segment.castShadow = true; pivot.add(segment);
  if (isLeg) {
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), mat(shoeColor || '#f3e6ce'));
    shoe.position.set(0, -length + .005, .075); shoe.scale.set(.14,.085,.22); shoe.castShadow = true; pivot.add(shoe);
  } else {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), material);
    hand.position.y = -length - .035; hand.scale.set(.095,.105,.09); hand.castShadow = true; pivot.add(hand);
  }
  return pivot;
}

export function createPlayer(style, outfit = {}) {
  const root = new THREE.Group();
  const top=mat(style.primaryColor), bottoms=mat(style.secondaryColor), hair=mat(style.hairColor);
  const femaleBody = style.body === 'female';
  const topItem=WARDROBE_ITEMS.find(item=>item.id===outfit.top);
  const shoesItem=WARDROBE_ITEMS.find(item=>item.id===outfit.shoes);
  const accessoryItem=WARDROBE_ITEMS.find(item=>item.id===outfit.accessory);
  sphere(root, top, 0, 1.14, 0, femaleBody ? [.34,.44,.235] : [.37,.45,.24]);
  if (femaleBody) sphere(root,bottoms,0,.8,0,[.29,.18,.22]);
  sphere(root, mat(style.skinColor), 0, 1.83, 0, [.26,.31,.24]);
  sphere(root, mat('#fff2dd'), -.09, 1.87, .205, [.035,.045,.025]); sphere(root, mat('#fff2dd'), .09, 1.87, .205, [.035,.045,.025]);
  sphere(root, mat('#26343a'), -.09, 1.87, .229, [.015,.023,.012]); sphere(root, mat('#26343a'), .09, 1.87, .229, [.015,.023,.012]);
  const legs = [-1,1].map(side => hingedLimb(root,bottoms,side,.89,.65,.11,true,shoesItem?.color));
  if (shoesItem?.silhouette === 'sneakers') for (const side of [-1,1]) {
    const sole = new THREE.Mesh(new THREE.BoxGeometry(.22,.045,.31), mat('#f7ebcc')); sole.position.set(side*.16,.115,.075); root.add(sole);
  }
  const arms = [-1,1].map(side => hingedLimb(root,mat(style.skinColor),side,1.48,.53,.09,false,null,femaleBody?.29:.32));
  if (style.hair !== 'bald') {
    const cap=sphere(root,hair,0,2.08,0,[.27,.15,.255]);
    if (style.hair==='afro') cap.scale.set(.34,.29,.31);
    else if (style.hair==='braids' || style.hair==='dreads') for (let i=-1;i<=1;i++) limb(root,hair,[i*.14,2.09,0],[i*.15,1.74,-.07],.055);
    else if (style.hair==='bun') sphere(root,hair,0,2.18,-.17,[.13,.13,.13]);
    else if (style.hair==='ponytail') limb(root,hair,[0,2.05,-.14],[.08,1.78,-.36],.07);
  }
  const accent=mat('#e8b658');
  if (style.hat==='cap') { sphere(root,accent,0,2.19,0,[.28,.09,.27]); box(root,accent,0,2.15,.23,.33,.035,.28); }
  if (style.hat==='beanie') sphere(root,accent,0,2.17,0,[.27,.18,.26]);
  if (style.hat==='tophat') { const cylinder=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.3,10),accent);cylinder.position.y=2.3;root.add(cylinder);box(root,accent,0,2.16,0,.54,.04,.54); }
  if (style.hat==='crown') { const crown=new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.18,7),accent);crown.position.y=2.23;root.add(crown); }
  if (style.accessory==='glasses') { const frame=new THREE.MeshStandardMaterial({color:'#28363a',metalness:.55,roughness:.35}); for(const x of [-.09,.09]){ const lens=new THREE.Mesh(new THREE.TorusGeometry(.065,.014,5,12),frame);lens.position.set(x,1.87,.233);root.add(lens); } box(root,frame,0,1.87,.237,.06,.018,.018); }
  if (style.accessory==='earrings') for(const x of [-.225,.225]) sphere(root,accent,x,1.72,.02,[.04,.045,.04]);
  if (style.accessory==='beard') sphere(root,hair,0,1.65,.15,[.16,.1,.11]);
  if (style.accessory==='scarf') { const scarf=new THREE.Mesh(new THREE.TorusGeometry(.25,.07,7,16),accent);scarf.position.set(0,1.48,0);scarf.rotation.x=Math.PI/2;root.add(scarf); }
  if (style.accessory==='backpack' && accessoryItem?.silhouette !== 'backpack') box(root,accent,0,1.28,-.27,.35,.43,.18);
  if (topItem?.silhouette === 'dashiki') {
    const garment = new THREE.Mesh(new THREE.CylinderGeometry(.36,.405,.76,10),mat(topItem.color));
    garment.position.y=1.15; garment.castShadow=true; root.add(garment);
    box(root,mat('#efc76f'),0,1.15,.407,.07,.34,.025);
    for (const side of [-1,1]) sphere(root,mat('#efc76f'),side*.2,1.16,.355,[.035,.035,.025]);
  }
  if (topItem?.silhouette === 'jacket') {
    const garment = new THREE.Mesh(new THREE.BoxGeometry(.78,.78,.52),mat(topItem.color));
    garment.position.set(0,1.15,0); garment.castShadow=true; root.add(garment);
    box(root,mat('#f0ca74'),0,1.17,.267,.045,.67,.025);
    for (const side of [-1,1]) box(root,mat('#f0ca74'),side*.28,1.18,.25,.025,.5,.025);
    sphere(root,mat('#e9b64d'),0,1.25,.29,[.035,.035,.03]);
  }
  if (accessoryItem?.silhouette === 'backpack') {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(.39,.48,.21),mat(accessoryItem.color));
    bag.position.set(0,1.27,-.29); bag.castShadow=true; root.add(bag);
    for (const side of [-1,1]) limb(root,mat('#d39b57'),[side*.22,1.5,-.15],[side*.22,1.05,-.12],.025);
  }
  root.userData.legs=legs; root.userData.arms=arms;
  return root;
}




