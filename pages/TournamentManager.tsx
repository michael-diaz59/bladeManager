import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dbService } from '../services/db';
import { Tournament, Participant, Match, Blade, SelectedBlade } from '../types';
import { Button, Card, Input, Select, Badge } from '../components/UI';

// --- Algoritmo Round Robin (Método del Polígono/Berger) ---
// Genera enfrentamientos divididos por "Jornadas" (Rounds)
const generateRoundRobinSchedule = (ids: string[], tournamentId: string, leagueId?: string) => {
  if (ids.length < 2) return [];
  
  let players = [...ids];
  // Si es impar, añadimos un "Bye" (descanso)
  if (players.length % 2 !== 0) {
    players.push('BYE');
  }

  const numPlayers = players.length;
  const numRounds = numPlayers - 1;
  const half = numPlayers / 2;
  
  const matchesToCreate: Omit<Match, 'id'>[] = [];

  for (let round = 0; round < numRounds; round++) {
    const roundLabel = `Jornada ${round + 1}`;
    
    for (let i = 0; i < half; i++) {
      const p1 = players[i];
      const p2 = players[numPlayers - 1 - i];

      if (p1 !== 'BYE' && p2 !== 'BYE') {
         // Crear match
         matchesToCreate.push({
             leagueId: leagueId,
             tournamentId: tournamentId,
             participant1Id: p1,
             participant2Id: p2,
             participant1Score: 0,
             participant2Score: 0,
             participant1Blades: [], // Se llenan después o se dejan vacíos
             participant2Blades: [],
             winnerId: null,
             isPlayed: false,
             date: Date.now(),
             phase: 'group',
             roundLabel: roundLabel
         });
      }
    }

    // Rotar array manteniendo el primero fijo (Algoritmo de Berger)
    // [0, 1, 2, 3] -> [0, 3, 1, 2] -> [0, 2, 3, 1]
    players.splice(1, 0, players.pop()!);
  }
  
  return matchesToCreate;
};

// Helper para identificar un partido único (independiente del orden p1/p2)
const getUniqueMatchKey = (p1: string, p2: string) => [p1, p2].sort().join('-');

