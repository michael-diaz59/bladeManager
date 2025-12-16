import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { dbService } from '../services/db';
import { League, Tournament, Participant, Blade, SelectedBlade } from '../types';
import { Button, Card, Input, Select } from '../components/UI';

export const LeagueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [blades, setBlades] = useState<Blade[]>([]);
  
  // Quick Match State
  const [qmP1, setQmP1] = useState('');
  const [qmP2, setQmP2] = useState('');
  const [qmS1, setQmS1] = useState<number>(0); // Score 1
  const [qmS2, setQmS2] = useState<number>(0); // Score 2
  
  // New Tournament State
  const [tnName, setTnName] = useState('');
  const [tnFormat, setTnFormat] = useState('Elimination'); // Mapped to Round Robin in code logic
  const [tnPlayoffs, setTnPlayoffs] = useState(false);

  useEffect(() => {
    if (id) {
        dbService.getLeagues().then(ls => setLeague(ls.find(l => l.id === id) || null));
        dbService.getTournaments(id).then(setTournaments);
        dbService.getParticipants().then(setParticipants);
        dbService.getBlades().then(setBlades);
    }
  }, [id]);

  if (!league) return <div>Cargando...</div>;

  const handleCreateTournament = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!id) return;
      const tId = await dbService.createTournament({
          name: tnName,
          leagueId: id,
          format: tnFormat,
          participantIds: [],
          hasPlayoffs: tnPlayoffs,
          status: 'Draft'
      });
      navigate(`/tournament/${tId}`);
  };

  const handleQuickMatch = async () => {
      if(!qmP1 || !qmP2 || qmP1 === qmP2) {
          alert("Selecciona 2 participantes diferentes");
          return;
      }
      
      const mockBlades: SelectedBlade[] = blades.slice(0, 1).map(b => ({ bladeId: b.id, name: b.name }));
      
      // Determine winner based on score
      let winnerId: string | null = null;
      if (qmS1 > qmS2) winnerId = qmP1;
      else if (qmS2 > qmS1) winnerId = qmP2;

      await dbService.createMatch({
          leagueId: league.id,
          participant1Id: qmP1,
          participant2Id: qmP2,
          participant1Score: qmS1,
          participant2Score: qmS2,
          participant1Blades: mockBlades,
          participant2Blades: mockBlades,
          winnerId: winnerId,
          isPlayed: true, // Quick matches are always immediately played
          date: Date.now()
      });

      alert("Duelo registrado y estadísticas actualizadas!");
      // Reset form
      setQmP1('');
      setQmP2('');
      setQmS1(0);
      setQmS2(0);
      // Reload participants to refresh stats if shown somewhere
      dbService.getParticipants().then(setParticipants);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Link to="/leagues" className="text-slate-400 hover:text-white">&larr; Volver</Link>
            <h1 className="text-2xl font-bold text-white">{league.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tournament Creation */}
            <Card title="Comenzar Nuevo Torneo en esta Liga">
                <form onSubmit={handleCreateTournament} className="space-y-4">
                    <Input label="Nombre del Torneo" value={tnName} onChange={e => setTnName(e.target.value)} required />
                    <Select label="Formato" value={tnFormat} onChange={e => setTnFormat(e.target.value)}>
                        <option value="Elimination">Fase de Grupos (Round Robin)</option>
                    </Select>
                    
                    <div className="flex items-center gap-2 mb-4">
                        <input 
                            type="checkbox" 
                            id="playoffs" 
                            checked={tnPlayoffs} 
                            onChange={e => setTnPlayoffs(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded"
                        />
                        <label htmlFor="playoffs" className="text-sm font-medium text-slate-300">¿Incluir Fase de Playoffs?</label>
                    </div>

                    <Button type="submit">Crear Torneo</Button>
                </form>
            </Card>

            {/* Quick Match (Standalone) */}
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

                    <p className="text-xs text-slate-500">* El ganador se calcula automáticamente por puntos. Los participantes se añaden a la liga.</p>
                    <Button onClick={handleQuickMatch} variant="secondary" className="w-full">Registrar Resultado</Button>
                </div>
            </Card>
        </div>

        <Card title="Torneos en la Liga">
            <div className="space-y-2">
                {tournaments.length === 0 && <p className="text-slate-400">No se encontraron torneos.</p>}
                {tournaments.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700 rounded border border-slate-600">
                        <div>
                            <span className="font-bold block text-white">{t.name}</span>
                            <span className="text-xs text-slate-400">
                              {t.format === 'Elimination' ? 'Round Robin' : t.format} 
                              {t.hasPlayoffs ? ' + Playoffs' : ''}
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
  );
};