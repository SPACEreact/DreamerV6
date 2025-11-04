/**
 * Star Rating Component
 * Allows users to rate generated content with 1-5 stars
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface StarRatingProps {
  rating?: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  onChange,
  size = 'md',
  readonly = false,
  showLabel = true,
  className = ''
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const sizeClass = sizes[size];
  const displayRating = hoverRating || rating;

  const handleClick = (value: number) => {
    if (!readonly && onChange) {
      onChange(value);
    }
  };

  const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <motion.button
            key={value}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(value)}
            onMouseEnter={() => !readonly && setHoverRating(value)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            whileHover={!readonly ? { scale: 1.1 } : {}}
            whileTap={!readonly ? { scale: 0.95 } : {}}
            className={`
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              transition-transform duration-150
              ${!readonly && 'hover:drop-shadow-lg'}
            `}
            aria-label={`Rate ${value} stars`}
          >
            <Star
              className={`
                ${sizeClass}
                transition-colors duration-150
                ${value <= displayRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-gray-400'
                }
              `}
            />
          </motion.button>
        ))}
      </div>
      
      {showLabel && displayRating > 0 && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm text-gray-300"
        >
          {labels[displayRating - 1]}
        </motion.span>
      )}
      
      {!showLabel && rating > 0 && (
        <span className="text-sm text-gray-400">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};
