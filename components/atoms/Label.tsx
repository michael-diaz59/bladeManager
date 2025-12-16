import React from 'react';

export const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <label className={`block text-sm font-medium text-slate-300 mb-1 ${className}`}>{children}</label>
);