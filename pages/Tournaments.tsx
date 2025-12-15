import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Tournament, League } from '../types';
import { Button, Card, Input, Select } from '../components/UI';

export const Tournaments: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  
  // New Tournament Form
  const [tnName, setTnName] = useState('');
  const [tnFormat, setTnFormat] = useState('Elimination');
  const [tnPlayoffs, setTnPlayoffs] = useState(false);
  const [tnLeagueId, setTnLeagueId] = useState(''); // Optional

  const loadData = async () => {
    // Get all tournaments (both standalone and league-linked)
    const tData = await dbService.getTournaments();
    setTournaments(tData);
    const lData = await dbService.getLeagues();
    setLeagues(lData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tnName.trim()) return;

    const tId = await dbService.createTournament({
        name: tnName.trim(),
        leagueId: tnLeagueId || undefined, // Send undefined if empty string
        format: tnFormat,
        participantIds: [],
        hasPlayoffs: tnPlayoffs,
        status: 'Draft'
    });
    navigate(`/tournament/${tId}`);
  };

  const getLeagueName = (id?: string) => {
      if (!id) return 'Independiente';
      const league = leagues.find(l => l.id === id);
      return league ? league.name : 'Independiente';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Todos los Torneos</h1>
      </div>

      <Card title="Crear Nuevo Torneo" className="mb-6">
        <form onSubmit={handleCreateTournament} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                    label="Nombre del Torneo" 
                    value={tnName} 
                    onChange={e => setTnName(e.target.value)} 
                    required 
                    placeholder="ej: Copa Blade 2024"
                />
                <Select label="Liga (Opcional)" value={tnLeagueId} onChange={e => setTnLeagueId(e.target.value)}>
                    <option value="">-- Sin Liga (Independiente) --</option>
                    {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <Select label="Formato" value={tnFormat} onChange={e => setTnFormat(e.target.value)}>
                    <option value="Elimination">Fase de Grupos (Round Robin)</option>
                </Select>
                <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="checkbox" 
                        id="playoffs" 
                        checked={tnPlayoffs} 
                        onChange={e => setTnPlayoffs(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded"
                    />
                    <label htmlFor="playoffs" className="text-sm font-medium text-slate-300">¿Incluir Fase de Playoffs?</label>
                </div>
            </div>

            <Button type="submit">Crear Torneo</Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {tournaments.length === 0 && <p className="text-slate-400">No hay torneos registrados.</p>}
        {tournaments.map(t => (
            <Card key={t.id} className="relative flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-white">{t.name}</h3>
                    <p className="text-sm text-slate-400">
                        Liga: <span className="text-emerald-400">{getLeagueName(t.leagueId)}</span> &bull; 
                        Formato: {t.format === 'Elimination' ? 'Round Robin' : t.format} {t.hasPlayoffs ? '+ Playoffs' : ''}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Participantes: {t.participantIds.length}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
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
            </Card>
        ))}
      </div>
    </div>
  );
};
