import React, { useState, useEffect } from 'react';
import { Match, Participant } from '../../types';
import { Button } from '../atoms/index';

interface MatchCardProps {
    match: Match;
    p1?: Participant;
    p2?: Participant;
    onUpdate?: (matchId: string, s1: number, s2: number) => void;
    contextLabel?: string;
    readOnly?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, p1, p2, onUpdate, contextLabel, readOnly = false }) => {
    const [s1, setS1] = useState(match.participant1Score || 0);
    const [s2, setS2] = useState(match.participant2Score || 0);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setS1(match.participant1Score || 0);
        setS2(match.participant2Score || 0);
        setIsDirty(false);
    }, [match]);

    const handleChange = (val: string, isP1: boolean) => {
        if (readOnly) return;
        const num = parseInt(val) || 0;
        if (isP1) setS1(num); else setS2(num);
        setIsDirty(true);
    };

    const handleSave = () => {
        if (s1 === s2) {
            alert("Empates no permitidos.");
            return;
        }
        if (onUpdate) onUpdate(match.id, s1, s2);
        setIsDirty(false);
    };

    if (!p1 || !p2) return null;

    const winnerId = readOnly ? match.winnerId : (s1 > s2 ? p1.id : (s2 > s1 ? p2.id : null));
    const label = contextLabel || match.roundLabel || match.phase;

    // Determine styles based on context
    const containerClass = match.phase === 'playoff' 
        ? 'bg-purple-900/20 border-purple-700' 
        : 'bg-slate-700 border-slate-600';

    return (
        <div className={`p-3 rounded border mb-2 flex flex-col gap-2 ${containerClass}`}>
            <div className="flex justify-between items-center">
               <span className="text-xs text-slate-400 uppercase font-bold">{label}</span>
               {isDirty && !readOnly && <span className="text-xs text-yellow-400 animate-pulse">Sin guardar</span>}
               {match.isPlayed && !isDirty && <span className="text-xs text-green-400">Finalizado</span>}
               {!match.isPlayed && !isDirty && readOnly && <span className="text-xs text-yellow-400">Pendiente</span>}
            </div>

            <div className="flex items-center gap-2">
                {/* Player 1 */}
                <div className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-sm truncate w-full text-center ${winnerId === p1.id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                        {p1.name}
                    </span>
                    {readOnly ? (
                         <span className="text-lg font-mono text-white">{match.participant1Score || 0}</span>
                    ) : (
                        <input 
                            type="number" 
                            min="0"
                            value={s1}
                            onChange={(e) => handleChange(e.target.value, true)}
                            className="w-16 bg-slate-800 border border-slate-600 rounded text-center text-white p-1"
                        />
                    )}
                </div>

                <span className="text-slate-500 font-bold text-xs md:text-sm">VS</span>

                {/* Player 2 */}
                <div className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-sm truncate w-full text-center ${winnerId === p2.id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                        {p2.name}
                    </span>
                    {readOnly ? (
                         <span className="text-lg font-mono text-white">{match.participant2Score || 0}</span>
                    ) : (
                        <input 
                            type="number" 
                            min="0"
                            value={s2}
                            onChange={(e) => handleChange(e.target.value, false)}
                            className="w-16 bg-slate-800 border border-slate-600 rounded text-center text-white p-1"
                        />
                    )}
                </div>
            </div>

            {isDirty && !readOnly && (
                <Button onClick={handleSave} size="sm" variant="primary" className="w-full mt-1">
                    Guardar Resultado
                </Button>
            )}
        </div>
    );
};