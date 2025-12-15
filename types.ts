export interface Blade {
  id: string;
  name: string;
  tier: string;
}

export interface Participant {
  id: string;
  name: string;
  winrate: number;
  totalMatches: number;
  wins: number;
}

export interface SelectedBlade {
  bladeId: string;
  name: string;
}

export interface Match {
  id: string;
  leagueId?: string;
  tournamentId?: string;
  participant1Id: string;
  participant2Id: string;
  participant1Score?: number; // New field
  participant2Score?: number; // New field
  participant1Blades: SelectedBlade[];
  participant2Blades: SelectedBlade[];
  winnerId: string | null;
  isPlayed: boolean;
  date: number;
  phase?: 'group' | 'playoff';
  roundLabel?: string;
}

export interface Tournament {
  id: string;
  name: string;
  leagueId?: string;
  format: string;
  participantIds: string[];
  hasPlayoffs: boolean;
  playoffType?: 'Final' | 'Semi Final' | 'Quarter Final' | 'Round of 16';
  status: 'Draft' | 'Active' | 'Completed';
}

export interface League {
  id: string;
  name: string;
  participantIds: string[];
  tournamentIds: string[];
}

export interface DatabaseSchema {
  blades: Record<string, Blade>;
  participants: Record<string, Participant>;
  leagues: Record<string, League>;
  tournaments: Record<string, Tournament>;
  matches: Record<string, Match>;
}
