import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from 'sonner';

export default function PartnerRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cnpj: '',
    company_name: '',
    partner_type: 'lojista',
    address: '',
    city: '',
    state: '',
    description: '',
    products_services: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me();
      if (!user) {
        toast.error('Você precisa estar logado');
        setLoading(false);
        return;
      }

      const partnerData = {
        user_id: user.id,
        name: formData.name,
        email: formData.email || user.email,
        phone: formData.phone,
        cnpj: formData.cnpj,
        company_name: formData.company_name,
        partner_type: formData.partner_type,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        description: formData.description,
        products_services: formData.products_services.split(',').map(s => s.trim()).filter(Boolean),
      };

      await base44.entities.Partner.create(partnerData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao cadastrar parceiro');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 text-center max-w-sm w-full shadow-xl">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Cadastro realizado!</h2>
          <p className="text-muted-foreground mb-6">Seu registro foi enviado para análise. Você receberá uma confirmação em breve.</p>
          <Button onClick={() => navigate('/')} className="w-full rounded-2xl">
            Voltar para Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Cadastro de Parceiro</h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tipo de Parceiro */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Tipo de Parceiro *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'lojista', label: '🏪 Lojista' },
                { value: 'vendedor', label: '📊 Vendedor' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, partner_type: option.value }))}
                  className={`p-4 rounded-2xl border-2 font-semibold transition-all ${
                    formData.partner_type === option.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Nome Completo *</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Seu nome"
              required
              className="rounded-2xl"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Email</label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              className="rounded-2xl"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Telefone / WhatsApp *</label>
            <Input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
              required
              className="rounded-2xl"
            />
          </div>

          {/* CNPJ */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">CNPJ</label>
            <Input
              name="cnpj"
              value={formData.cnpj}
              onChange={handleChange}
              placeholder="00.000.000/0000-00"
              className="rounded-2xl"
            />
          </div>

          {/* Nome da Empresa */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Nome da Empresa / Loja</label>
            <Input
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              placeholder="Nome do seu negócio"
              className="rounded-2xl"
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Endereço Completo</label>
            <Input
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Rua, número, complemento"
              className="rounded-2xl"
            />
          </div>

          {/* Cidade e Estado */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-semibold text-foreground block mb-2">Cidade</label>
              <Input
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="São Paulo"
                className="rounded-2xl"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">UF</label>
              <Input
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="SP"
                maxLength={2}
                className="rounded-2xl uppercase"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Descrição do Negócio</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descreva seu negócio e o que oferece..."
              className="rounded-2xl min-h-[100px]"
            />
          </div>

          {/* Produtos/Serviços */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Produtos/Serviços Oferecidos</label>
            <Textarea
              name="products_services"
              value={formData.products_services}
              onChange={handleChange}
              placeholder="Separe por vírgula: Produto A, Produto B, Serviço C"
              className="rounded-2xl min-h-[80px]"
            />
          </div>

          {/* Info */}
          <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
            <p className="text-sm text-primary/80">
              ℹ️ Seu cadastro será analisado pela equipe. Você receberá confirmação por email.
            </p>
          </div>

          {/* Botão Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              '✓ Cadastrar como Parceiro'
            )}
          </Button>

          {/* Já é cadastrado */}
          <p className="text-center text-sm text-muted-foreground">
            Já é parceiro?{' '}
            <Link to="/" className="text-primary font-semibold hover:underline">
              Voltar para home
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}