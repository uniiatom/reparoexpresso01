import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wrench, Paintbrush, Zap, Droplets, Home, Car, Scissors, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

const iconMap = {
  Wrench, Paintbrush, Zap, Droplets, Home, Car, Scissors, GraduationCap
};

const defaultCategories = [
  { name: "Encanador", icon: "Droplets", description: "Reparos e instalações hidráulicas" },
  { name: "Eletricista", icon: "Zap", description: "Instalações e manutenção elétrica" },
  { name: "Pintor", icon: "Paintbrush", description: "Pintura residencial e comercial" },
  { name: "Pedreiro", icon: "Wrench", description: "Construção e reformas" },
  { name: "Limpeza", icon: "Home", description: "Limpeza residencial e comercial" },
  { name: "Mecânico", icon: "Car", description: "Manutenção automotiva" },
  { name: "Cabeleireiro", icon: "Scissors", description: "Cortes e tratamentos capilares" },
  { name: "Aulas", icon: "GraduationCap", description: "Professores particulares" },
];

export default function FeaturedCategories() {
  const { data: categories } = useQuery({
    queryKey: ['categories-featured'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    initialData: [],
  });

  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Categorias Populares</h2>
            <p className="mt-2 text-muted-foreground">Encontre o serviço que você precisa</p>
          </div>
          <Link to="/categories" className="hidden sm:block">
            <Button variant="ghost" className="text-primary font-medium">
              Ver todas <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayCategories.slice(0, 8).map((cat, i) => {
            const Icon = iconMap[cat.icon] || Wrench;
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link to={`/professionals?category=${encodeURIComponent(cat.name)}`}>
                  <Card className="p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group bg-card border-border/50">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="sm:hidden mt-6 text-center">
          <Link to="/categories">
            <Button variant="outline" className="font-medium">
              Ver todas categorias <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}