import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dbService } from '../services/db';
import { Tournament, Participant, Match, AppConfig, BalanceFormat, TournamentStructure } from '../types';
import { Button, Card, Input, Select, Badge } from '../components/UI';

const generateRoundRobinSchedule = (ids: string[], tournamentId: string, leagueId?: string) => {
  if (ids.length < 2) return [];
  
  let players = [...ids];
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
         matchesToCreate.push({
             leagueId: leagueId,
             tournamentId: tournamentId,
             participant1Id: p1,
             participant2Id: p2,
             participant1Score: 0,
             participant2Score: 0,
             winnerId: null,
             isPlayed: false,
             date: Date.now(),
             phase: 'group',
             roundLabel: roundLabel
         });
      }
    }
    players.splice(1, 0, players.pop()!);
  }
  
  return matchesToCreate;
};

const getUniqueMatchKey = (p1: string, p2: string) => [p1, p2].sort().join('-');

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
        if (s1 === s2) {
            alert("Empates no permitidos.");
            return;
        }
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

export const TournamentManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [balanceName, setBalanceName] = useState('');
  
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

    const cfg = await dbService.getConfig();
    setConfig(cfg);
    if (cfg && t.balanceFormatId) {
        const b = cfg.balanceFormats.find(f => f.id === t.balanceFormatId);
        setBalanceName(b ? b.name : 'Desconocido');
    }
  };

  const handleAddParticipant = async (pId: string) => {
    if (!tournament) return;
    const newPIds = [...tournament.participantIds, pId];
    await dbService.updateTournamentParticipants(tournament.id, newPIds);
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

  // --- Dynamic Structure Logic ---

  const handleToggleGroupStage = async () => {
      if (!tournament) return;
      const hasGroups = tournament.structure !== 'Playoff Only';
      const hasPlayoffs = tournament.structure !== 'Round Robin';

      if (hasGroups) {
          // Attempting to remove Groups
          if (!hasPlayoffs) {
              alert("Error: El torneo debe tener al menos una fase (no puedes quitar grupos si no hay Playoffs).");
              return;
          }
          if (window.confirm("ADVERTENCIA: Se perderán los datos de los enfrentamientos registrados en la Fase de Grupos. ¿Estás seguro?")) {
             // Remove Group matches and set to Playoff Only
             const matchesToDelete = matches.filter(m => (!m.phase || m.phase === 'group')).map(m => m.id);
             await dbService.updateTournamentStructure(tournament.id, 'Playoff Only', matchesToDelete);
             loadData();
          }
      } else {
          // Attempting to add Groups (from Playoff Only)
          if (window.confirm("ADVERTENCIA: Al añadir Fase de Grupos a un torneo de Solo Playoffs, se ELIMINARÁN los registros del Playoff actual para reconstruirlo en base a los resultados de los robins. ¿Continuar?")) {
              // Delete ALL matches (Playoffs included) because seeding changes
              const matchesToDelete = matches.map(m => m.id);
              await dbService.updateTournamentStructure(tournament.id, 'Round Robin + Playoffs', matchesToDelete);
              loadData();
          }
      }
  };

  const handleTogglePlayoffs = async () => {
      if (!tournament) return;
      const hasGroups = tournament.structure !== 'Playoff Only';
      const hasPlayoffs = tournament.structure !== 'Round Robin';

      if (hasPlayoffs) {
          // Attempting to remove Playoffs
          if (!hasGroups) {
              alert("Error: El torneo debe tener al menos una fase (no puedes quitar Playoffs si no hay Grupos).");
              return;
          }
          if (window.confirm("ADVERTENCIA: Se eliminará la fase de Playoffs y sus registros. ¿Estás seguro?")) {
              const matchesToDelete = matches.filter(m => m.phase === 'playoff').map(m => m.id);
              await dbService.updateTournamentStructure(tournament.id, 'Round Robin', matchesToDelete);
              loadData();
          }
      } else {
          // Attempting to add Playoffs (from Round Robin)
          // No destructive action needed, just structure update
          await dbService.updateTournamentStructure(tournament.id, 'Round Robin + Playoffs', []);
          loadData();
      }
  };

  // --- Scheduler Logic ---

  const handleGenerateRoundRobin = async () => {
      if (!id || !tournament) return;
      
      const currentMatches = await dbService.getMatchesByTournament(id);
      
      const existingMatches = currentMatches.filter(m => !m.phase || m.phase === 'group');
      const hasPlayedMatches = existingMatches.some(m => m.isPlayed);

      if (tournament.participantIds.length < 2) {
          alert("Se necesitan al menos 2 participantes.");
          return;
      }

      if (existingMatches.length > 0) {
          const message = hasPlayedMatches 
            ? "Existen partidos jugados. Se conservarán y se añadirán nuevos si es necesario. ¿Continuar?"
            : "Se eliminarán los partidos actuales. ¿Continuar?";
          if(!window.confirm(message)) return;
      }
      
      const playedMatches = existingMatches.filter(m => m.isPlayed);
      const unplayedMatches = existingMatches.filter(m => !m.isPlayed);

      if (unplayedMatches.length > 0) {
          await dbService.deleteMatches(unplayedMatches.map(m => m.id));
      }

      const idealSchedule = generateRoundRobinSchedule(tournament.participantIds, tournament.id, tournament.leagueId);
      const playedKeys = new Set(playedMatches.map(m => getUniqueMatchKey(m.participant1Id, m.participant2Id)));
      
      const matchesToCreate = idealSchedule.filter(newMatch => {
          const key = getUniqueMatchKey(newMatch.participant1Id, newMatch.participant2Id);
          return !playedKeys.has(key);
      });

      if (matchesToCreate.length > 0) {
          await dbService.bulkCreateMatches(matchesToCreate);
          await loadData();
      } else {
          await loadData();
          alert("Calendario actualizado.");
      }
  };

  const handleUpdateScore = async (matchId: string, s1: number, s2: number) => {
      await dbService.resolveMatch(matchId, s1, s2);
      loadData();
  };

  // --- Playoff Logic ---
  const calculateStandings = () => {
      if (!config) return [];

      const stats: Record<string, { 
          id: string, 
          name: string, 
          played: number, 
          wins: number, 
          points: number, 
          pointsFor: number, 
          pointsAgainst: number 
      }> = {};

      participants.forEach(p => { 
          stats[p.id] = { id: p.id, name: p.name, played: 0, wins: 0, points: 0, pointsFor: 0, pointsAgainst: 0 }; 
      });
      
      matches.filter(m => m.phase === 'group' && m.isPlayed).forEach(m => {
          if(stats[m.participant1Id]) {
              stats[m.participant1Id].played++;
              stats[m.participant1Id].pointsFor += (m.participant1Score || 0);
              stats[m.participant1Id].pointsAgainst += (m.participant2Score || 0);
              if(m.winnerId === m.participant1Id) {
                  stats[m.participant1Id].wins++;
                  stats[m.participant1Id].points += config.scoringSystem.win;
              } else {
                  stats[m.participant1Id].points += config.scoringSystem.loss;
              }
          }
          if(stats[m.participant2Id]) {
              stats[m.participant2Id].played++;
              stats[m.participant2Id].pointsFor += (m.participant2Score || 0);
              stats[m.participant2Id].pointsAgainst += (m.participant1Score || 0);
              if(m.winnerId === m.participant2Id) {
                  stats[m.participant2Id].wins++;
                  stats[m.participant2Id].points += config.scoringSystem.win;
              } else {
                  stats[m.participant2Id].points += config.scoringSystem.loss;
              }
          }
      });

      return Object.values(stats).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
          const diffA = a.pointsFor - a.pointsAgainst;
          const diffB = b.pointsFor - b.pointsAgainst;
          return diffB - diffA;
      });
  };

  const generatePlayoffs = async () => {
      if(!tournament || !playoffType) return;
      if (!window.confirm("¿Generar Playoffs?")) return;

      let qualifiers: {id: string}[] = [];

      // Logic Split: Standings (Mixed) vs Direct (Playoff Only)
      if (tournament.structure === 'Playoff Only') {
          // Shuffle participants for random seeding if playoff only
          qualifiers = [...participants].sort(() => Math.random() - 0.5).map(p => ({id: p.id}));
      } else {
          // Based on standings
          const standings = calculateStandings();
          qualifiers = standings;
      }

      let topN = 0;
      switch(playoffType) {
          case 'Final': topN = 2; break;
          case 'Semi Final': topN = 4; break;
          case 'Quarter Final': topN = 8; break;
          case 'Round of 16': topN = 16; break;
      }

      if (qualifiers.length < topN) {
          alert(`No hay suficientes participantes disponibles. Mínimo requerido: ${topN}.`);
          return;
      }

      // Take top N
      const selected = qualifiers.slice(0, topN);
      
      const newMatches: Omit<Match, 'id'>[] = [];
      for(let i=0; i < topN / 2; i++) {
          newMatches.push({
              leagueId: tournament.leagueId,
              tournamentId: tournament.id,
              participant1Id: selected[i].id,
              participant2Id: selected[topN - 1 - i].id,
              participant1Score: 0,
              participant2Score: 0,
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

  if (!tournament || !config) return <div>Cargando...</div>;

  const standings = calculateStandings();
  const numPotentialPlayers = tournament.structure === 'Playoff Only' ? participants.length : standings.length;
  
  const validPlayoffOptions = [
      { label: 'Final (Top 2)', value: 'Final', min: 2 },
      { label: 'Semi Final (Top 4)', value: 'Semi Final', min: 4 },
      { label: 'Quarter Final (Top 8)', value: 'Quarter Final', min: 8 },
      { label: 'Round of 16 (Top 16)', value: 'Round of 16', min: 16 },
  ].filter(opt => numPotentialPlayers >= opt.min);

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

  const hasPlayoffsGenerated = matches.some(m => m.phase === 'playoff');
  
  const isRoundRobin = tournament.structure !== 'Playoff Only';
  const isPlayoffEnabled = tournament.structure !== 'Round Robin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <div className="flex gap-2 mt-1">
                <Badge>{tournament.structure}</Badge> 
                <Badge color="blue">{balanceName}</Badge>
            </div>
        </div>
        
        {/* Structure Config Panel */}
        <div className="bg-slate-800 p-2 rounded border border-slate-700 flex flex-wrap gap-4 items-center">
            <span className="text-xs text-slate-400 font-bold uppercase">Configuración de Estructura:</span>
            
            <label className="flex items-center gap-2 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={isRoundRobin} 
                    onChange={handleToggleGroupStage}
                    className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-300">Fase de Grupos</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={isPlayoffEnabled}
                    onChange={handleTogglePlayoffs}
                    className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-300">Fase Final (Playoffs)</span>
            </label>
        </div>

        <div className="flex gap-2">
            {!hasPlayoffsGenerated && isRoundRobin && (
                <Button variant="secondary" onClick={handleGenerateRoundRobin}>Regenerar Enfrentamientos</Button>
            )}
            <Button onClick={() => setAddPlayerModalOpen(true)}>+ Añadir Participante</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
               {isRoundRobin && (
                 <Card title="Clasificación (Fase de Grupos)">
                     <div className="overflow-x-auto">
                         <table className="min-w-full text-left text-sm">
                             <thead className="text-slate-400 border-b border-slate-700">
                                 <tr>
                                     <th className="pb-2 px-2">Pos</th>
                                     <th className="pb-2 px-2">Nombre</th>
                                     <th className="pb-2 px-2 text-center text-emerald-400">Pts</th>
                                     <th className="pb-2 px-2 text-center">PJ</th>
                                     <th className="pb-2 px-2 text-center">G</th>
                                     <th className="pb-2 px-2 text-center" title="Puntos a Favor">PF</th>
                                     <th className="pb-2 px-2 text-center" title="Puntos en Contra">PC</th>
                                     <th className="pb-2 px-2 text-center" title="Diferencia">Diff</th>
                                 </tr>
                             </thead>
                             <tbody className="text-white">
                                 {standings.map((s, idx) => (
                                     <tr key={s.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                                         <td className="py-3 px-2 text-slate-500">{idx + 1}</td>
                                         <td className="py-3 px-2 font-medium">{s.name}</td>
                                         <td className="py-3 px-2 text-center font-bold text-emerald-400 text-lg">{s.points}</td>
                                         <td className="py-3 px-2 text-center">{s.played}</td>
                                         <td className="py-3 px-2 text-center text-green-300">{s.wins}</td>
                                         <td className="py-3 px-2 text-center text-slate-300">{s.pointsFor}</td>
                                         <td className="py-3 px-2 text-center text-slate-300">{s.pointsAgainst}</td>
                                         <td className="py-3 px-2 text-center text-slate-400">{s.pointsFor - s.pointsAgainst}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </Card>
               )}

               <Card title="Enfrentamientos">
                   {matches.length === 0 && (
                       <div className="text-center py-4">
                           <p className="text-slate-400 mb-4">No hay enfrentamientos generados.</p>
                           {isRoundRobin && <Button onClick={handleGenerateRoundRobin}>Generar Calendario Round Robin</Button>}
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
              {isPlayoffEnabled && (
                  <Card title="Fase Final (Playoffs)">
                      <div className="space-y-4">
                          {hasPlayoffsGenerated ? (
                              <div className="p-3 bg-purple-900/30 rounded border border-purple-500/50 text-sm text-purple-200">
                                  Playoffs generados. Ver enfrentamientos en la lista.
                              </div>
                          ) : (
                              <>
                                <Select 
                                    label="Estructura de Playoffs" 
                                    value={playoffType} 
                                    onChange={e => setPlayoffType(e.target.value)}
                                >
                                    <option value="">Seleccionar Tipo...</option>
                                    {validPlayoffOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </Select>
                                {numPotentialPlayers < 2 ? (
                                    <p className="text-xs text-slate-500">Mínimo 2 participantes.</p>
                                ) : (
                                    <Button 
                                        className="w-full" 
                                        disabled={!playoffType}
                                        onClick={generatePlayoffs}
                                    >
                                        Generar Cuadro Final
                                    </Button>
                                )}
                              </>
                          )}
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