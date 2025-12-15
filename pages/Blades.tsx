import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Blade } from '../types';
import { Button, Card, Input, Select } from '../components/UI';

export const Blades: React.FC = () => {
  const [blades, setBlades] = useState<Blade[]>([]);
  const [name, setName] = useState('');
  const [tier, setTier] = useState('B');

  const loadData = async () => {
    const data = await dbService.getBlades();
    setBlades(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await dbService.addBlade(name.trim(), tier);
    setName('');
    loadData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Registro de Blades</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
            <Card title="Registrar Blade">
                <form onSubmit={handleAdd} className="space-y-4">
                    <Input label="Nombre del Blade" value={name} onChange={e => setName(e.target.value)} required />
                    <Select label="Tier (Nivel)" value={tier} onChange={e => setTier(e.target.value)}>
                        <option value="S">Tier S</option>
                        <option value="A">Tier A</option>
                        <option value="B">Tier B</option>
                        <option value="C">Tier C</option>
                        <option value="D">Tier D</option>
                    </Select>
                    <Button type="submit" className="w-full">Registrar</Button>
                </form>
            </Card>
        </div>

        <div className="md:col-span-2">
            <Card title="Lista de Blades">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {blades.map(blade => (
                        <div key={blade.id} className="bg-slate-700 p-4 rounded flex justify-between items-center border border-slate-600">
                            <span className="font-bold text-white truncate">{blade.name}</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                blade.tier === 'S' ? 'bg-purple-900 text-purple-200' :
                                blade.tier === 'A' ? 'bg-red-900 text-red-200' :
                                'bg-slate-800 text-slate-300'
                            }`}>
                                {blade.tier}
                            </span>
                        </div>
                    ))}
                    {blades.length === 0 && <p className="text-slate-400">No hay blades registrados.</p>}
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
};
