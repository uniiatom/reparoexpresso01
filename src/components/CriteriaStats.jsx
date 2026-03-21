import React from 'react';
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CriteriaStats({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        Sem avaliações por critério
      </div>
    );
  }

  const calculateAverage = (key) => {
    const values = reviews
      .map(r => r[key])
      .filter(v => v !== undefined && v !== null);
    return values.length > 0
      ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
      : 0;
  };

  const criteria = [
    { key: 'punctuality_rating', label: '⏰ Pontualidade' },
    { key: 'quality_rating', label: '✨ Qualidade' },
    { key: 'behavior_rating', label: '😊 Educação' },
  ];

  return (
    <div className="space-y-3">
      {criteria.map((criterion, idx) => {
        const avg = parseFloat(calculateAverage(criterion.key));
        return (
          <motion.div
            key={criterion.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
          >
            <span className="text-sm font-semibold text-foreground">{criterion.label}</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-4 h-4",
                      i < Math.floor(avg)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-primary w-8 text-right">{avg}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}