import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp } from 'lucide-react';
import { Input } from "@/components/ui/input";

export default function CouponUsagePanel() {
  const [searchCoupon, setSearchCoupon] = useState('');

  const { data: services = [] } = useQuery({
    queryKey: ['services-with-coupons'],
    queryFn: async () => {
      const allServices = await base44.entities.ServiceRequest.list('-updated_date', 1000);
      return allServices.filter(s => s.coupon_code && s.coupon_code.trim());
    },
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });

  const filteredServices = searchCoupon
    ? services.filter(s => s.coupon_code.toLowerCase().includes(searchCoupon.toLowerCase()))
    : services;

  const couponStats = services.reduce((acc, service) => {
    if (service.coupon_code) {
      const existing = acc.find(c => c.code === service.coupon_code);
      if (existing) {
        existing.uses++;
        existing.total_discount += service.discount_amount || 0;
      } else {
        acc.push({
          code: service.coupon_code,
          uses: 1,
          total_discount: service.discount_amount || 0,
        });
      }
    }
    return acc;
  }, []).sort((a, b) => b.uses - a.uses);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Cupons Usados</p>
            <p className="text-2xl font-bold text-primary">{couponStats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total de Usos</p>
            <p className="text-2xl font-bold text-primary">{services.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Desconto Total</p>
            <p className="text-2xl font-bold text-green-600">
              R$ {services.reduce((sum, s) => sum + (s.discount_amount || 0), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Coupons */}
      {couponStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Cupons Mais Usados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {couponStats.slice(0, 5).map((stat) => (
                <div key={stat.code} className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                  <div>
                    <p className="font-mono font-bold text-primary">{stat.code}</p>
                    <p className="text-xs text-muted-foreground">{stat.uses} uso{stat.uses > 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">R$ {stat.total_discount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cupom..."
            value={searchCoupon}
            onChange={(e) => setSearchCoupon(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Service List with Coupons */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchCoupon ? 'Nenhum cupom encontrado' : 'Nenhum cupom foi usado ainda'}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredServices.map((service) => (
            <Card key={service.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-primary text-sm">{service.coupon_code}</span>
                      <Badge variant="outline" className="text-xs">
                        {service.service_number}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{service.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(service.created_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground">Desconto</p>
                    <p className="text-sm font-bold text-green-600">R$ {(service.discount_amount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}