import React from 'react';
import { Card } from '../molecules/index';
import { Badge, Table, THead, TBody, Th, Tr, Td } from '../atoms/index';

export interface StandingRow {
    id: string;
    name: string;
    points: number;
    played: number;
    wins: number;
    losses?: number;
    pointsFor?: number;
    pointsAgainst?: number;
    winrate?: number;
}

export const StandingsTable: React.FC<{ data: StandingRow[]; title?: string }> = ({ data, title }) => (
    <Card title={title}>
        <Table>
            <THead>
                <Tr>
                    <Th className="px-2">Pos</Th>
                    <Th className="px-2">Nombre</Th>
                    <Th className="px-2 text-center text-emerald-400">Pts</Th>
                    <Th className="px-2 text-center">PJ</Th>
                    <Th className="px-2 text-center text-green-300">G</Th>
                    {data[0]?.losses !== undefined && <Th className="px-2 text-center text-red-300">P</Th>}
                    {data[0]?.pointsFor !== undefined && (
                        <>
                            <Th className="px-2 text-center" title="Puntos a Favor">PF</Th>
                            <Th className="px-2 text-center" title="Puntos en Contra">PC</Th>
                            <Th className="px-2 text-center" title="Diferencia">Diff</Th>
                        </>
                    )}
                    {data[0]?.winrate !== undefined && <Th className="px-2 text-center">Winrate</Th>}
                </Tr>
            </THead>
            <TBody>
                {data.length === 0 && <Tr><Td className="text-center text-slate-500" >No hay datos.</Td></Tr>}
                {data.map((row, idx) => (
                    <Tr key={row.id}>
                        <Td className="text-slate-500">{idx + 1}</Td>
                        <Td className="font-medium text-white">{row.name}</Td>
                        <Td className="text-center font-bold text-emerald-400 text-lg">{row.points}</Td>
                        <Td className="text-center text-slate-300">{row.played}</Td>
                        <Td className="text-center text-green-300">{row.wins}</Td>
                        {row.losses !== undefined && <Td className="text-center text-red-300">{row.losses}</Td>}
                        {row.pointsFor !== undefined && (
                            <>
                                <Td className="text-center text-slate-300">{row.pointsFor}</Td>
                                <Td className="text-center text-slate-300">{row.pointsAgainst}</Td>
                                <Td className="text-center text-slate-400">{(row.pointsFor || 0) - (row.pointsAgainst || 0)}</Td>
                            </>
                        )}
                        {row.winrate !== undefined && (
                            <Td className="text-center">
                                <Badge color={row.winrate >= 50 ? 'green' : 'yellow'}>{row.winrate}%</Badge>
                            </Td>
                        )}
                    </Tr>
                ))}
            </TBody>
        </Table>
    </Card>
);