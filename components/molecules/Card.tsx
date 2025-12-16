import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; title?: string; className?: string; actions?: React.ReactNode }> = ({ children, title, className = '', actions }) => (
  <div className={`bg-slate-800 overflow-hidden shadow rounded-lg border border-slate-700 ${className}`}>
    {title && (
      <div className="px-4 py-5 sm:px-6 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-white">{title}</h3>
        {actions && <div>{actions}</div>}
      </div>
    )}
    <div className="px-4 py-5 sm:p-6">{children}</div>
  </div>
);