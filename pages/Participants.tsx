import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Participant } from '../types';
import { Button, Card, Input } from '../components/UI';

export const Participants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filtered, setFiltered] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    const data = await dbService.getParticipants();
    // Sort by winrate desc
    const sorted = data.sort((a, b) => b.winrate - a.winrate);
    setParticipants(sorted);
    setFiltered(sorted);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    setFiltered(participants.filter(p => p.name.toLowerCase().includes(lower)));
  }, [searchTerm, participants]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const result = await dbService.addParticipant(newName.trim());
    if (result) {
      setNewName('');
      setError('');
      loadData();
    } else {
      setError('Ya existe un participante con este nombre.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Participantes</h1>
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
      
      {error && <div className="p-3 bg-red-900/50 text-red-200 rounded-md text-sm">{error}</div>}

      <Card>
        <Input 
          placeholder="Buscar por nombre..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Winrate (Tasa de Victoria)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Victorias</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Total Partidas</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{p.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.winrate >= 50 ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'
                    }`}>
                      {p.winrate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{p.wins}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{p.totalMatches}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-slate-400">No se encontraron participantes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
