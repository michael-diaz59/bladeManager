import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dbService } from '../services/db';
import { League, Tournament } from '../types';
import { Button, Card, Input } from '../components/UI';

export const Leagues: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [filteredLeagues, setFilteredLeagues] = useState<League[]>([]);
  const [tournaments, setTournaments] = useState<Record<string, Tournament[]>>({});
  const [newLeagueName, setNewLeagueName] = useState('');
  
  // Date Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const loadData = async () => {
    const lData = await dbService.getLeagues();
    // Sort by date descending (newest first)
    const sortedLeagues = lData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setLeagues(sortedLeagues);
    setFilteredLeagues(sortedLeagues);
    
    // Load tournaments for preview
    const tMap: Record<string, Tournament[]> = {};
    for (const l of sortedLeagues) {
        tMap[l.id] = await dbService.getTournaments(l.id);
    }
    setTournaments(tMap);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = leagues;

    if (filterStartDate) {
        const start = new Date(filterStartDate).getTime();
        result = result.filter(l => (l.createdAt || 0) >= start);
    }

    if (filterEndDate) {
        // Set to end of day
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();
        result = result.filter(l => (l.createdAt || 0) <= endTime);
    }

    setFilteredLeagues(result);
  }, [filterStartDate, filterEndDate, leagues]);

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) return;
    
    const id = await dbService.createLeague(newLeagueName.trim());
    
    if (id) {
        setNewLeagueName('');
        loadData();
    } else {
        alert("Ya existe una Liga con ese nombre.");
    }
  };

  const formatDate = (timestamp?: number) => {
      if (!timestamp) return 'Fecha desconocida';
      return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Ligas</h1>
      </div>

      <Card title="Crear Nueva Liga" className="mb-6">
        <form onSubmit={handleCreateLeague} className="flex gap-4 items-end">
            <Input 
                label="Nombre de la Liga" 
                value={newLeagueName} 
                onChange={e => setNewLeagueName(e.target.value)} 
                className="mb-0 flex-1"
                placeholder="ej: Campeonato de Verano 2024"
            />
            <Button type="submit">Crear Liga</Button>
        </form>
      </Card>
      
      {/* Filters Section */}
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
              Mostrando {filteredLeagues.length} ligas
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredLeagues.map(league => (
            <Card key={league.id} title={league.name} className="relative">
                 <Link to={`/league/${league.id}`} className="absolute top-4 right-4 text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                    Gestionar Liga &rarr;
                </Link>
                <div className="mt-2 text-sm text-slate-400">
                    <p>Creada el: <span className="text-white">{formatDate(league.createdAt)}</span></p>
                    <p>Participantes: <span className="text-white">{league.participantIds?.length || 0}</span></p>
                    <p>Torneos: <span className="text-white">{tournaments[league.id]?.length || 0}</span></p>
                </div>
                
                <div className="mt-4 border-t border-slate-700 pt-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Torneos en Liga</h4>
                    <ul className="space-y-2">
                        {tournaments[league.id]?.map(t => (
                            <li key={t.id}>
                                <Link to={`/tournament/${t.id}`} className="block p-2 bg-slate-900 rounded hover:bg-slate-700 transition flex justify-between">
                                    <span>{t.name}</span>
                                    <span className="text-xs text-slate-500">
                                      {t.status === 'Active' ? 'En Curso' : t.status === 'Completed' ? 'Finalizado' : 'Borrador'}
                                    </span>
                                </Link>
                            </li>
                        ))}
                         {(!tournaments[league.id] || tournaments[league.id].length === 0) && (
                            <li className="text-slate-500 text-sm italic">No hay torneos aún.</li>
                        )}
                    </ul>
                    <div className="mt-4">
                        <Link to={`/league/${league.id}`} className="inline-block w-full text-center py-2 border border-slate-600 rounded text-slate-300 hover:bg-slate-700 text-sm">
                            + Nuevo Torneo / Duelo
                        </Link>
                    </div>
                </div>
            </Card>
        ))}
        {filteredLeagues.length === 0 && <p className="text-slate-400">No hay ligas en este rango de fechas.</p>}
      </div>
    </div>
  );
};