import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove, update, child, push, runTransaction, query, orderByChild, equalTo } from 'firebase/database';
import { League, Match, Participant, Tournament, Blade, AppConfig, BalanceFormat, TournamentStructure } from '../types';

// CONFIGURACIÓN DE FIREBASE
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
      const newRef = push(child(ref(db), 'temp')); // Generar ID único
      const newFormat = { id: newRef.key || Math.random().toString(), name };
      
      // Usamos transacción para asegurar que no sobrescribimos formatos añadidos concurrentemente
      await runTransaction(ref(db, 'config/balanceFormats'), (currentFormats) => {
          if (currentFormats === null) return [newFormat];
          return [...currentFormats, newFormat];
      });
      
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
    // Verificación de duplicados
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
      const updates: any = {};
      
      // Obtener torneos para desvincular
      const tournaments = await this.getTournaments(id);
      tournaments.forEach(t => {
          updates[`tournaments/${t.id}/leagueId`] = null;
      });
      
      // Obtener partidos para desvincular
      const matches = await this.getMatchesByLeague(id);
      matches.forEach(m => {
          updates[`matches/${m.id}/leagueId`] = null;
      });
      
      // Eliminar la liga
      updates[`leagues/${id}`] = null;
      
      await update(ref(db), updates);
  },

  // --- Tournaments ---
  async getTournaments(leagueId?: string): Promise<Tournament[]> {
    if (leagueId) {
        // Consulta optimizada usando índice
        const q = query(ref(db, 'tournaments'), orderByChild('leagueId'), equalTo(leagueId));
        const snapshot = await get(q);
        return snapshotToArray<Tournament>(snapshot);
    }
    const snapshot = await get(ref(db, 'tournaments'));
    return snapshotToArray<Tournament>(snapshot);
  },

  async getTournament(tournamentId: string): Promise<Tournament | null> {
    const snapshot = await get(ref(db, `tournaments/${tournamentId}`));
    return snapshot.exists() ? snapshot.val() : null;
  },

  async createTournament(data: Omit<Tournament, 'id' | 'createdAt'>): Promise<string | null> {
    // Nota: Para verificar nombres duplicados globalmente seguimos necesitando traer todos o tener un índice por nombre.
    // Por simplicidad y escala pequeña/media, traemos todos los torneos.
    const tournaments = await this.getTournaments();
    if (tournaments.some(t => t.name.toLowerCase() === data.name.toLowerCase())) return null;

    const newRef = push(ref(db, 'tournaments'));
    const id = newRef.key!;
    const newTournament: Tournament = {
        ...data,
        id,
        createdAt: Date.now()
    };
    
    // Guardar torneo
    await set(ref(db, `tournaments/${id}`), newTournament);
    
    // Vincular a la liga mediante transacción para evitar condiciones de carrera en el array
    if (data.leagueId) {
        await runTransaction(ref(db, `leagues/${data.leagueId}/tournamentIds`), (currentIds) => {
            if (currentIds === null) return [id];
            return [...currentIds, id];
        });
    }
    
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
      await update(ref(db, `tournaments/${tournamentId}`), { participantIds });
      
      // Actualizar también los participantes de la Liga (si aplica)
      const tSnap = await get(ref(db, `tournaments/${tournamentId}`));
      if(tSnap.exists()) {
          const t = tSnap.val() as Tournament;
          if(t.leagueId) {
               await runTransaction(ref(db, `leagues/${t.leagueId}/participantIds`), (currentIds) => {
                   const currentSet = new Set(currentIds || []);
                   participantIds.forEach(pid => currentSet.add(pid));
                   return Array.from(currentSet);
               });
          }
      }
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
      // Consulta optimizada usando índice
      const q = query(ref(db, 'matches'), orderByChild('tournamentId'), equalTo(tournamentId));
      const snapshot = await get(q);
      return snapshotToArray<Match>(snapshot);
  },

  async getMatchesByLeague(leagueId: string): Promise<Match[]> {
      // Consulta optimizada usando índice
      const q = query(ref(db, 'matches'), orderByChild('leagueId'), equalTo(leagueId));
      const snapshot = await get(q);
      return snapshotToArray<Match>(snapshot);
  },

  async createMatch(matchData: Omit<Match, 'id'>): Promise<void> {
      const newRef = push(ref(db, 'matches'));
      const id = newRef.key!;
      const match = { ...matchData, id };
      
      await set(newRef, match);
      
      if (matchData.leagueId) {
          await runTransaction(ref(db, `leagues/${matchData.leagueId}/participantIds`), (currentIds) => {
              const pSet = new Set(currentIds || []);
              pSet.add(matchData.participant1Id);
              pSet.add(matchData.participant2Id);
              return Array.from(pSet);
          });
      }

      if (match.isPlayed) {
          await this.recalculateParticipantStats(match.participant1Id);
          await this.recalculateParticipantStats(match.participant2Id);
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

      await this.recalculateParticipantStats(match.participant1Id);
      await this.recalculateParticipantStats(match.participant2Id);
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
      // Nota: Idealmente esto sería un Cloud Function.
      // Optimización parcial: Traemos todos los partidos, ya que filtrar por participante
      // requeriría un índice compuesto complejo o iterar múltiples queries (p1Id y p2Id).
      // Dado que un jugador no tendrá millones de partidos, podríamos optimizar con índices simples
      // si fuera necesario, pero por ahora getAllMatches es aceptable para esta operación de escritura.
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