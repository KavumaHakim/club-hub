
import React, { useState } from 'react';
import { StarIcon } from './icons/StarIcon';

interface StarRatingProps {
  rating: number | null | undefined;
  onRate: (newRating: number) => void;
  disabled?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRate, disabled }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  // Ensure we always have a number for comparison, default to 0 if null/undefined
  const currentRating = typeof rating === 'number' ? rating : 0;
  const displayRating = hoverRating || currentRating;

  return (
    <div 
      className={`flex items-center ${disabled ? 'cursor-not-allowed' : ''}`}
      onMouseLeave={() => setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={`transition-colors duration-150 ease-in-out focus:outline-none p-0.5 ${displayRating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'} ${!disabled ? 'hover:text-yellow-300' : ''}`}
          onMouseEnter={() => !disabled && setHoverRating(star)}
          onClick={() => !disabled && onRate(star)}
          aria-label={`Rate ${star} stars`}
        >
          <StarIcon 
            className={`w-6 h-6 transition-transform duration-150 ${!disabled ? 'hover:scale-110' : ''}`}
            filled={displayRating >= star}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
