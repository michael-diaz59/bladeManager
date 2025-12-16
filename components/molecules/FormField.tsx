import React from 'react';
import { Label } from '../atoms/index';

export const FormField: React.FC<{ label?: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
    <div className={`mb-4 ${className}`}>
        {label && <Label>{label}</Label>}
        {children}
    </div>
);