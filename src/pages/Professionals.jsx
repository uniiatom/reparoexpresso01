import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ProfessionalCard from '../components/shared/ProfessionalCard';

export default function Professionals() {
  const urlParams = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState(urlParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(urlParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState('rating');

  const { data: professionals, isLoading } = useQuery({
    queryKey: ['professionals'],
    queryFn: () => base44.entities.Professional.list(),
    initialData: [],
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    initialData: [],
  });

  const filtered = useMemo(() => {
    let result = [...professionals];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(s) ||
        p.category_name?.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s) ||
        p.city?.toLowerCase().includes(s)
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter(p => p.category_name === categoryFilter);
    }

    if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'reviews') {
      result.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
    } else if (sortBy === 'experience') {
      result.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
    }

    return result;
  }, [professionals, search, categoryFilter, sortBy]);

  const uniqueCategories = useMemo(() => {
    const names = categories.map(c => c.name);
    const fromPros = professionals.map(p => p.category_name).filter(Boolean);
    return [...new Set([...names, ...fromPros])];
  }, [categories, professionals]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Profissionais</h1>
        <p className="text-muted-foreground mt-1">Encontre os melhores profissionais para o seu serviço</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, serviço ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {uniqueCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Melhor Avaliação</SelectItem>
            <SelectItem value="reviews">Mais Avaliações</SelectItem>
            <SelectItem value="experience">Mais Experiência</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="rounded-xl border p-5 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="w-14 h-14 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Nenhum profissional encontrado</h3>
          <p className="text-muted-foreground mt-1">Tente ajustar seus filtros de busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(pro => (
            <ProfessionalCard key={pro.id} professional={pro} />
          ))}
        </div>
      )}
    </div>
  );
}