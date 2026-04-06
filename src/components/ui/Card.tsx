// ---------------------------------------------------------------------------
// Card Component
// Versatile card container used for quiz cards, feature cards, and
// content sections throughout the application.
// ---------------------------------------------------------------------------

import React from 'react';
import './Card.css';

interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  onClick,
}) => {
  const classes = [
    'card',
    `card-${variant}`,
    `card-pad-${padding}`,
    onClick ? 'card-clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
};

export default Card;
