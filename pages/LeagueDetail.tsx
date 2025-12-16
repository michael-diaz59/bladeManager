import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { dbService } from '../services/db';
import { League, Tournament, Participant, Match, AppConfig, TournamentStructure } from '../types';
import { Button, Card, Input, Select, Badge } from '../components/UI';

const LeagueMatchCard: React.FC<{ 
    match: Match; 
    p1?: Participant; 
    p2?: Participant; 
    contextLabel: string;
}> = ({ match, p1, p2, contextLabel }) => {
    if(!p1 || !p2) return null;

    const winnerId = match.winnerId;

    return (
        <div className={`p-3 rounded border mb-2 flex flex-col gap-2 bg-slate-700 border-slate-600`}>
            <div className="flex justify-between items-center">
               <span className="text-xs text-slate-400 uppercase font-bold">{contextLabel}</span>
               {match.isPlayed ? (
                    <span className="text-xs text-green-400">Finalizado</span>
               ) : (
                    <span className="text-xs text-yellow-400">Pendiente</span>
               )}
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-sm truncate w-full text-center ${winnerId === p1.id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                        {p1.name}
                    </span>
                    <span className="text-lg font-mono text-white">{match.participant1Score || 0}</span>
                </div>

                <span className="text-slate-500 font-bold text-xs">VS</span>

                <div className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-sm truncate w-full text-center ${winnerId === p2.id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                        {p2.name}
                    </span>
                    <span className="text-lg font-mono text-white">{match.participant2Score || 0}</span>
                </div>
            </div>
        </div>
    );
};

export const LeagueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leagueMatches, setLeagueMatches] = useState<Match[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  // Quick Match State
  const [qmP1, setQmP1] = useState('');
  const [qmP2, setQmP2] = useState('');
  const [qmS1, setQmS1] = useState<number>(0); 
  const [qmS2, setQmS2] = useState<number>(0); 
  
  // New Tournament State
  const [tnName, setTnName] = useState('');
  const [tnStructure, setTnStructure] = useState<TournamentStructure | ''>('');
  const [tnBalanceId, setTnBalanceId] = useState('');

  const loadData = async () => {
    if (id) {
        const ls = await dbService.getLeagues();
        setLeague(ls.find(l => l.id === id) || null);
        
        const ts = await dbService.getTournaments(id);
        setTournaments(ts);
        
        const ps = await dbService.getParticipants();
        setParticipants(ps);
        
        const ms = await dbService.getMatchesByLeague(id);
        setLeagueMatches(ms);

        const cfg = await dbService.getConfig();
        setConfig(cfg);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!league || !config) return <div>Cargando...</div>;

  const handleCreateTournament = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!id) return;
      if (!tnStructure) return alert("Selecciona una estructura.");
      if (!tnBalanceId) return alert("Selecciona un formato de balance.");
      
      const tId = await dbService.createTournament({
          name: tnName,
          leagueId: id,
          structure: tnStructure as TournamentStructure,
          balanceFormatId: tnBalanceId,
          participantIds: [],
          status: 'Draft'
      });
      
      if (tId) {
          navigate(`/tournament/${tId}`);
      } else {
          alert("Ya existe un Torneo con ese nombre.");
      }
  };

  const handleQuickMatch = async () => {
      if(!qmP1 || !qmP2 || qmP1 === qmP2) {
          alert("Selecciona 2 participantes diferentes");
          return;
      }
      
      if (qmS1 === qmS2) {
          alert("Regla de negocio: No se permiten empates.");
          return;
      }
      
      let winnerId: string | null = null;
      if (qmS1 > qmS2) winnerId = qmP1;
      else if (qmS2 > qmS1) winnerId = qmP2;

      await dbService.createMatch({
          leagueId: league.id,
          participant1Id: qmP1,
          participant2Id: qmP2,
          participant1Score: qmS1,
          participant2Score: qmS2,
          winnerId: winnerId,
          isPlayed: true, 
          date: Date.now()
      });

      alert("Duelo registrado!");
      setQmP1('');
      setQmP2('');
      setQmS1(0);
      setQmS2(0);
      loadData(); 
  };

  // --- Statistics Logic (Uses Config for Points) ---
  const calculateLeagueStandings = () => {
      const stats: Record<string, { 
          id: string, 
          name: string, 
          played: number, 
          wins: number, 
          points: number, // Points based on config
          pointsFor: number, 
          pointsAgainst: number 
      }> = {};

      league.participantIds.forEach(pid => {
          const p = participants.find(part => part.id === pid);
          if(p) {
            stats[pid] = { id: pid, name: p.name, played: 0, wins: 0, points: 0, pointsFor: 0, pointsAgainst: 0 };
          }
      });
      
      leagueMatches.forEach(m => {
          if (!m.isPlayed) return;

          [m.participant1Id, m.participant2Id].forEach(pid => {
              if(!stats[pid]) {
                  const p = participants.find(part => part.id === pid);
                  stats[pid] = { id: pid, name: p ? p.name : 'Unknown', played: 0, wins: 0, points: 0, pointsFor: 0, pointsAgainst: 0 };
              }
          });

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
          if (b.points !== a.points) return b.points - a.points; // Sort by configured points first
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
          const diffA = a.pointsFor - a.pointsAgainst;
          const diffB = b.pointsFor - b.pointsAgainst;
          return diffB - diffA;
      });
  };

  const standings = calculateLeagueStandings();

  const sortedMatches = [...leagueMatches].sort((a, b) => b.date - a.date);

  const getMatchContextLabel = (m: Match) => {
      if (m.tournamentId) {
          const t = tournaments.find(t => t.id === m.tournamentId);
          return t ? `Torneo: ${t.name} (${m.phase === 'playoff' ? m.roundLabel : 'Grupos'})` : 'Torneo Eliminado';
      }
      return 'Duelo Rápido';
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Link to="/leagues" className="text-slate-400 hover:text-white">&larr; Volver</Link>
            <h1 className="text-2xl font-bold text-white">{league.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Comenzar Nuevo Torneo">
                <form onSubmit={handleCreateTournament} className="space-y-4">
                    <Input label="Nombre del Torneo" value={tnName} onChange={e => setTnName(e.target.value)} required />
                    
                    <Select label="Estructura" value={tnStructure} onChange={e => setTnStructure(e.target.value as TournamentStructure)}>
                        <option value="">-- Seleccionar --</option>
                        <option value="Round Robin">Round Robin</option>
                        <option value="Playoff Only">Solo Playoffs</option>
                        <option value="Round Robin + Playoffs">Ambas</option>
                    </Select>

                    <Select label="Formato de Balance" value={tnBalanceId} onChange={e => setTnBalanceId(e.target.value)}>
                        <option value="">-- Seleccionar Balance --</option>
                        {config.balanceFormats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                    
                    <Button type="submit" disabled={config.balanceFormats.length === 0}>Crear Torneo</Button>
                </form>
            </Card>

            <Card title="Registrar Duelo Rápido">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Participante 1" value={qmP1} onChange={e => setQmP1(e.target.value)}>
                            <option value="">Seleccionar P1</option>
                            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <Select label="Participante 2" value={qmP2} onChange={e => setQmP2(e.target.value)}>
                            <option value="">Seleccionar P2</option>
                            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                         <div className="flex flex-col">
                            <label className="text-sm text-slate-400 mb-1">Puntos P1</label>
                            <input 
                                type="number" 
                                min="0" 
                                value={qmS1} 
                                onChange={e => setQmS1(parseInt(e.target.value) || 0)}
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-center"
                            />
                         </div>
                         <div className="flex flex-col">
                            <label className="text-sm text-slate-400 mb-1">Puntos P2</label>
                            <input 
                                type="number" 
                                min="0" 
                                value={qmS2} 
                                onChange={e => setQmS2(parseInt(e.target.value) || 0)}
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-center"
                            />
                         </div>
                    </div>
                    <Button onClick={handleQuickMatch} variant="secondary" className="w-full">Registrar Resultado</Button>
                </div>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card title="Clasificación General de la Liga">
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
                               {standings.length === 0 && (
                                   <tr><td colSpan={8} className="text-center py-4 text-slate-500">No hay datos registrados aún.</td></tr>
                               )}
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
                
                <div className="mt-6">
                    <Card title="Torneos Asociados">
                        <div className="space-y-2">
                            {tournaments.length === 0 && <p className="text-slate-400">No se encontraron torneos.</p>}
                            {tournaments.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700 rounded border border-slate-600">
                                    <div>
                                        <span className="font-bold block text-white">{t.name}</span>
                                        <span className="text-xs text-slate-400">
                                        {t.structure}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2 py-1 text-xs rounded ${
                                            t.status === 'Active' ? 'bg-green-900 text-green-200' : 
                                            t.status === 'Completed' ? 'bg-blue-900 text-blue-200' : 
                                            'bg-slate-800 text-slate-300'
                                        }`}>
                                            {t.status === 'Active' ? 'En Curso' : t.status === 'Completed' ? 'Finalizado' : 'Borrador'}
                                        </span>
                                        <Link to={`/tournament/${t.id}`}>
                                            <Button size="sm">Gestionar</Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            <div>
                 <Card title="Historial de Enfrentamientos">
                   {sortedMatches.length === 0 && (
                       <div className="text-center py-4">
                           <p className="text-slate-400 mb-4">No hay enfrentamientos registrados en esta liga.</p>
                       </div>
                   )}
                   <div className="space-y-2 max-h-[800px] overflow-y-auto pr-2">
                       {sortedMatches.map(m => {
                           const p1 = participants.find(p => p.id === m.participant1Id);
                           const p2 = participants.find(p => p.id === m.participant2Id);
                           return (
                               <LeagueMatchCard 
                                    key={m.id} 
                                    match={m} 
                                    p1={p1} 
                                    p2={p2} 
                                    contextLabel={getMatchContextLabel(m)} 
                               />
                           );
                       })}
                   </div>
               </Card>
            </div>
        </div>
    </div>
  );
};
