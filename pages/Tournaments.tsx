import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Tournament, League, BalanceFormat, TournamentStructure } from '../types';
import { Button, Card, Input, Select } from '../components/UI';

export const Tournaments: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [balanceFormats, setBalanceFormats] = useState<BalanceFormat[]>([]);
  
  // New Tournament Form
  const [tnName, setTnName] = useState('');
  const [tnStructure, setTnStructure] = useState<TournamentStructure | ''>('');
  const [tnBalanceId, setTnBalanceId] = useState('');
  const [tnLeagueId, setTnLeagueId] = useState('');

  // Date Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const loadData = async () => {
    const tData = await dbService.getTournaments();
    const sortedT = tData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setTournaments(sortedT);
    setFilteredTournaments(sortedT);

    const lData = await dbService.getLeagues();
    setLeagues(lData);

    const config = await dbService.getConfig();
    setBalanceFormats(config.balanceFormats);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = tournaments;
    if (filterStartDate) {
        const start = new Date(filterStartDate).getTime();
        result = result.filter(t => (t.createdAt || 0) >= start);
    }
    if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();
        result = result.filter(t => (t.createdAt || 0) <= endTime);
    }
    setFilteredTournaments(result);
  }, [filterStartDate, filterEndDate, tournaments]);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tnName.trim()) return;
    if (!tnStructure) return alert("Debes seleccionar una estructura de torneo.");
    if (!tnBalanceId) return alert("Debes seleccionar un formato de balance.");

    const tId = await dbService.createTournament({
        name: tnName.trim(),
        leagueId: tnLeagueId || undefined,
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

  const getLeagueName = (id?: string) => {
      if (!id) return 'Independiente';
      const league = leagues.find(l => l.id === id);
      return league ? league.name : 'Independiente';
  };

  const getBalanceName = (id: string) => {
      const b = balanceFormats.find(f => f.id === id);
      return b ? b.name : 'Desc.';
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Fecha desconocida';
    return new Date(timestamp).toLocaleDateString();
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
                <Select label="Estructura del Torneo" value={tnStructure} onChange={e => setTnStructure(e.target.value as TournamentStructure)}>
                    <option value="">-- Seleccionar Estructura --</option>
                    <option value="Round Robin">Round Robin (Solo Fase de Grupos)</option>
                    <option value="Playoff Only">Solo Playoffs (Eliminación Directa)</option>
                    <option value="Round Robin + Playoffs">Ambas (Grupos + Playoffs)</option>
                </Select>
                
                <Select label="Formato de Balance" value={tnBalanceId} onChange={e => setTnBalanceId(e.target.value)}>
                    <option value="">-- Seleccionar Balance --</option>
                    {balanceFormats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
            </div>

            <Button type="submit" disabled={balanceFormats.length === 0}>Crear Torneo</Button>
            {balanceFormats.length === 0 && <p className="text-red-400 text-xs mt-1">Ve a Configuración para añadir formatos de balance.</p>}
        </form>
      </Card>

      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-wrap gap-4 items-end">
          <Input 
              label="Filtrar desde" 
              type="date" 
              value={filterStartDate} 
              onChange={e => setFilterStartDate(e.target.value)}
              className="mb-0 w-40"
          />
          <Input 
              label="Filtrar hasta" 
              type="date" 
              value={filterEndDate} 
              onChange={e => setFilterEndDate(e.target.value)}
              className="mb-0 w-40"
          />
          <div className="text-slate-400 text-sm pb-2">
              Mostrando {filteredTournaments.length} torneos
          </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredTournaments.length === 0 && <p className="text-slate-400">No hay torneos en este rango de fechas.</p>}
        {filteredTournaments.map(t => (
            <Card key={t.id} className="relative flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-white">
                        {t.name}
                        <span className="ml-2 text-xs font-normal text-slate-400">({formatDate(t.createdAt)})</span>
                    </h3>
                    <p className="text-sm text-slate-400">
                        Liga: <span className="text-emerald-400">{getLeagueName(t.leagueId)}</span> &bull; 
                        Estilo: {t.structure} &bull; 
                        Balance: <span className="text-blue-400">{getBalanceName(t.balanceFormatId)}</span>
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
