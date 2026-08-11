import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ServiceSearch({ 
  services, 
  onFilterChange, 
  placeholder = "Buscar serviços..." 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (value) => {
    setSearchTerm(value);
    const filtered = services.filter(service =>
      service.label.toLowerCase().includes(value.toLowerCase()) ||
      service.subtitle.toLowerCase().includes(value.toLowerCase())
    );
    onFilterChange(filtered);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onFilterChange(services);
  };

  return (
    <div className="relative w-full mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full h-12 pl-10 pr-10 rounded-2xl border border-border bg-card text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}