
export interface Participant {
  id: string;
  name: string;
  winrate: number;
  totalMatches: number;
  wins: number;
}

export interface Match {
  id: string;
  leagueId?: string;
  tournamentId?: string;
  participant1Id: string;
  participant2Id: string;
  participant1Score?: number;
  participant2Score?: number;
  winnerId: string | null;
  isPlayed: boolean;
  date: number;
  phase?: 'group' | 'playoff';
  roundLabel?: string;
}

export type TournamentStructure = 'Round Robin' | 'Playoff Only' | 'Round Robin + Playoffs';

export interface Tournament {
  id: string;
  name: string;
  leagueId?: string;
  structure: TournamentStructure; // Replaces old 'format' and 'hasPlayoffs'
  balanceFormatId: string; // Reference to the Balance Format configuration
  participantIds: string[];
  playoffType?: 'Final' | 'Semi Final' | 'Quarter Final' | 'Round of 16';
  status: 'Draft' | 'Active' | 'Completed';
  createdAt: number;
}

export interface League {
  id: string;
  name: string;
  participantIds: string[];
  tournamentIds: string[];
  createdAt: number;
}

export interface Blade {
  id: string;
  name: string;
  tier: string;
}

export interface BalanceFormat {
  id: string;
  name: string;
}

export interface AppConfig {
  balanceFormats: BalanceFormat[]; // Replaces 'formats' string array
  scoringSystem: {
    win: number;
    loss: number;
  };
}

export interface DatabaseSchema {
  participants: Record<string, Participant>;
  leagues: Record<string, League>;
  tournaments: Record<string, Tournament>;
  matches: Record<string, Match>;
  blades: Record<string, Blade>;
  config: AppConfig;
}
