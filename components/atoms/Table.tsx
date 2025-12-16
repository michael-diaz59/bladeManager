import React from 'react';

export const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">{children}</table>
    </div>
);

export const THead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <thead className="text-slate-400 border-b border-slate-700 bg-slate-900/50">{children}</thead>
);

export const TBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <tbody className="text-white divide-y divide-slate-800">{children}</tbody>
);

export const Th: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
    <th title={title} className={`pb-3 pt-3 px-4 font-medium uppercase tracking-wider text-xs ${className}`}>{children}</th>
);

export const Tr: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <tr className={`hover:bg-slate-800/50 transition-colors ${className}`}>{children}</tr>
);

export const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <td className={`py-3 px-4 ${className}`}>{children}</td>
);