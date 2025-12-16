import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { AppConfig } from '../types';
import { Button, Card, Input } from '../components/UI';

export const Config: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [newBalanceFormat, setNewBalanceFormat] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const c = await dbService.getConfig();
    setConfig(c);
  };

  const updateScoring = async (win: number, loss: number) => {
    if (!config) return;
    const newConfig = { ...config, scoringSystem: { win, loss } };
    await dbService.updateConfig(newConfig);
    setConfig(newConfig);
  };

  const addBalanceFormat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !newBalanceFormat.trim()) return;
    
    await dbService.addBalanceFormat(newBalanceFormat.trim());
    const newConfig = await dbService.getConfig(); // Reload to get the new ID
    setConfig(newConfig);
    setNewBalanceFormat('');
  };

  const removeBalanceFormat = async (id: string) => {
      if (!config) return;
      const newConfig = { 
          ...config, 
          balanceFormats: config.balanceFormats.filter(f => f.id !== id) 
      };
      await dbService.updateConfig(newConfig);
      setConfig(newConfig);
  };

  if (!config) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Configuración del Sistema</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Sistema de Puntuación">
              <p className="text-slate-400 text-sm mb-4">Define cuántos puntos reciben los jugadores por victoria y derrota en la tabla de clasificación.</p>
              
              <div className="space-y-3">
                  <div className="flex items-center p-3 border border-slate-700 rounded bg-slate-800">
                      <input 
                          type="radio" 
                          id="scoreA" 
                          name="scoring" 
                          checked={config.scoringSystem.win === 2 && config.scoringSystem.loss === 1}
                          onChange={() => updateScoring(2, 1)}
                          className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600"
                      />
                      <label htmlFor="scoreA" className="ml-2 text-sm text-slate-200">
                          Victoria: <span className="text-emerald-400 font-bold">2 puntos</span> / Derrota: <span className="text-red-400 font-bold">1 punto</span>
                      </label>
                  </div>

                  <div className="flex items-center p-3 border border-slate-700 rounded bg-slate-800">
                      <input 
                          type="radio" 
                          id="scoreB" 
                          name="scoring"
                          checked={config.scoringSystem.win === 1 && config.scoringSystem.loss === 0}
                          onChange={() => updateScoring(1, 0)}
                          className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600"
                      />
                      <label htmlFor="scoreB" className="ml-2 text-sm text-slate-200">
                          Victoria: <span className="text-emerald-400 font-bold">1 punto</span> / Derrota: <span className="text-red-400 font-bold">0 puntos</span>
                      </label>
                  </div>
              </div>
          </Card>

          <Card title="Formatos de Balance">
              <p className="text-slate-400 text-sm mb-4">Gestiona los formatos de balance (reglas de juego) obligatorios para crear torneos.</p>
              
              <form onSubmit={addBalanceFormat} className="flex gap-2 mb-4">
                  <Input 
                    value={newBalanceFormat} 
                    onChange={e => setNewBalanceFormat(e.target.value)} 
                    placeholder="Nuevo Formato (ej: Standard, Limited)" 
                    className="mb-0 flex-1"
                  />
                  <Button type="submit">Añadir</Button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                  {config.balanceFormats.map(fmt => (
                      <div key={fmt.id} className="flex justify-between items-center bg-slate-700 p-2 rounded">
                          <span className="text-white">{fmt.name}</span>
                          <button 
                            onClick={() => removeBalanceFormat(fmt.id)} 
                            className="text-red-400 hover:text-red-300 text-xs px-2"
                          >
                              Eliminar
                          </button>
                      </div>
                  ))}
                  {config.balanceFormats.length === 0 && <p className="text-slate-500 text-xs">No hay formatos de balance definidos.</p>}
              </div>
          </Card>
      </div>
    </div>
  );
};
