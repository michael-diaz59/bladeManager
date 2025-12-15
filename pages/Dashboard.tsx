import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/UI';

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center py-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
            Gestor de Torneos Blade
        </h1>
        <p className="mt-4 text-slate-400">Administra tus torneos, registra Winrates y organiza ligas profesionales.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/blades" className="block transform transition hover:scale-105">
            <Card className="h-full bg-slate-800 hover:bg-slate-700 border-l-4 border-l-purple-500">
                <h2 className="text-xl font-bold text-white mb-2">Blades</h2>
                <p className="text-slate-400 text-sm">Registra y gestiona tu inventario de Blades y sus Tiers.</p>
            </Card>
        </Link>
        
        <Link to="/participants" className="block transform transition hover:scale-105">
            <Card className="h-full bg-slate-800 hover:bg-slate-700 border-l-4 border-l-blue-500">
                <h2 className="text-xl font-bold text-white mb-2">Participantes</h2>
                <p className="text-slate-400 text-sm">Rastrea jugadores, visualiza tasas de victoria e historial de combates.</p>
            </Card>
        </Link>

        <Link to="/leagues" className="block transform transition hover:scale-105">
            <Card className="h-full bg-slate-800 hover:bg-slate-700 border-l-4 border-l-emerald-500">
                <h2 className="text-xl font-bold text-white mb-2">Ligas y Torneos</h2>
                <p className="text-slate-400 text-sm">Organiza campeonatos, genera cuadros de torneo y registra duelos.</p>
            </Card>
        </Link>
      </div>
    </div>
  );
};
