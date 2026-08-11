import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Wrench, Paintbrush, Zap, Droplets, Home, Car, Scissors, GraduationCap, Hammer, Truck, ShieldCheck, Laptop, Utensils, Heart, Music } from "lucide-react";
import { motion } from "framer-motion";

const iconMap = {
  Wrench, Paintbrush, Zap, Droplets, Home, Car, Scissors, GraduationCap, Hammer, Truck, ShieldCheck, Laptop, Utensils, Heart, Music
};

const defaultCategories = [
  { name: "Encanador", icon: "Droplets", description: "Reparos e instalações hidráulicas" },
  { name: "Eletricista", icon: "Zap", description: "Instalações e manutenção elétrica" },
  { name: "Pintor", icon: "Paintbrush", description: "Pintura residencial e comercial" },
  { name: "Pedreiro", icon: "Hammer", description: "Construção e reformas" },
  { name: "Limpeza", icon: "Home", description: "Limpeza residencial e comercial" },
  { name: "Mecânico", icon: "Car", description: "Manutenção automotiva" },
  { name: "Cabeleireiro", icon: "Scissors", description: "Cortes e tratamentos capilares" },
  { name: "Aulas Particulares", icon: "GraduationCap", description: "Professores particulares" },
  { name: "Mudança e Frete", icon: "Truck", description: "Transporte e mudanças" },
  { name: "Segurança", icon: "ShieldCheck", description: "Instalação de câmeras e alarmes" },
  { name: "Informática", icon: "Laptop", description: "Manutenção de computadores" },
  { name: "Cozinheiro", icon: "Utensils", description: "Chef e cozinheiro particular" },
  { name: "Saúde e Bem-estar", icon: "Heart", description: "Massagem, fisioterapia" },
  { name: "Músico", icon: "Music", description: "Bandas e músicos para eventos" },
  { name: "Serralheiro", icon: "Wrench", description: "Grades, portões e estruturas metálicas" },
  { name: "Marceneiro", icon: "Hammer", description: "Móveis sob medida e reparos" },
];

export default function Categories() {
  const [search, setSearch] = React.useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    initialData: [],
  });

  const displayCategories = categories.length > 0 ? categories : defaultCategories;
  const filtered = displayCategories.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Categorias de Serviço</h1>
        <p className="text-muted-foreground mt-1">Explore todas as categorias disponíveis</p>
      </div>

      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((cat, i) => {
          const Icon = iconMap[cat.icon] || Wrench;
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
            >
              <Link to={`/professionals?category=${encodeURIComponent(cat.name)}`}>
                <Card className="p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group h-full bg-card">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}