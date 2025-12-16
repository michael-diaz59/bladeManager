import React from 'react';

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'emerald' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-900 text-${color}-100 border border-${color}-700`}>
    {children}
  </span>
);