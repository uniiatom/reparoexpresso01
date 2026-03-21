import React from 'react';
import { Star } from "lucide-react";

export default function StarRating({ rating = 0, size = 16, showValue = true }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={star <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-border"}
          style={{ width: size, height: size }}
        />
      ))}
      {showValue && <span className="text-sm font-medium text-foreground ml-1">{rating.toFixed(1)}</span>}
    </div>
  );
}