import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dbService } from '../services/db';
import { Tournament, Participant, Match, AppConfig } from '../types';
import { Badge, Button, Input } from '../components/atoms/index';
import { Card, SectionHeader, SelectField, Modal } from '../components/molecules/index';
import { MatchCard, StandingsTable, StandingRow } from '../components/organisms/index';

// Helpers (logic kept same, UI moved)
const generateRoundRobinSchedule = (ids: string[], tournamentId: string, leagueId?: string) => {
  if (ids.length < 2) return [];
  let players = [...ids];
  if (players.length % 2 !== 0) players.push('BYE');
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
             leagueId, tournamentId, participant1Id: p1, participant2Id: p2,
             participant1Score: 0, participant2Score: 0, winnerId: null, isPlayed: false,
             date: Date.now(), phase: 'group', roundLabel
         });
      }
    }
    players.splice(1, 0, players.pop()!);
  }
  return matchesToCreate;
};

const getUniqueMatchKey = (p1: string, p2: string) => [p1, p2].sort().join('-');

export const TournamentManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [balanceName, setBalanceName] = useState('');
  
  const [isAddPlayerModalOpen, setAddPlayerModalOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [newParticipantName, setNewParticipantName] = useState('');
  const [playoffType, setPlayoffType] = useState<string>('');

  useEffect(() => { if (id) loadData(); }, [id]);

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
        setBalanceName(b ? b.name : 'Desc.');
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

  const handleToggleGroupStage = async () => {
      if (!tournament) return;
      const hasGroups = tournament.structure !== 'Playoff Only';
      const hasPlayoffs = tournament.structure !== 'Round Robin';

      if (hasGroups) {
          if (!hasPlayoffs) return alert("Error: Debe tener al menos una fase.");
          if (window.confirm("ADVERTENCIA: Se perderán los datos de grupos. ¿Continuar?")) {
             const matchesToDelete = matches.filter(m => (!m.phase || m.phase === 'group')).map(m => m.id);
             await dbService.updateTournamentStructure(tournament.id, 'Playoff Only', matchesToDelete);
             loadData();
          }
      } else {
          if (window.confirm("ADVERTENCIA: Añadir grupos reiniciará los playoffs. ¿Continuar?")) {
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
          if (!hasGroups) return alert("Error: Debe tener al menos una fase.");
          if (window.confirm("ADVERTENCIA: Se eliminará la fase de Playoffs. ¿Continuar?")) {
              const matchesToDelete = matches.filter(m => m.phase === 'playoff').map(m => m.id);
              await dbService.updateTournamentStructure(tournament.id, 'Round Robin', matchesToDelete);
              loadData();
          }
      } else {
          await dbService.updateTournamentStructure(tournament.id, 'Round Robin + Playoffs', []);
          loadData();
      }
  };

  const handleGenerateRoundRobin = async () => {
      if (!id || !tournament) return;
      const existingMatches = matches.filter(m => !m.phase || m.phase === 'group');
      
      if (tournament.participantIds.length < 2) return alert("Se necesitan al menos 2 participantes.");
      if (existingMatches.length > 0) {
          if(!window.confirm("Se modificarán los partidos actuales. ¿Continuar?")) return;
      }

      const playedMatches = existingMatches.filter(m => m.isPlayed);
      const unplayedMatches = existingMatches.filter(m => !m.isPlayed);
      if (unplayedMatches.length > 0) await dbService.deleteMatches(unplayedMatches.map(m => m.id));

      const idealSchedule = generateRoundRobinSchedule(tournament.participantIds, tournament.id, tournament.leagueId);
      const playedKeys = new Set(playedMatches.map(m => getUniqueMatchKey(m.participant1Id, m.participant2Id)));
      const matchesToCreate = idealSchedule.filter(newMatch => !playedKeys.has(getUniqueMatchKey(newMatch.participant1Id, newMatch.participant2Id)));

      if (matchesToCreate.length > 0) await dbService.bulkCreateMatches(matchesToCreate);
      loadData();
  };

  const handleUpdateScore = async (matchId: string, s1: number, s2: number) => {
      await dbService.resolveMatch(matchId, s1, s2);
      loadData();
  };

  const calculateStandings = () => {
      if (!config || !tournament) return [];
      const stats: Record<string, any> = {};
      participants.forEach(p => { stats[p.id] = { id: p.id, name: p.name, played: 0, wins: 0, points: 0, pointsFor: 0, pointsAgainst: 0 }; });
      
      const isPlayoffOnly = tournament.structure === 'Playoff Only';
      
      // Filter matches based on structure:
      // - Playoff Only: Include all played matches (likely all playoffs).
      // - Others: Only include Group phase matches for the standings table.
      const relevantMatches = matches.filter(m => {
          if (!m.isPlayed) return false;
          if (isPlayoffOnly) return true;
          return m.phase === 'group';
      });

      relevantMatches.forEach(m => {
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
      return Object.values(stats).sort((a: any, b: any) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.pointsFor - a.pointsFor;
      });
  };

  const generatePlayoffs = async () => {
      if(!tournament || !playoffType) return;
      if (!window.confirm("¿Generar Playoffs?")) return;
      
      // If Playoff Only, we use random order or manual seed if we had one, but here just random
      // If Groups, we use standings.
      let qualifiers: {id: string}[] = [];
      
      if (tournament.structure === 'Playoff Only') {
          // Check if we already have stats (maybe manually played matches?), otherwise random
          // For simplicity, just take all participants. Random shuffle could be added.
          qualifiers = [...participants].map(p => ({id: p.id}));
      } else {
          qualifiers = calculateStandings();
      }

      let topN = 0;
      if(playoffType === 'Final') topN = 2;
      else if(playoffType === 'Semi Final') topN = 4;
      else if(playoffType === 'Quarter Final') topN = 8;
      else if(playoffType === 'Round of 16') topN = 16;

      if (qualifiers.length < topN) return alert(`Mínimo ${topN} participantes.`);
      const selected = qualifiers.slice(0, topN);
      
      // Shuffle if it's Playoff Only to randomize pairings if they haven't played
      if (tournament.structure === 'Playoff Only') {
          selected.sort(() => Math.random() - 0.5);
      }

      const newMatches: Omit<Match, 'id'>[] = [];
      for(let i=0; i < topN / 2; i++) {
          newMatches.push({
              leagueId: tournament.leagueId, tournamentId: tournament.id,
              participant1Id: selected[i].id, participant2Id: selected[topN - 1 - i].id,
              participant1Score: 0, participant2Score: 0, winnerId: null, isPlayed: false,
              date: Date.now(), phase: 'playoff', roundLabel: playoffType
          });
      }
      await dbService.bulkCreateMatches(newMatches);
      loadData();
  };

  if (!tournament || !config) return <div>Cargando...</div>;

  const standingsData: StandingRow[] = calculateStandings().map((s: any) => ({...s}));
  const isRoundRobin = tournament.structure !== 'Playoff Only';
  const isPlayoffEnabled = tournament.structure !== 'Round Robin';
  const hasPlayoffsGenerated = matches.some(m => m.phase === 'playoff');

  const matchesByRound = matches.reduce((acc, m) => {
      const label = m.roundLabel || (m.phase === 'playoff' ? 'Fase Final' : 'Otros');
      if(!acc[label]) acc[label] = [];
      acc[label].push(m);
      return acc;
  }, {} as Record<string, Match[]>);

  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
      if(a.includes('Jornada') && b.includes('Jornada')) return parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]);
      return 0;
  });

  return (
    <div className="space-y-6">
      <SectionHeader title={tournament.name}>
        <Badge>{tournament.structure}</Badge> 
        <Badge color="blue">{balanceName}</Badge>
        <div className="bg-slate-800 p-2 rounded border border-slate-700 flex flex-wrap gap-4 items-center ml-4">
            <span className="text-xs text-slate-400 font-bold uppercase">Estructura:</span>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRoundRobin} onChange={handleToggleGroupStage} className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-600 rounded" />
                <span className="text-sm text-slate-300">Grupos</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPlayoffEnabled} onChange={handleTogglePlayoffs} className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-600 rounded" />
                <span className="text-sm text-slate-300">Playoffs</span>
            </label>
        </div>
        <div className="flex gap-2">
            {!hasPlayoffsGenerated && isRoundRobin && <Button variant="secondary" onClick={handleGenerateRoundRobin}>Regenerar</Button>}
            <Button onClick={() => setAddPlayerModalOpen(true)}>+ Jugador</Button>
        </div>
      </SectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
               <StandingsTable 
                   data={standingsData} 
                   title={isRoundRobin ? "Clasificación (Fase de Grupos)" : "Lista de Participantes"} 
               />

               <Card title="Enfrentamientos">
                   <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                       {sortedRounds.map(roundName => (
                           <div key={roundName}>
                               <h3 className="text-sm font-bold text-emerald-500 mb-2 sticky top-0 bg-slate-800 py-1">{roundName}</h3>
                               {matchesByRound[roundName].map(m => (
                                   <MatchCard 
                                      key={m.id} 
                                      match={m} 
                                      p1={allParticipants.find(p => p.id === m.participant1Id)} 
                                      p2={allParticipants.find(p => p.id === m.participant2Id)} 
                                      onUpdate={handleUpdateScore} 
                                   />
                               ))}
                           </div>
                       ))}
                       {matches.length === 0 && <div className="text-center py-4 text-slate-400">No hay enfrentamientos.</div>}
                   </div>
               </Card>
          </div>

          <div className="space-y-6">
              {isPlayoffEnabled && (
                  <Card title="Fase Final (Playoffs)">
                      <div className="space-y-4">
                          {hasPlayoffsGenerated ? (
                              <div className="p-3 bg-purple-900/30 rounded border border-purple-500/50 text-sm text-purple-200">
                                  Playoffs generados.
                              </div>
                          ) : (
                              <>
                                <SelectField label="Estructura de Playoffs" value={playoffType} onChange={e => setPlayoffType(e.target.value)}>
                                    <option value="">Seleccionar Tipo...</option>
                                    <option value="Final">Final (Top 2)</option>
                                    <option value="Semi Final">Semi Final (Top 4)</option>
                                    <option value="Quarter Final">Quarter Final (Top 8)</option>
                                    <option value="Round of 16">Round of 16 (Top 16)</option>
                                </SelectField>
                                <Button className="w-full" disabled={!playoffType} onClick={generatePlayoffs}>Generar Cuadro Final</Button>
                              </>
                          )}
                      </div>
                  </Card>
              )}
          </div>
      </div>

      {isAddPlayerModalOpen && (
          <Modal title="Añadir Participante" onClose={() => setAddPlayerModalOpen(false)}>
              <div className="mb-6 border-b border-slate-700 pb-4">
                  <label className="block text-sm text-slate-400 mb-1">Crear Nuevo</label>
                  <div className="flex gap-2">
                    <Input value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} placeholder="Nombre" />
                    <Button onClick={handleCreateAndAddParticipant}>Crear</Button>
                  </div>
              </div>
              <div>
                  <label className="block text-sm text-slate-400 mb-2">Seleccionar Existente</label>
                  <Input placeholder="Buscar..." value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} className="mb-2" />
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
          </Modal>
      )}
    </div>
  );
};