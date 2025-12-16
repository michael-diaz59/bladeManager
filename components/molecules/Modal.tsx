import React from 'react';
import { Button } from '../atoms/index';

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full border border-slate-600 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
            {children}
            <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={onClose} size="sm">Cerrar</Button>
            </div>
        </div>
    </div>
);