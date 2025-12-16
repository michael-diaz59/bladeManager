import React from 'react';
import { Input } from '../atoms/index';
import { FormField } from './FormField';

export const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className, ...props }) => (
    <FormField label={label} className={className}>
        <Input {...props} />
    </FormField>
);