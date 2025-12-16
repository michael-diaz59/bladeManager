import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove, update, child, push } from 'firebase/database';
import { League, Match, Participant, Tournament, Blade, AppConfig, BalanceFormat, TournamentStructure } from '../types';

// CONFIGURACIÓN DE FIREBASE
// Asegúrate de definir estas variables en tu archivo .env o reemplazar los valores aquí directamente.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "TU_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "TU_PROYECTO.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://TU_PROYECTO.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "TU_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "TU_PROYECTO.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "TU_SENDER_ID",
  appId: process.env.FIREBASE_APP_ID || "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Helper para convertir snapshot de Firebase (objeto) a Array
const snapshotToArray = <T>(snapshot: any): T[] => {
    if (!snapshot.exists()) return [];
    const val = snapshot.val();
    return Object.values(val);
};

export const dbService = {
  // --- Config ---
  async getConfig(): Promise<AppConfig> {
      const snapshot = await get(ref(db, 'config'));
      if (!snapshot.exists()) {
           // Configuración por defecto si no existe
           const defaultConfig: AppConfig = {
                balanceFormats: [{ id: 'default', name: 'Estándar' }],
                scoringSystem: { win: 1, loss: 0 }
           };
           await set(ref(db, 'config'), defaultConfig);
           return defaultConfig;
      }
      return snapshot.val();
  },

  async updateConfig(newConfig: AppConfig): Promise<void> {
      await set(ref(db, 'config'), newConfig);
  },

  async addBalanceFormat(name: string): Promise<BalanceFormat> {
      // Leemos la config actual, actualizamos el array y guardamos.
      // Firebase no maneja arrays nativos perfectamente para operaciones concurrentes simples,
      // pero para este caso de uso lectura-escritura completa funciona bien.
      const config = await this.getConfig();
      const newRef = push(child(ref(db), 'temp')); // Solo para generar ID
      const newFormat = { id: newRef.key || Math.random().toString(), name };
      
      const currentFormats = config.balanceFormats || [];
      const updatedFormats = [...currentFormats, newFormat];
      
      await update(ref(db, 'config'), { balanceFormats: updatedFormats });
      return newFormat;
  },

  // --- Blades ---
  async getBlades(): Promise<Blade[]> {
    const snapshot = await get(ref(db, 'blades'));
    return snapshotToArray<Blade>(snapshot);
  },

  async addBlade(name: string, tier: string): Promise<Blade | null> {
    const blades = await this.getBlades();
    if (blades.some(b => b.name.toLowerCase() === name.toLowerCase())) return null;

    const newRef = push(ref(db, 'blades'));
    const newBlade: Blade = { id: newRef.key!, name, tier };
    await set(newRef, newBlade);
    return newBlade;
  },

  // --- Participants ---
  async getParticipants(): Promise<Participant[]> {
    const snapshot = await get(ref(db, 'participants'));
    return snapshotToArray<Participant>(snapshot);
  },

  async addParticipant(name: string): Promise<Participant | null> {
    const parts = await this.getParticipants();
    if (parts.some(p => p.name.toLowerCase() === name.toLowerCase())) return null;

    const newRef = push(ref(db, 'participants'));
    const newParticipant: Participant = { 
        id: newRef.key!, 
        name, 
        winrate: 0, 
        totalMatches: 0, 
        wins: 0 
    };
    await set(newRef, newParticipant);
    return newParticipant;
  },

  // --- Leagues ---
  async getLeagues(): Promise<League[]> {
    const snapshot = await get(ref(db, 'leagues'));
    return snapshotToArray<League>(snapshot);
  },

  async createLeague(name: string): Promise<string | null> {
    const leagues = await this.getLeagues();
    if (leagues.some(l => l.name.toLowerCase() === name.toLowerCase())) return null;

    const newRef = push(ref(db, 'leagues'));
    const newLeague: League = {
        id: newRef.key!,
        name,
        participantIds: [],
        tournamentIds: [],
        createdAt: Date.now()
    };
    await set(newRef, newLeague);
    return newRef.key;
  },

  async deleteLeague(id: string): Promise<void> {
      // 1. Desvincular torneos y partidos (Limpieza manual simulada)
      // En una DB real esto podría ser un Cloud Function.
      const updates: any = {};
      
      // Obtener torneos y desvincular
      const tournaments = await this.getTournaments();
      tournaments.filter(t => t.leagueId === id).forEach(t => {
          updates[`tournaments/${t.id}/leagueId`] = null;
      });
      
      // Obtener partidos y desvincular
      const matches = await this.getAllMatches();
      matches.filter(m => m.leagueId === id).forEach(m => {
          updates[`matches/${m.id}/leagueId`] = null;
      });
      
      // Eliminar la liga
      updates[`leagues/${id}`] = null;
      
      await update(ref(db), updates);
  },

  // --- Tournaments ---
  async getTournaments(leagueId?: string): Promise<Tournament[]> {
    const snapshot = await get(ref(db, 'tournaments'));
    const all = snapshotToArray<Tournament>(snapshot);
    if (leagueId) {
        return all.filter(t => t.leagueId === leagueId);
    }
    return all;
  },

  async getTournament(tournamentId: string): Promise<Tournament | null> {
    const snapshot = await get(ref(db, `tournaments/${tournamentId}`));
    return snapshot.exists() ? snapshot.val() : null;
  },

  async createTournament(data: Omit<Tournament, 'id' | 'createdAt'>): Promise<string | null> {
    const tournaments = await this.getTournaments();
    if (tournaments.some(t => t.name.toLowerCase() === data.name.toLowerCase())) return null;

    const newRef = push(ref(db, 'tournaments'));
    const id = newRef.key!;
    const newTournament: Tournament = {
        ...data,
        id,
        createdAt: Date.now()
    };
    
    const updates: any = {};
    updates[`tournaments/${id}`] = newTournament;
    
    // Vincular a la liga si existe
    if (data.leagueId) {
        const leagueSnap = await get(ref(db, `leagues/${data.leagueId}`));
        if (leagueSnap.exists()) {
             const league = leagueSnap.val() as League;
             const currentIds = league.tournamentIds || [];
             updates[`leagues/${data.leagueId}/tournamentIds`] = [...currentIds, id];
        }
    }
    
    await update(ref(db), updates);
    return id;
  },

  async deleteTournament(id: string): Promise<void> {
      const updates: any = {};
      
      // Desvincular de la liga
      const tSnap = await get(ref(db, `tournaments/${id}`));
      if (tSnap.exists()) {
          const t = tSnap.val() as Tournament;
          if (t.leagueId) {
               const lSnap = await get(ref(db, `leagues/${t.leagueId}`));
               if (lSnap.exists()) {
                   const l = lSnap.val() as League;
                   const newTIds = (l.tournamentIds || []).filter(tid => tid !== id);
                   updates[`leagues/${t.leagueId}/tournamentIds`] = newTIds;
               }
          }
      }

      // Eliminar partidos asociados
      const matches = await this.getMatchesByTournament(id);
      matches.forEach(m => {
          updates[`matches/${m.id}`] = null;
      });

      // Eliminar torneo
      updates[`tournaments/${id}`] = null;

      await update(ref(db), updates);
  },

  async updateTournamentParticipants(tournamentId: string, participantIds: string[]): Promise<void> {
      const updates: any = {};
      updates[`tournaments/${tournamentId}/participantIds`] = participantIds;
      
      // Actualizar también los participantes de la Liga
      const tSnap = await get(ref(db, `tournaments/${tournamentId}`));
      if(tSnap.exists()) {
          const t = tSnap.val() as Tournament;
          if(t.leagueId) {
               const lSnap = await get(ref(db, `leagues/${t.leagueId}`));
               if(lSnap.exists()) {
                   const l = lSnap.val() as League;
                   const currentSet = new Set(l.participantIds || []);
                   participantIds.forEach(pid => currentSet.add(pid));
                   updates[`leagues/${t.leagueId}/participantIds`] = Array.from(currentSet);
               }
          }
      }
      
      await update(ref(db), updates);
  },

  async updateTournamentStructure(tournamentId: string, newStructure: TournamentStructure, matchesToDelete: string[]): Promise<void> {
      const updates: any = {};
      updates[`tournaments/${tournamentId}/structure`] = newStructure;
      
      matchesToDelete.forEach(mid => {
          updates[`matches/${mid}`] = null;
      });
      
      await update(ref(db), updates);
  },

  // --- Matches ---
  async getAllMatches(): Promise<Match[]> {
      const snapshot = await get(ref(db, 'matches'));
      return snapshotToArray<Match>(snapshot);
  },

  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
      // Filtrado en cliente por simplicidad (sin configurar índices)
      const all = await this.getAllMatches();
      return all.filter(m => m.tournamentId === tournamentId);
  },

  async getMatchesByLeague(leagueId: string): Promise<Match[]> {
      const all = await this.getAllMatches();
      return all.filter(m => m.leagueId === leagueId);
  },

  async createMatch(matchData: Omit<Match, 'id'>): Promise<void> {
      const newRef = push(ref(db, 'matches'));
      const id = newRef.key!;
      const match = { ...matchData, id };
      
      const updates: any = {};
      updates[`matches/${id}`] = match;
      
      if (matchData.leagueId) {
          const lSnap = await get(ref(db, `leagues/${matchData.leagueId}`));
          if(lSnap.exists()) {
              const l = lSnap.val() as League;
              const pSet = new Set(l.participantIds || []);
              pSet.add(matchData.participant1Id);
              pSet.add(matchData.participant2Id);
              updates[`leagues/${matchData.leagueId}/participantIds`] = Array.from(pSet);
          }
      }
      
      await update(ref(db), updates);

      if (match.isPlayed) {
          this.recalculateParticipantStats(match.participant1Id);
          this.recalculateParticipantStats(match.participant2Id);
      }
  },

  async resolveMatch(matchId: string, p1Score: number, p2Score: number): Promise<void> {
      const mSnap = await get(ref(db, `matches/${matchId}`));
      if(!mSnap.exists()) return;
      const match = mSnap.val() as Match;

      let winnerId: string | null = null;
      if (p1Score > p2Score) winnerId = match.participant1Id;
      else if (p2Score > p1Score) winnerId = match.participant2Id;

      await update(ref(db, `matches/${matchId}`), {
          participant1Score: p1Score,
          participant2Score: p2Score,
          winnerId,
          isPlayed: true
      });

      this.recalculateParticipantStats(match.participant1Id);
      this.recalculateParticipantStats(match.participant2Id);
  },

  async bulkCreateMatches(matches: Omit<Match, 'id'>[]): Promise<void> {
      const updates: any = {};
      matches.forEach(m => {
          const newRef = push(ref(db, 'matches'));
          updates[`matches/${newRef.key}`] = { ...m, id: newRef.key };
      });
      await update(ref(db), updates);
  },

  async deleteMatches(matchIds: string[]): Promise<void> {
      const updates: any = {};
      matchIds.forEach(id => updates[`matches/${id}`] = null);
      await update(ref(db), updates);
  },

  // Helper para recalcular estadísticas
  async recalculateParticipantStats(participantId: string) {
      const allMatches = await this.getAllMatches();
      const pMatches = allMatches.filter(m => 
        m.isPlayed && (m.participant1Id === participantId || m.participant2Id === participantId)
      );

      const totalMatches = pMatches.length;
      const wins = pMatches.filter(m => m.winnerId === participantId).length;
      const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

      await update(ref(db, `participants/${participantId}`), {
          totalMatches,
          wins,
          winrate
      });
  }
};