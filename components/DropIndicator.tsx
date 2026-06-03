import React from 'react';

interface DropIndicatorProps {
  visible: boolean;
}

const DropIndicator: React.FC<DropIndicatorProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="h-1 my-1.5 w-full bg-sky-400 rounded-full" />
  );
};

export default DropIndicator;
