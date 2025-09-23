import React from 'react';

interface CheckboxProps {
  id$1: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled$2: boolean;
  className$3: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  className = ''
}) => {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className={`
        h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    />
  );
};

export default Checkbox;