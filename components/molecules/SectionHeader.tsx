import React from 'react';

export const SectionHeader: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {children && <div className="flex gap-2 items-center">{children}</div>}
    </div>
);