// Componente para una tarjeta de partido con edición de puntaje
const MatchCard: React.FC<{ 
    match: Match; 
    p1?: Participant; 
    p2?: Participant; 
    onUpdate: (matchId: string, s1: number, s2: number) => void;
}> = ({ match, p1, p2, onUpdate }) => {
    const [s1, setS1] = useState(match.participant1Score || 0);
    const [s2, setS2] = useState(match.participant2Score || 0);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setS1(match.participant1Score || 0);
        setS2(match.participant2Score || 0);
        setIsDirty(false);
    }, [match]);

    const handleChange = (val: string, isP1: boolean) => {
        const num = parseInt(val) || 0;
        if(isP1) setS1(num); else setS2(num);
        setIsDirty(true);
    };

    const handleSave = () => {
        onUpdate(match.id, s1, s2);
        setIsDirty(false);
    };

    if(!p1 || !p2) return null;

    const winnerId = s1 > s2 ? p1.id : (s2 > s1 ? p2.id : null);

    return (
        <div className={`p-3 rounded border mb-2 flex flex-col gap-2 ${match.phase === 'playoff' ? 'bg-purple-900/20 border-purple-700' : 'bg-slate-700 border-slate-600'}`}>
            <div className="flex justify-between items-center">
               <span className="text-xs text-slate-400 uppercase font-bold">{match.roundLabel || match.phase}</span>
               {isDirty && <span className="text-xs text-yellow-400 animate-pulse">Sin guardar</span>}
               {match.isPlayed && !isDirty && <span className="text-xs text-green-400">Finalizado</span>}
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-sm truncate w-full text-center ${winnerId === p1.id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                        {p1.name}
                    </span>
                    <input 
                        type="number" 
                        min="0"
                        value={s1}
                        onChange={(e) => handleChange(e.target.value, true)}
                        className="w-16 bg-slate-800 border border-slate-600 rounded text-center text-white p-1"
                    />
                </div>

                <span className="text-slate-500 font-bold">VS</span>

                <div className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-sm truncate w-full text-center ${winnerId === p2.id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                        {p2.name}
                    </span>
                    <input 
                        type="number" 
                        min="0"
                        value={s2}
                        onChange={(e) => handleChange(e.target.value, false)}
                        className="w-16 bg-slate-800 border border-slate-600 rounded text-center text-white p-1"
                    />
                </div>
            </div>

            {isDirty && (
                <button 
                    onClick={handleSave}
                    className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded transition"
                >
                    Guardar Resultado
                </button>
            )}
        </div>
    );
};

const getPlayoffOptions = () => ['Final', 'Semi Final', 'Quarter Final', 'Round of 16'];

export const TournamentManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [blades, setBlades] = useState<Blade[]>([]);
  
  // UI States
  const [isAddPlayerModalOpen, setAddPlayerModalOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [newParticipantName, setNewParticipantName] = useState('');
  const [playoffType, setPlayoffType] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if(!id) return;
    const t = await dbService.getTournament(id);
    if (!t) return;
    setTournament(t);

    const allP = await dbService.getParticipants();
    setAllParticipants(allP);
    setParticipants(allP.filter(p => t.participantIds.includes(p.id)));

    const m = await dbService.getMatchesByTournament(id);
    setMatches(m);
    
    const b = await dbService.getBlades();
    setBlades(b);
  };

  const handleAddParticipant = async (pId: string) => {
    if (!tournament) return;
    const newPIds = [...tournament.participantIds, pId];
    await dbService.updateTournamentParticipants(tournament.id, newPIds);
    setAddPlayerModalOpen(false);
    loadData();
  };
  
  const handleCreateAndAddParticipant = async () => {
      if(!newParticipantName) return;
      const newP = await dbService.addParticipant(newParticipantName);
      if(newP) {
          await handleAddParticipant(newP.id);
          setNewParticipantName('');
      } else {
          alert("El nombre ya existe");
      }
  };

  const handleGenerateSchedule = async () => {
      if (!id) return;

      // 1. Fetch Fresh Data (Avoid Stale State)
      const t = await dbService.getTournament(id);
      if (!t) {
          alert("Error: No se encontró el torneo.");
          return;
      }
      
      const currentMatches = await dbService.getMatchesByTournament(id);
      
      // 2. Filter existing group matches
      const existingMatches = currentMatches.filter(m => !m.phase || m.phase === 'group');
      const hasPlayedMatches = existingMatches.some(m => m.isPlayed);

      // 3. Validation
      if (t.participantIds.length < 2) {
          alert("Se necesitan al menos 2 participantes para generar enfrentamientos.");
          return;
      }

      // 4. Confirmation
      if (existingMatches.length > 0) {
          const message = hasPlayedMatches 
            ? "Existen partidos en este torneo. Se conservarán los jugados y se regenerarán los no jugados para incluir a los nuevos participantes. ¿Estás seguro?"
            : "Se eliminarán los partidos actuales y se creará un nuevo calendario. ¿Estás seguro?";
            
          if(!window.confirm(message)) return;
      }
      
      // 5. Delete Unplayed
      const playedMatches = existingMatches.filter(m => m.isPlayed);
      const unplayedMatches = existingMatches.filter(m => !m.isPlayed);

      if (unplayedMatches.length > 0) {
          await dbService.deleteMatches(unplayedMatches.map(m => m.id));
      }

      // 6. Generate NEW full schedule for current participants
      const idealSchedule = generateRoundRobinSchedule(t.participantIds, t.id, t.leagueId);

      // 7. Filter: Only create matches that haven't been played yet
      const playedKeys = new Set(playedMatches.map(m => getUniqueMatchKey(m.participant1Id, m.participant2Id)));
      
      const matchesToCreate = idealSchedule.filter(newMatch => {
          const key = getUniqueMatchKey(newMatch.participant1Id, newMatch.participant2Id);
          return !playedKeys.has(key);
      });

      // 8. Bulk Create & Feedback
      if (matchesToCreate.length > 0) {
          await dbService.bulkCreateMatches(matchesToCreate);
          await loadData();
          setTimeout(() => alert("Calendario generado exitosamente."), 50);
      } else {
          await loadData();
          if (unplayedMatches.length > 0) {
             alert("Se han eliminado los partidos no jugados obsoletos. No se requirieron nuevos partidos.");
          } else {
             alert("El calendario está actualizado. No se requirieron nuevos partidos.");
          }
      }
  };

  const handleUpdateScore = async (matchId: string, s1: number, s2: number) => {
      await dbService.resolveMatch(matchId, s1, s2);
      loadData();
  };

  // --- Playoff Logic ---
  const calculateStandings = () => {
      const stats: Record<string, { 
          id: string, 
          name: string, 
          played: number, 
          wins: number, 
          pointsFor: number, 
          pointsAgainst: number 
      }> = {};

      participants.forEach(p => { 
          stats[p.id] = { id: p.id, name: p.name, played: 0, wins: 0, pointsFor: 0, pointsAgainst: 0 }; 
      });
      
      matches.filter(m => m.phase === 'group' && m.isPlayed).forEach(m => {
          if(stats[m.participant1Id]) {
              stats[m.participant1Id].played++;
              stats[m.participant1Id].pointsFor += (m.participant1Score || 0);
              stats[m.participant1Id].pointsAgainst += (m.participant2Score || 0);
              if(m.winnerId === m.participant1Id) stats[m.participant1Id].wins++;
          }
          if(stats[m.participant2Id]) {
              stats[m.participant2Id].played++;
              stats[m.participant2Id].pointsFor += (m.participant2Score || 0);
              stats[m.participant2Id].pointsAgainst += (m.participant1Score || 0);
              if(m.winnerId === m.participant2Id) stats[m.participant2Id].wins++;
          }
      });

      return Object.values(stats).sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
          if (b.pointsAgainst !== a.pointsAgainst) return b.pointsAgainst - a.pointsAgainst;
          const diffA = a.pointsFor - a.pointsAgainst;
          const diffB = b.pointsFor - b.pointsAgainst;
          return diffB - diffA;
      });
  };

  const generatePlayoffs = async () => {
      if(!tournament || !playoffType) return;
      const standings = calculateStandings();
      let topN = 0;
      switch(playoffType) {
          case 'Final': topN = 2; break;
          case 'Semi Final': topN = 4; break;
          case 'Quarter Final': topN = 8; break;
          case 'Round of 16': topN = 16; break;
      }

      if (standings.length < topN) {
          alert(`No hay suficientes jugadores para ${playoffType}`);
          return;
      }
      const qualifiers = standings.slice(0, topN);
      const newMatches: Omit<Match, 'id'>[] = [];
      for(let i=0; i < topN / 2; i++) {
          newMatches.push({
              leagueId: tournament.leagueId,
              tournamentId: tournament.id,
              participant1Id: qualifiers[i].id,
              participant2Id: qualifiers[topN - 1 - i].id,
              participant1Score: 0,
              participant2Score: 0,
              participant1Blades: [],
              participant2Blades: [],
              winnerId: null,
              isPlayed: false,
              date: Date.now(),
              phase: 'playoff',
              roundLabel: playoffType
          });
      }
      await dbService.bulkCreateMatches(newMatches);
      loadData();
  };

  if (!tournament) return <div>Cargando...</div>;

  const standings = calculateStandings();
  
  const matchesByRound = matches.reduce((acc, m) => {
      const label = m.roundLabel || (m.phase === 'playoff' ? 'Fase Final' : 'Otros');
      if(!acc[label]) acc[label] = [];
      acc[label].push(m);
      return acc;
  }, {} as Record<string, Match[]>);

  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
      if(a.includes('Jornada') && b.includes('Jornada')) {
          return parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]);
      }
      return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <div className="flex gap-2 mt-1">
                <Badge>{tournament.format === 'Elimination' ? 'Round Robin' : tournament.format}</Badge> 
                {tournament.hasPlayoffs && <Badge color="purple">Con Playoffs</Badge>}
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={handleGenerateSchedule}>Regenerar Enfrentamientos</Button>
            <Button onClick={() => setAddPlayerModalOpen(true)}>+ Añadir Participante</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
               <Card title="Clasificación (Fase de Grupos)">
                   <div className="overflow-x-auto">
                       <table className="min-w-full text-left text-sm">
                           <thead className="text-slate-400 border-b border-slate-700">
                               <tr>
                                   <th className="pb-2 px-2">Pos</th>
                                   <th className="pb-2 px-2">Nombre</th>
                                   <th className="pb-2 px-2 text-center">PJ</th>
                                   <th className="pb-2 px-2 text-center">G</th>
                                   <th className="pb-2 px-2 text-center" title="Puntos a Favor (Hechos)">PF</th>
                                   <th className="pb-2 px-2 text-center" title="Puntos en Contra (Recibidos)">PC</th>
                                   <th className="pb-2 px-2 text-center" title="Diferencia">Diff</th>
                               </tr>
                           </thead>
                           <tbody className="text-white">
                               {standings.map((s, idx) => (
                                   <tr key={s.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                                       <td className="py-3 px-2 text-slate-500">{idx + 1}</td>
                                       <td className="py-3 px-2 font-medium">{s.name}</td>
                                       <td className="py-3 px-2 text-center">{s.played}</td>
                                       <td className="py-3 px-2 text-center text-emerald-400 font-bold">{s.wins}</td>
                                       <td className="py-3 px-2 text-center text-slate-300">{s.pointsFor}</td>
                                       <td className="py-3 px-2 text-center text-slate-300">{s.pointsAgainst}</td>
                                       <td className="py-3 px-2 text-center text-slate-400">{s.pointsFor - s.pointsAgainst}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </Card>

               <Card title="Enfrentamientos">
                   {matches.length === 0 && (
                       <div className="text-center py-4">
                           <p className="text-slate-400 mb-4">No hay enfrentamientos generados.</p>
                           <Button onClick={handleGenerateSchedule}>Generar Calendario Round Robin</Button>
                       </div>
                   )}
                   
                   <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                       {sortedRounds.map(roundName => (
                           <div key={roundName}>
                               <h3 className="text-sm font-bold text-emerald-500 mb-2 sticky top-0 bg-slate-800 py-1">{roundName}</h3>
                               {matchesByRound[roundName].map(m => {
                                   const p1 = allParticipants.find(p => p.id === m.participant1Id);
                                   const p2 = allParticipants.find(p => p.id === m.participant2Id);
                                   return <MatchCard key={m.id} match={m} p1={p1} p2={p2} onUpdate={handleUpdateScore} />;
                               })}
                           </div>
                       ))}
                   </div>
               </Card>
          </div>

          <div className="space-y-6">
              {tournament.hasPlayoffs && (
                  <Card title="Fase Final (Playoffs)">
                      <div className="space-y-4">
                          <Select 
                            label="Estructura de Playoffs" 
                            value={playoffType} 
                            onChange={e => setPlayoffType(e.target.value)}
                          >
                              <option value="">Seleccionar Tipo...</option>
                              {getPlayoffOptions().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </Select>
                          <Button 
                            className="w-full" 
                            disabled={!playoffType}
                            onClick={generatePlayoffs}
                          >
                              Generar Cuadro Final
                          </Button>
                      </div>
                  </Card>
              )}
          </div>
      </div>

      {isAddPlayerModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full border border-slate-600">
                  <h3 className="text-lg font-bold text-white mb-4">Añadir Participante</h3>
                  <div className="mb-6 border-b border-slate-700 pb-4">
                      <label className="block text-sm text-slate-400 mb-1">Crear Nuevo</label>
                      <div className="flex gap-2">
                        <Input 
                            value={newParticipantName} 
                            onChange={e => setNewParticipantName(e.target.value)} 
                            placeholder="Nombre" 
                            className="mb-0"
                        />
                        <Button onClick={handleCreateAndAddParticipant}>Crear</Button>
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm text-slate-400 mb-2">O Seleccionar Existente</label>
                      <Input 
                        placeholder="Buscar..." 
                        value={participantSearch} 
                        onChange={e => setParticipantSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-1">
                          {allParticipants
                            .filter(p => !tournament.participantIds.includes(p.id) && p.name.toLowerCase().includes(participantSearch.toLowerCase()))
                            .map(p => (
                              <div key={p.id} className="flex justify-between items-center p-2 bg-slate-900 rounded">
                                  <span>{p.name}</span>
                                  <Button size="sm" onClick={() => handleAddParticipant(p.id)}>Añadir</Button>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                      <Button variant="secondary" onClick={() => setAddPlayerModalOpen(false)}>Cerrar</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};