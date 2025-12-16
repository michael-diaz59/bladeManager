import React from 'react';
import { Select } from '../atoms/index';
import { FormField } from './FormField';

export const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className, children, ...props }) => (
    <FormField label={label} className={className}>
        <Select {...props}>{children}</Select>
    </FormField>
);