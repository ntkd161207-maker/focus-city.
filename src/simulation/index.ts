// Pure data contract for Phase 2. No fabricated economy or traffic simulation.
export interface SimulationState {
  population: number;
  balance: number;
  tick: number;
}
export const initialSimulation: SimulationState = {
  population: 0,
  balance: 0,
  tick: 0,
};
