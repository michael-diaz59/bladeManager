import { League, Match, Participant, Tournament, DatabaseSchema, Blade, AppConfig, BalanceFormat, TournamentStructure } from '../types';

const STORAGE_KEY = 'blade_manager_db';

const generateId = () => Math.random().toString(36).substr(2, 9);

const getLocalDB = (): DatabaseSchema => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Initialize with default balance formats
    const defaultBalanceId = generateId();
    const initial: DatabaseSchema = { 
        participants: {}, 
        leagues: {}, 
        tournaments: {}, 
        matches: {},
        blades: {},
        config: {
            balanceFormats: [
              { id: defaultBalanceId, name: 'Estándar' }
            ],
            scoringSystem: { win: 1, loss: 0 }
        }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  const db = JSON.parse(stored);
  
  // Migrations
  if (!db.blades) db.blades = {};
  if (!db.config) {
      db.config = {
          balanceFormats: [],
          scoringSystem: { win: 1, loss: 0 }
      };
  }
  // Migrate old 'formats' to 'balanceFormats' if necessary
  if ((db.config as any).formats) {
      db.config.balanceFormats = ((db.config as any).formats as string[]).map(f => ({ id: generateId(), name: f }));
      delete (db.config as any).formats;
  }
  
  return db;
};

const saveLocalDB = (data: DatabaseSchema) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// --- Internal Helper for Stats ---
const recalculateParticipantStats = (participantId: string) => {
    const db = getLocalDB();
    const p = db.participants[participantId];
    if (!p) return;

    // Find all played matches involving this participant
    const matches = Object.values(db.matches).filter(m => 
        m.isPlayed && (m.participant1Id === participantId || m.participant2Id === participantId)
    );

    const totalMatches = matches.length;
    const wins = matches.filter(m => m.winnerId === participantId).length;
    const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Update in memory and save
    db.participants[participantId].totalMatches = totalMatches;
    db.participants[participantId].wins = wins;
    db.participants[participantId].winrate = winrate;
    
    saveLocalDB(db);
};

// SERVICE METHODS

