import React from 'react';
import { cn } from '../../lib/utils';

export interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'secondary' | 'white' | 'gray';
    text?: string;
    className?: string;
    overlay?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
    size = 'md',
    color = 'primary',
    text,
    className,
    overlay = false,
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const colorClasses = {
        primary: 'border-primary-600',
        secondary: 'border-secondary-600',
        white: 'border-white',
        gray: 'border-gray-600',
    };

    const spinner = (
        <div className={cn('flex flex-col items-center justify-center', className)}>
            <div
                className={cn(
                    'animate-spin rounded-full border-2 border-t-transparent',
                    sizeClasses[size],
                    colorClasses[color]
                )}
            />
            {text && (
                <span className={cn(
                    'mt-2 text-sm',
                    color === 'white' ? 'text-white' : 'text-gray-600'
                )}>
                    {text}
                </span>
            )}
        </div>
    );

    if (overlay) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default Loader;