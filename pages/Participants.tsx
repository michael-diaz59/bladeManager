import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Participant, Match, League, AppConfig, Tournament } from '../types';
import { Button, Input } from '../components/atoms/index';
import { Card, SectionHeader, SelectField } from '../components/molecules/index';
import { StandingsTable, StandingRow } from '../components/organisms/index';

interface ParticipantStats extends Participant {
  dynamicWins: number;
  dynamicLosses: number;
  dynamicPlayed: number;
  dynamicPoints: number;
  dynamicWinrate: number;
}

export const Participants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  // UI State
  const [displayStats, setDisplayStats] = useState<ParticipantStats[]>([]);
  const [newName, setNewName] = useState('');
  
  // Filters
  const [filterType, setFilterType] = useState<'ALL' | 'LEAGUE_ALL' | 'LEAGUE_SPECIFIC' | 'STANDALONE' | 'BALANCE_FORMAT'>('ALL');
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedBalanceFormatIds, setSelectedBalanceFormatIds] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState('');

  const loadData = async () => {
    const pData = await dbService.getParticipants();
    const mData = await dbService.getAllMatches();
    const lData = await dbService.getLeagues();
    const tData = await dbService.getTournaments();
    const cData = await dbService.getConfig();
    
    setParticipants(pData);
    setMatches(mData);
    setLeagues(lData);
    setTournaments(tData);
    setConfig(cData);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate Stats based on filters
  useEffect(() => {
    if (!config) return;

    const statsMap: Record<string, ParticipantStats> = {};

    const tournamentBalanceMap = new Map<string, string>();
    tournaments.forEach(t => {
        if (t.balanceFormatId) {
            tournamentBalanceMap.set(t.id, t.balanceFormatId);
        }
    });

    participants.forEach(p => {
        statsMap[p.id] = {
            ...p,
            dynamicWins: 0,
            dynamicLosses: 0,
            dynamicPlayed: 0,
            dynamicPoints: 0,
            dynamicWinrate: 0
        };
    });

    matches.forEach(m => {
        if (!m.isPlayed) return;

        let includeMatch = false;

        switch (filterType) {
            case 'ALL': includeMatch = true; break;
            case 'LEAGUE_ALL': includeMatch = !!m.leagueId; break;
            case 'LEAGUE_SPECIFIC': includeMatch = m.leagueId === selectedLeagueId; break;
            case 'STANDALONE': includeMatch = !!m.tournamentId && !m.leagueId; break;
            case 'BALANCE_FORMAT':
                if (m.tournamentId) {
                    const balanceId = tournamentBalanceMap.get(m.tournamentId);
                    if (balanceId && selectedBalanceFormatIds.includes(balanceId)) {
                        includeMatch = true;
                    }
                }
                break;
        }

        if (includeMatch) {
            [m.participant1Id, m.participant2Id].forEach(pid => {
                if(statsMap[pid]) {
                    statsMap[pid].dynamicPlayed++;
                    if (m.winnerId === pid) {
                        statsMap[pid].dynamicWins++;
                        statsMap[pid].dynamicPoints += config.scoringSystem.win;
                    } else {
                        statsMap[pid].dynamicLosses++;
                        statsMap[pid].dynamicPoints += config.scoringSystem.loss;
                    }
                }
            });
        }
    });

    let result = Object.values(statsMap).map(p => ({
        ...p,
        dynamicWinrate: p.dynamicPlayed > 0 ? Math.round((p.dynamicWins / p.dynamicPlayed) * 100) : 0
    }));

    if (nameFilter) {
        result = result.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()));
    }

    result.sort((a, b) => {
        if (b.dynamicPoints !== a.dynamicPoints) return b.dynamicPoints - a.dynamicPoints;
        return b.dynamicWinrate - a.dynamicWinrate;
    });

    setDisplayStats(result);

  }, [participants, matches, filterType, selectedLeagueId, selectedBalanceFormatIds, config, nameFilter, tournaments]);


  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const result = await dbService.addParticipant(newName.trim());
    if (result) {
      setNewName('');
      loadData();
    } else {
      alert('Ya existe un participante con este nombre.');
    }
  };

  const toggleBalanceFormat = (id: string) => {
      setSelectedBalanceFormatIds(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const tableData: StandingRow[] = displayStats.map(p => ({
      id: p.id,
      name: p.name,
      points: p.dynamicPoints,
      played: p.dynamicPlayed,
      wins: p.dynamicWins,
      losses: p.dynamicLosses,
      winrate: p.dynamicWinrate
  }));

  return (
    <div className="space-y-6">
      <SectionHeader title="Estadísticas de Participantes">
        <form onSubmit={handleAdd} className="flex gap-2">
            <Input 
                placeholder="Nombre del Nuevo Participante" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="w-64"
            />
            <Button type="submit">Añadir</Button>
        </form>
      </SectionHeader>
      
      <Card title="Filtros de Estadísticas">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField 
                label="Tipo de Enfrentamiento"
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                  <option value="ALL">Todo (Global)</option>
                  <option value="LEAGUE_ALL">Todas las Ligas</option>
                  <option value="LEAGUE_SPECIFIC">Liga Específica</option>
                  <option value="STANDALONE">Torneos Independientes</option>
                  <option value="BALANCE_FORMAT">Por Formato de Balance</option>
              </SelectField>

              {filterType === 'LEAGUE_SPECIFIC' && (
                  <SelectField 
                    label="Seleccionar Liga"
                    value={selectedLeagueId} 
                    onChange={(e) => setSelectedLeagueId(e.target.value)}
                  >
                      <option value="">-- Seleccionar --</option>
                      {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </SelectField>
              )}

              {filterType === 'BALANCE_FORMAT' && config && (
                  <div>
                      <label className="block text-sm text-slate-400 mb-1">Seleccionar Formatos</label>
                      <div className="flex flex-wrap gap-2 bg-slate-700 p-2 rounded border border-slate-600 max-h-24 overflow-y-auto">
                          {config.balanceFormats.map(fmt => (
                              <label key={fmt.id} className="inline-flex items-center gap-2 bg-slate-800 px-2 py-1 rounded cursor-pointer hover:bg-slate-600 border border-slate-600">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedBalanceFormatIds.includes(fmt.id)}
                                    onChange={() => toggleBalanceFormat(fmt.id)}
                                    className="rounded border-slate-500 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                                  />
                                  <span className="text-xs text-slate-200">{fmt.name}</span>
                              </label>
                          ))}
                          {config.balanceFormats.length === 0 && <span className="text-xs text-slate-400">No hay formatos configurados.</span>}
                      </div>
                  </div>
              )}

              <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Buscar Jugador</label>
                  <Input 
                    type="text" 
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Nombre..."
                  />
              </div>
          </div>
      </Card>

      <StandingsTable data={tableData} />
    </div>
  );
};