export const dbService = {
  // --- Config ---
  async getConfig(): Promise<AppConfig> {
      const db = getLocalDB();
      return db.config;
  },

  async updateConfig(newConfig: AppConfig): Promise<void> {
      const db = getLocalDB();
      db.config = newConfig;
      saveLocalDB(db);
  },

  async addBalanceFormat(name: string): Promise<BalanceFormat> {
      const db = getLocalDB();
      const newFormat = { id: generateId(), name };
      db.config.balanceFormats.push(newFormat);
      saveLocalDB(db);
      return newFormat;
  },

  // --- Blades ---
  async getBlades(): Promise<Blade[]> {
    const db = getLocalDB();
    return Object.values(db.blades || {});
  },

  async addBlade(name: string, tier: string): Promise<Blade | null> {
    const db = getLocalDB();
    const exists = Object.values(db.blades).some(b => b.name.toLowerCase() === name.toLowerCase());
    if (exists) return null;

    const id = generateId();
    const newBlade: Blade = { id, name, tier };
    db.blades[id] = newBlade;
    saveLocalDB(db);
    return newBlade;
  },

  // --- Participants ---
  async getParticipants(): Promise<Participant[]> {
    const db = getLocalDB();
    return Object.values(db.participants);
  },

  async addParticipant(name: string): Promise<Participant | null> {
    const db = getLocalDB();
    const exists = Object.values(db.participants).some(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) return null;

    const id = generateId();
    const newParticipant: Participant = { id, name, winrate: 0, totalMatches: 0, wins: 0 };
    db.participants[id] = newParticipant;
    saveLocalDB(db);
    return newParticipant;
  },

  // --- Leagues ---
  async getLeagues(): Promise<League[]> {
    const db = getLocalDB();
    return Object.values(db.leagues);
  },

  async createLeague(name: string): Promise<string | null> {
    const db = getLocalDB();
    const exists = Object.values(db.leagues).some(l => l.name.toLowerCase() === name.toLowerCase());
    if (exists) return null;

    const id = generateId();
    db.leagues[id] = { 
        id, 
        name, 
        participantIds: [], 
        tournamentIds: [],
        createdAt: Date.now() 
    };
    saveLocalDB(db);
    return id;
  },

  // --- Tournaments ---
  async getTournaments(leagueId?: string): Promise<Tournament[]> {
    const db = getLocalDB();
    const all = Object.values(db.tournaments);
    if (leagueId) {
      return all.filter(t => t.leagueId === leagueId);
    }
    return all;
  },

  async getTournament(tournamentId: string): Promise<Tournament | null> {
    const db = getLocalDB();
    return db.tournaments[tournamentId] || null;
  },

  async createTournament(data: Omit<Tournament, 'id' | 'createdAt'>): Promise<string | null> {
    const db = getLocalDB();
    const exists = Object.values(db.tournaments).some(t => t.name.toLowerCase() === data.name.toLowerCase());
    if (exists) return null;

    const id = generateId();
    db.tournaments[id] = { 
        ...data, 
        id, 
        createdAt: Date.now() 
    };
    
    if (data.leagueId && db.leagues[data.leagueId]) {
      if (!db.leagues[data.leagueId].tournamentIds) db.leagues[data.leagueId].tournamentIds = [];
      db.leagues[data.leagueId].tournamentIds.push(id);
    }
    
    saveLocalDB(db);
    return id;
  },

  async updateTournamentParticipants(tournamentId: string, participantIds: string[]): Promise<void> {
    const db = getLocalDB();
    if (db.tournaments[tournamentId]) {
      db.tournaments[tournamentId].participantIds = participantIds;
      
      const leagueId = db.tournaments[tournamentId].leagueId;
      if (leagueId && db.leagues[leagueId]) {
        const currentLeagueParticipants = new Set(db.leagues[leagueId].participantIds || []);
        participantIds.forEach(pid => currentLeagueParticipants.add(pid));
        db.leagues[leagueId].participantIds = Array.from(currentLeagueParticipants);
      }
      saveLocalDB(db);
    }
  },

  async updateTournamentStructure(tournamentId: string, newStructure: TournamentStructure, matchesToDelete: string[]): Promise<void> {
      const db = getLocalDB();
      const t = db.tournaments[tournamentId];
      if (!t) return;

      // Update structure
      t.structure = newStructure;

      // Delete invalid matches
      matchesToDelete.forEach(mId => {
          if (db.matches[mId]) {
              delete db.matches[mId];
          }
      });

      saveLocalDB(db);
  },

  // --- Matches ---
  async getAllMatches(): Promise<Match[]> {
      const db = getLocalDB();
      return Object.values(db.matches);
  },

  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    const db = getLocalDB();
    return Object.values(db.matches).filter(m => m.tournamentId === tournamentId);
  },

  async getMatchesByLeague(leagueId: string): Promise<Match[]> {
    const db = getLocalDB();
    return Object.values(db.matches).filter(m => m.leagueId === leagueId);
  },

  async createMatch(matchData: Omit<Match, 'id'>): Promise<void> {
    const db = getLocalDB();
    const id = generateId();
    db.matches[id] = { ...matchData, id };

    const leagueId = matchData.leagueId;
    if (leagueId && db.leagues[leagueId]) {
        const league = db.leagues[leagueId];
        const pSet = new Set(league.participantIds || []);
        pSet.add(matchData.participant1Id);
        pSet.add(matchData.participant2Id);
        league.participantIds = Array.from(pSet);
    }

    saveLocalDB(db);

    if (matchData.isPlayed) {
        recalculateParticipantStats(matchData.participant1Id);
        recalculateParticipantStats(matchData.participant2Id);
    }
  },

  async resolveMatch(matchId: string, p1Score: number, p2Score: number): Promise<void> {
    const db = getLocalDB();
    const match = db.matches[matchId];
    if (!match) return;

    let winnerId: string | null = null;
    if (p1Score > p2Score) winnerId = match.participant1Id;
    else if (p2Score > p1Score) winnerId = match.participant2Id;

    match.participant1Score = p1Score;
    match.participant2Score = p2Score;
    match.winnerId = winnerId;
    match.isPlayed = true;

    saveLocalDB(db);

    recalculateParticipantStats(match.participant1Id);
    recalculateParticipantStats(match.participant2Id);
  },

  async bulkCreateMatches(matches: Omit<Match, 'id'>[]): Promise<void> {
    const db = getLocalDB();
    matches.forEach(m => {
        const id = generateId();
        db.matches[id] = { ...m, id };
    });
    saveLocalDB(db);
  },

  async deleteMatches(matchIds: string[]): Promise<void> {
    const db = getLocalDB();
    matchIds.forEach(id => {
        delete db.matches[id];
    });
    saveLocalDB(db);
  }
};