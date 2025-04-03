
import React from 'react';

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
        <span className="text-primary-foreground font-semibold text-xl">S</span>
      </div>
      <span className="font-semibold text-lg">Showroom</span>
    </div>
  );
};

export default Logo;
