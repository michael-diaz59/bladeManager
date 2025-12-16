import React from 'react';
import { Link } from 'react-router-dom';
import { Tournament } from '../../types';
import { Badge, Button } from '../atoms/index';
import { Card } from '../molecules/index';

export const TournamentListItem: React.FC<{ 
    tournament: Tournament; 
    leagueName?: string; 
    balanceName?: string; 
}> = ({ tournament, leagueName, balanceName }) => (
    <Card className="relative flex justify-between items-center">
        <div>
            <h3 className="text-lg font-bold text-white">
                {tournament.name}
                <span className="ml-2 text-xs font-normal text-slate-400">
                    ({new Date(tournament.createdAt).toLocaleDateString()})
                </span>
            </h3>
            <p className="text-sm text-slate-400">
                Liga: <span className="text-emerald-400">{leagueName || 'Independiente'}</span> &bull; 
                Estilo: {tournament.structure} &bull; 
                Balance: <span className="text-blue-400">{balanceName || 'Desc.'}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Participantes: {tournament.participantIds.length}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
            <Badge color={
                tournament.status === 'Active' ? 'green' : 
                tournament.status === 'Completed' ? 'blue' : 'slate'
            }>
                {tournament.status === 'Active' ? 'En Curso' : tournament.status === 'Completed' ? 'Finalizado' : 'Borrador'}
            </Badge>
            <Link to={`/tournament/${tournament.id}`}>
                <Button size="sm">Gestionar</Button>
            </Link>
        </div>
    </Card>
);