import React from 'react';

export const EmptyState: React.FC<{ message?: string; action?: React.ReactNode }> = ({ message = "No hay datos disponibles.", action }) => (
    <div className="text-center py-8">
        <p className="text-slate-400 mb-4">{message}</p>
        {action}
    </div>
);