import React from 'react';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => (
    <select
      className={`block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-slate-800 text-white ${className}`}
      {...props}
    >
      {children}
    </select>
);