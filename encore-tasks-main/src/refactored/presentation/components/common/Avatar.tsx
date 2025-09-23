import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  initials, 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg'
  };

  if (src) {
    return (
      <Image 
        src={src} 
        alt={alt || 'Avatar'} 
        width={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 48}
        height={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 48}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-full bg-gray-300 flex items-center justify-center font-medium text-gray-700 ${sizeClasses[size]} ${className}`}>
      {initials || '?'}
    </div>
  );
};

export default Avatar;