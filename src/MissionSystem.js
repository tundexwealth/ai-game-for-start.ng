export const FIRST_MISSION = Object.freeze({
  id: 'fabric-for-mama-ts',
  title: 'A little help for Mama T',
  giver: { id: 'wale', x: -11.3, z: 3.2, name: 'Wale' },
  destination: { id: 'mama-t', x: -14.5, z: -6, name: 'Mama T’s stall' },
  objective: 'Take the fabric bundle to Mama T’s stall.',
  acceptedMessage: 'Wale: “Please take this fabric to Mama T for me.”',
  timeLimitSeconds: 30,
  rewards: { cash: 120, reputation: 15 },
});

export const SECOND_MISSION = Object.freeze({
  id: 'mama-t-delivery-to-adebayo',
  title: 'A fitting for Adebayo',
  giver: { id: 'mama-t', x: -14.5, z: -6, name: 'Mama T' },
  destination: { id: 'adebayo', x: 14, z: -29.5, name: 'Adebayo’s Tailoring' },
  objective: 'Take Mama T’s finished outfit to Adebayo’s workshop.',
  acceptedMessage: 'Mama T: “Please take this finished outfit to Adebayo at the corner workshop.”',
  timeLimitSeconds: 20,
  rewards: { cash: 180, reputation: 25 },
});

export const THIRD_MISSION = Object.freeze({
  id: 'adebayo-harbour-delivery',
  title: 'The workshop delivery',
  giver: { id: 'adebayo', x: 14, z: -29.5, name: 'Adebayo' },
  destination: { id: 'harbour-depot', x: -10.4, z: -29.5, name: 'Harbour Depot' },
  objective: 'Drive Adebayo’s finished bundle across the quarter to Harbour Depot.',
  acceptedMessage: 'Adebayo: “This order is heavy. Please take it across town by car.”',
  requiresVehicle: true,
  timeLimitSeconds: 14,
  rewards: { cash: 260, reputation: 40 },
});

export const FOURTH_MISSION = Object.freeze({
  id: 'harbour-market-run',
  title: 'The market run',
  giver: { id: 'harbour-depot', x: -10.4, z: -29.5, name: 'Depot Manager' },
  destination: { id: 'south-market', x: -9, z: 32.5, name: 'South Market' },
  objective: 'Take the depot’s morning supplies to South Market by car.',
  acceptedMessage: 'Depot Manager: “The market needs these before the rush. Take the car and head south.”',
  requiresVehicle: true,
  timeLimitSeconds: 10,
  rewards: { cash: 360, reputation: 60 },
});

export const MISSION_CHAIN = Object.freeze([FIRST_MISSION, SECOND_MISSION, THIRD_MISSION, FOURTH_MISSION]);

export class MissionSystem {
  constructor(definitions = MISSION_CHAIN, saved = {}) {
    this.definitions = definitions;
    this.completedIds = new Set(Array.isArray(saved.completedIds)
      ? saved.completedIds.filter(id => definitions.some(mission => mission.id === id))
      : []);
    this.activeMissionId = definitions.some(mission => mission.id === saved.activeMissionId)
      ? saved.activeMissionId
      : null;
    const active = definitions.find(mission => mission.id === this.activeMissionId);
    this.remainingSeconds = active?.timeLimitSeconds
      ? (Number.isFinite(saved.remainingSeconds) && saved.remainingSeconds > 0
        ? Math.min(saved.remainingSeconds, active.timeLimitSeconds)
        : active.timeLimitSeconds)
      : null;

    // Migrate the original one-mission save format without losing completed progress.
    if (!saved.completedIds?.length && saved.status === 'completed') this.completedIds.add(definitions[0].id);
    if (!this.activeMissionId && !saved.completedIds?.length && saved.status === 'active' && !this.completedIds.has(definitions[0].id)) {
      this.activeMissionId = definitions[0].id;
    }
  }

  get index() {
    if (this.activeMissionId) return this.definitions.findIndex(mission => mission.id === this.activeMissionId);
    return this.definitions.findIndex(mission => !this.completedIds.has(mission.id));
  }

  get definition() {
    return this.index < 0 ? this.definitions.at(-1) : this.definitions[this.index];
  }

  get status() {
    if (this.index < 0) return 'completed';
    return this.activeMissionId === this.definition.id ? 'active' : 'available';
  }

  interactAt(location, { inVehicle = false } = {}) {
    const current = this.definition;
    if (location === 'giver' && this.status === 'available') {
      this.activeMissionId = current.id;
      this.remainingSeconds = current.timeLimitSeconds ?? null;
      return { type: 'accepted', mission: current };
    }
    if (location === 'destination' && this.status === 'active') {
      if (current.requiresVehicle && !inVehicle) return { type: 'vehicle-required', mission: current };
      this.activeMissionId = null;
      this.remainingSeconds = null;
      this.completedIds.add(current.id);
      return { type: 'completed', mission: current };
    }
    if (location === 'destination' && this.completedIds.has(current.id)) {
      return { type: 'already-completed', mission: current };
    }
    return { type: 'no-change', mission: current };
  }

  tick(deltaSeconds) {
    if (this.status !== 'active' || this.remainingSeconds === null) return null;
    const before = Math.ceil(this.remainingSeconds);
    this.remainingSeconds = Math.max(0, this.remainingSeconds - Math.max(0, deltaSeconds));
    if (this.remainingSeconds <= 0) {
      const expiredMission = this.definition;
      this.activeMissionId = null;
      this.remainingSeconds = null;
      return { type: 'expired', mission: expiredMission };
    }
    const seconds = Math.ceil(this.remainingSeconds);
    return seconds !== before ? { type: 'tick', seconds } : null;
  }

  getSnapshot() {
    return {
      completedIds: [...this.completedIds],
      activeMissionId: this.activeMissionId,
      status: this.status,
      rewardGranted: this.status === 'completed',
      remainingSeconds: this.remainingSeconds,
    };
  }
}
