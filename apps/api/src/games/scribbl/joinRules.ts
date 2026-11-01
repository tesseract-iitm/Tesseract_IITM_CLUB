import type { ScribblRoomState } from './state.js';

// Anyone can join while the room is in the lobby. Once the game is running only
// players who are already in the room may come back after a disconnect.
export function canJoinRoom(status: ScribblRoomState['status'], isMember: boolean): boolean {
  if (status === 'LOBBY') return true;
  return status === 'ACTIVE' && isMember;
}
