import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, leftIcon, rightIcon, fullWidth = false, id, ...props }, ref) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

        const baseClasses = 'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 transition-colors duration-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500';

        const inputClasses = cn(
            baseClasses,
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
        );

        return (
            <div className={cn('relative', fullWidth && 'w-full')}>
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        {label}
                    </label>
                )}

                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <div className="text-gray-400 text-sm">{leftIcon}</div>
                        </div>
                    )}

                    <input
                        id={inputId}
                        className={inputClasses}
                        ref={ref}
                        {...props}
                    />

                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <div className="text-gray-400 text-sm">{rightIcon}</div>
                        </div>
                    )}
                </div>

                {error && (
                    <p className="mt-1 text-sm text-red-600">
                        {error}
                    </p>
                )}

                {helperText && !error && (
                    <p className="mt-1 text-sm text-gray-500">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;