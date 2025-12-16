import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Tournament, League, BalanceFormat, TournamentStructure } from '../types';
import { Button, Input } from '../components/atoms/index';
import { Card, SectionHeader, InputField, SelectField } from '../components/molecules/index';
import { TournamentListItem } from '../components/organisms/index';

export const Tournaments: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [balanceFormats, setBalanceFormats] = useState<BalanceFormat[]>([]);
  
  const [tnName, setTnName] = useState('');
  const [tnStructure, setTnStructure] = useState<TournamentStructure | ''>('');
  const [tnBalanceId, setTnBalanceId] = useState('');
  const [tnLeagueId, setTnLeagueId] = useState('');

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    let result = tournaments;
    if (filterStartDate) result = result.filter(t => (t.createdAt || 0) >= new Date(filterStartDate).getTime());
    if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        result = result.filter(t => (t.createdAt || 0) <= end.getTime());
    }
    setFilteredTournaments(result);
  }, [filterStartDate, filterEndDate, tournaments]);

  const loadData = async () => {
    const tData = await dbService.getTournaments();
    const sortedT = tData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setTournaments(sortedT);
    setFilteredTournaments(sortedT);
    setLeagues(await dbService.getLeagues());
    const config = await dbService.getConfig();
    setBalanceFormats(config.balanceFormats);
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tnName.trim()) return;
    if (!tnStructure || !tnBalanceId) return alert("Faltan campos obligatorios.");

    const tId = await dbService.createTournament({
        name: tnName.trim(),
        leagueId: tnLeagueId || undefined,
        structure: tnStructure as TournamentStructure,
        balanceFormatId: tnBalanceId,
        participantIds: [],
        status: 'Draft'
    });

    if (tId) navigate(`/tournament/${tId}`);
    else alert("Ya existe un Torneo con ese nombre.");
  };

  const getLeagueName = (id?: string) => leagues.find(l => l.id === id)?.name;
  const getBalanceName = (id: string) => balanceFormats.find(f => f.id === id)?.name;

  return (
    <div className="space-y-6">
      <SectionHeader title="Todos los Torneos" />

      <Card title="Crear Nuevo Torneo" className="mb-6">
        <form onSubmit={handleCreateTournament} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nombre del Torneo" value={tnName} onChange={e => setTnName(e.target.value)} required placeholder="ej: Copa Blade 2024" />
                <SelectField label="Liga (Opcional)" value={tnLeagueId} onChange={e => setTnLeagueId(e.target.value)}>
                    <option value="">-- Sin Liga (Independiente) --</option>
                    {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </SelectField>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <SelectField label="Estructura del Torneo" value={tnStructure} onChange={e => setTnStructure(e.target.value as TournamentStructure)}>
                    <option value="">-- Seleccionar Estructura --</option>
                    <option value="Round Robin">Round Robin (Solo Fase de Grupos)</option>
                    <option value="Playoff Only">Solo Playoffs (Eliminación Directa)</option>
                    <option value="Round Robin + Playoffs">Ambas (Grupos + Playoffs)</option>
                </SelectField>
                
                <SelectField label="Formato de Balance" value={tnBalanceId} onChange={e => setTnBalanceId(e.target.value)}>
                    <option value="">-- Seleccionar Balance --</option>
                    {balanceFormats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </SelectField>
            </div>

            <Button type="submit" disabled={balanceFormats.length === 0}>Crear Torneo</Button>
        </form>
      </Card>

      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-wrap gap-4 items-end">
          <InputField label="Filtrar desde" type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="mb-0 w-40" />
          <InputField label="Filtrar hasta" type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="mb-0 w-40" />
          <div className="text-slate-400 text-sm pb-2">Mostrando {filteredTournaments.length} torneos</div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredTournaments.length === 0 && <p className="text-slate-400">No hay torneos en este rango de fechas.</p>}
        {filteredTournaments.map(t => (
            <TournamentListItem 
                key={t.id} 
                tournament={t} 
                leagueName={getLeagueName(t.leagueId)} 
                balanceName={getBalanceName(t.balanceFormatId)} 
            />
        ))}
      </div>
    </div>
  );
};