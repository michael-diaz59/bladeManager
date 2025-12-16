import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { dbService } from '../services/db';
import { League, Tournament, Participant, Match, AppConfig, TournamentStructure } from '../types';
import { Button, Input } from '../components/atoms/index';
import { Card, SelectField, InputField } from '../components/molecules/index';
import { MatchCard, StandingsTable, StandingRow } from '../components/organisms/index';

export const LeagueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leagueMatches, setLeagueMatches] = useState<Match[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  const [qmP1, setQmP1] = useState('');
  const [qmP2, setQmP2] = useState('');
  const [qmS1, setQmS1] = useState<number>(0); 
  const [qmS2, setQmS2] = useState<number>(0); 
  
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

  // Logic calculation
  const calculateLeagueStandings = () => {
      const stats: Record<string, any> = {};

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

          // Logic repeated from before (abbreviated for component reuse)
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
          return b.wins - a.wins;
      });
  };

  const standingsData: StandingRow[] = calculateLeagueStandings().map((s: any) => ({
      ...s
  }));

  const sortedMatches = [...leagueMatches].sort((a, b) => b.date - a.date);

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Link to="/leagues" className="text-slate-400 hover:text-white">&larr; Volver</Link>
            <h1 className="text-2xl font-bold text-white">{league.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Comenzar Nuevo Torneo">
                <form onSubmit={handleCreateTournament}>
                    <InputField label="Nombre del Torneo" value={tnName} onChange={e => setTnName(e.target.value)} required />
                    
                    <SelectField label="Estructura" value={tnStructure} onChange={e => setTnStructure(e.target.value as TournamentStructure)}>
                        <option value="">-- Seleccionar --</option>
                        <option value="Round Robin">Round Robin</option>
                        <option value="Playoff Only">Solo Playoffs</option>
                        <option value="Round Robin + Playoffs">Ambas</option>
                    </SelectField>

                    <SelectField label="Formato de Balance" value={tnBalanceId} onChange={e => setTnBalanceId(e.target.value)}>
                        <option value="">-- Seleccionar Balance --</option>
                        {config.balanceFormats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </SelectField>
                    
                    <Button type="submit" disabled={config.balanceFormats.length === 0} className="w-full mt-4">Crear Torneo</Button>
                </form>
            </Card>

            <Card title="Registrar Duelo Rápido">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <SelectField label="Participante 1" value={qmP1} onChange={e => setQmP1(e.target.value)}>
                            <option value="">Seleccionar P1</option>
                            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectField>
                        <SelectField label="Participante 2" value={qmP2} onChange={e => setQmP2(e.target.value)}>
                            <option value="">Seleccionar P2</option>
                            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <InputField label="Puntos P1" type="number" value={qmS1} onChange={e => setQmS1(parseInt(e.target.value) || 0)} className="text-center" />
                         <InputField label="Puntos P2" type="number" value={qmS2} onChange={e => setQmS2(parseInt(e.target.value) || 0)} className="text-center" />
                    </div>
                    <Button onClick={handleQuickMatch} variant="secondary" className="w-full">Registrar Resultado</Button>
                </div>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <StandingsTable data={standingsData} title="Clasificación General" />
                
                <div className="mt-6">
                    <Card title="Torneos Asociados">
                        <div className="space-y-2">
                            {tournaments.length === 0 && <p className="text-slate-400">No se encontraron torneos.</p>}
                            {tournaments.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700 rounded border border-slate-600">
                                    <div>
                                        <span className="font-bold block text-white">{t.name}</span>
                                        <span className="text-xs text-slate-400">{t.structure}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
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
                   <div className="space-y-2 max-h-[800px] overflow-y-auto pr-2">
                       {sortedMatches.map(m => {
                           const p1 = participants.find(p => p.id === m.participant1Id);
                           const p2 = participants.find(p => p.id === m.participant2Id);
                           const t = tournaments.find(tx => tx.id === m.tournamentId);
                           const contextLabel = t ? `Torneo: ${t.name} (${m.phase === 'playoff' ? m.roundLabel : 'Grupos'})` : 'Duelo Rápido';

                           return (
                               <MatchCard 
                                    key={m.id} 
                                    match={m} 
                                    p1={p1} 
                                    p2={p2} 
                                    contextLabel={contextLabel}
                                    readOnly={true}
                               />
                           );
                       })}
                       {sortedMatches.length === 0 && <p className="text-slate-400 text-center">No hay datos.</p>}
                   </div>
               </Card>
            </div>
        </div>
    </div>
  );
};