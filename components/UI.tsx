import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  className = '', 
  variant = 'primary', 
  size = 'md',
  ...props 
}) => {
  const baseStyle = "inline-flex justify-center items-center border border-transparent font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
    secondary: "bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
  };

  return (
    <button className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
    <input
      className={`appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-slate-800 text-white ${className}`}
      {...props}
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className = '', children, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
    <select
      className={`block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-slate-800 text-white ${className}`}
      {...props}
    >
      {children}
    </select>
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; title?: string; className?: string }> = ({ children, title, className = '' }) => (
  <div className={`bg-slate-800 overflow-hidden shadow rounded-lg border border-slate-700 ${className}`}>
    {title && (
      <div className="px-4 py-5 sm:px-6 border-b border-slate-700">
        <h3 className="text-lg leading-6 font-medium text-white">{title}</h3>
      </div>
    )}
    <div className="px-4 py-5 sm:p-6">{children}</div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'emerald' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-900 text-${color}-100 border border-${color}-700`}>
    {children}
  </span>
);