import { Blade, League, Match, Participant, Tournament, DatabaseSchema } from '../types';

// ==========================================
// CONFIGURACIÓN DE FIREBASE (Descomentar para usar)
// ==========================================
/*
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, onValue, update, get, child, remove } from "firebase/database";

const firebaseConfig = {
  // YOUR FIREBASE CONFIG HERE
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
*/

// ==========================================
// MOCK LOCAL STORAGE (Para Demo)
// ==========================================

const STORAGE_KEY = 'blade_manager_db';

const getLocalDB = (): DatabaseSchema => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial: DatabaseSchema = { blades: {}, participants: {}, leagues: {}, tournaments: {}, matches: {} };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};

const saveLocalDB = (data: DatabaseSchema) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// SERVICE METHODS

export const dbService = {
  // --- Blades ---
  async getBlades(): Promise<Blade[]> {
    const db = getLocalDB();
    return Object.values(db.blades);
  },

  async addBlade(name: string, tier: string): Promise<void> {
    const db = getLocalDB();
    const id = generateId();
    db.blades[id] = { id, name, tier };
    saveLocalDB(db);
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

  async createLeague(name: string): Promise<string> {
    const db = getLocalDB();
    const id = generateId();
    db.leagues[id] = { id, name, participantIds: [], tournamentIds: [] };
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

  async createTournament(data: Omit<Tournament, 'id'>): Promise<string> {
    const db = getLocalDB();
    const id = generateId();
    db.tournaments[id] = { ...data, id };
    
    // Link to League if provided
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
      
      // Auto-add to League Rule (only if league exists)
      const leagueId = db.tournaments[tournamentId].leagueId;
      if (leagueId && db.leagues[leagueId]) {
        const currentLeagueParticipants = new Set(db.leagues[leagueId].participantIds || []);
        participantIds.forEach(pid => currentLeagueParticipants.add(pid));
        db.leagues[leagueId].participantIds = Array.from(currentLeagueParticipants);
      }
      saveLocalDB(db);
    }
  },

  // --- Matches ---
  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    const db = getLocalDB();
    return Object.values(db.matches).filter(m => m.tournamentId === tournamentId);
  },

  async createMatch(matchData: Omit<Match, 'id'>): Promise<void> {
    const db = getLocalDB();
    const id = generateId();
    db.matches[id] = { ...matchData, id };

    // Auto-add to League Logic (if linked to a league)
    const leagueId = matchData.leagueId;
    if (leagueId && db.leagues[leagueId]) {
        const league = db.leagues[leagueId];
        const pSet = new Set(league.participantIds || []);
        pSet.add(matchData.participant1Id);
        pSet.add(matchData.participant2Id);
        league.participantIds = Array.from(pSet);
    }

    saveLocalDB(db);
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
  },

  async bulkCreateMatches(matches: Omit<Match, 'id'>[]): Promise<void> {
    const db = getLocalDB();
    matches.forEach(m => {
        const id = generateId();
        db.matches[id] = { ...m, id };
    });
    saveLocalDB(db);
  },

  // New method to delete a specific list of matches
  async deleteMatches(matchIds: string[]): Promise<void> {
    const db = getLocalDB();
    matchIds.forEach(id => {
        delete db.matches[id];
    });
    saveLocalDB(db);
    // Firebase implementation would loop and call remove(ref(db, `matches/${id}`))
  }
};
