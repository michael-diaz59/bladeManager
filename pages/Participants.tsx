import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Participant, Match, League, AppConfig, Tournament, BalanceFormat } from '../types';
import { Button, Card, Input, Select } from '../components/UI';

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

    // Create a Lookup Map for Tournaments -> BalanceFormatID for O(1) access
    const tournamentBalanceMap = new Map<string, string>();
    tournaments.forEach(t => {
        if (t.balanceFormatId) {
            tournamentBalanceMap.set(t.id, t.balanceFormatId);
        }
    });

    // Initialize map
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

    // Iterate matches and apply filters
    matches.forEach(m => {
        if (!m.isPlayed) return; // Ignore unplayed matches

        let includeMatch = false;

        switch (filterType) {
            case 'ALL':
                includeMatch = true;
                break;
            case 'LEAGUE_ALL':
                includeMatch = !!m.leagueId;
                break;
            case 'LEAGUE_SPECIFIC':
                includeMatch = m.leagueId === selectedLeagueId;
                break;
            case 'STANDALONE':
                includeMatch = !!m.tournamentId && !m.leagueId;
                break;
            case 'BALANCE_FORMAT':
                // Check if match belongs to a tournament, and that tournament has one of the selected balance formats
                if (m.tournamentId) {
                    const balanceId = tournamentBalanceMap.get(m.tournamentId);
                    if (balanceId && selectedBalanceFormatIds.includes(balanceId)) {
                        includeMatch = true;
                    }
                }
                break;
        }

        if (includeMatch) {
            // Apply to P1
            if (statsMap[m.participant1Id]) {
                statsMap[m.participant1Id].dynamicPlayed++;
                if (m.winnerId === m.participant1Id) {
                    statsMap[m.participant1Id].dynamicWins++;
                    statsMap[m.participant1Id].dynamicPoints += config.scoringSystem.win;
                } else {
                    statsMap[m.participant1Id].dynamicLosses++;
                    statsMap[m.participant1Id].dynamicPoints += config.scoringSystem.loss;
                }
            }
            // Apply to P2
            if (statsMap[m.participant2Id]) {
                statsMap[m.participant2Id].dynamicPlayed++;
                if (m.winnerId === m.participant2Id) {
                    statsMap[m.participant2Id].dynamicWins++;
                    statsMap[m.participant2Id].dynamicPoints += config.scoringSystem.win;
                } else {
                    statsMap[m.participant2Id].dynamicLosses++;
                    statsMap[m.participant2Id].dynamicPoints += config.scoringSystem.loss;
                }
            }
        }
    });

    // Calculate Winrates and Convert to Array
    let result = Object.values(statsMap).map(p => ({
        ...p,
        dynamicWinrate: p.dynamicPlayed > 0 ? Math.round((p.dynamicWins / p.dynamicPlayed) * 100) : 0
    }));

    // Filter by Search Name
    if (nameFilter) {
        result = result.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()));
    }

    // Sort by Points DESC, then Winrate DESC
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Estadísticas de Participantes</h1>
        <form onSubmit={handleAdd} className="flex gap-2">
            <Input 
                placeholder="Nombre del Nuevo Participante" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="mb-0 w-64"
            />
            <Button type="submit">Añadir</Button>
        </form>
      </div>
      
      <Card title="Filtros de Estadísticas">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                  <label className="block text-sm text-slate-400 mb-1">Tipo de Enfrentamiento</label>
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                  >
                      <option value="ALL">Todo (Global)</option>
                      <option value="LEAGUE_ALL">Todas las Ligas</option>
                      <option value="LEAGUE_SPECIFIC">Liga Específica</option>
                      <option value="STANDALONE">Torneos Independientes</option>
                      <option value="BALANCE_FORMAT">Por Formato de Balance</option>
                  </select>
              </div>

              {/* League Selector */}
              {filterType === 'LEAGUE_SPECIFIC' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Seleccionar Liga</label>
                    <select 
                        value={selectedLeagueId} 
                        onChange={(e) => setSelectedLeagueId(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                    >
                        <option value="">-- Seleccionar --</option>
                        {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
              )}

              {/* Balance Format Selector (Multi-select style) */}
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
                      <p className="text-xs text-slate-500 mt-1">Selecciona uno o más para sumar estadísticas.</p>
                  </div>
              )}

              <div>
                  <label className="block text-sm text-slate-400 mb-1">Buscar Jugador</label>
                  <input 
                    type="text" 
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Nombre..."
                    className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                  />
              </div>
          </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-emerald-400 uppercase tracking-wider">Puntos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Victorias</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Derrotas</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Total Jugadas</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Winrate</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {displayStats.map((p) => (
                <tr key={p.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{p.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-emerald-400 text-lg">{p.dynamicPoints}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-300">{p.dynamicWins}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-300">{p.dynamicLosses}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-300">{p.dynamicPlayed}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.dynamicWinrate >= 50 ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'
                    }`}>
                      {p.dynamicWinrate}%
                    </span>
                  </td>
                </tr>
              ))}
              {displayStats.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-slate-400">No se encontraron datos con los filtros actuales.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};