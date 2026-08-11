import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Eye, EyeOff, Copy, KeyRound, X, Check } from 'lucide-react';
import { toast } from "sonner";

const STORAGE_KEY = 'reparo_attendants';

function generatePassword(name) {
  const base = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  const num = Math.floor(100 + Math.random() * 900);
  const symbols = ['@', '#', '!'];
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  return `${base}${sym}${num}`;
}

function generateLogin(name, existing) {
  let base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  let login = base;
  let counter = 2;
  while (existing.some(a => a.login === login)) {
    login = `${base}${counter}`;
    counter++;
  }
  return login;
}

export function loadAttendants() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  // Defaults iniciais
  return [
    { id: '1', login: 'atendente1', password: 'reparo@2024', name: 'Ana Souza' },
    { id: '2', login: 'atendente2', password: 'reparo@2024', name: 'Carlos Lima' },
    { id: '3', login: 'supervisor', password: 'super@2024', name: 'Supervisora Maria' },
  ];
}

function saveAttendants(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export default function AttendantsManager({ onClose }) {
  const [attendants, setAttendants] = useState(loadAttendants);
  const [showPasswords, setShowPasswords] = useState({});
  const [newName, setNewName] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editId, setEditId] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPwd, setShowEditPwd] = useState(false);

  const toggleShow = (id) => setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const handleGenerateName = () => {
    if (!newName.trim()) { toast.error('Informe o nome primeiro'); return; }
    const gen_login = generateLogin(newName, attendants);
    const gen_pwd = generatePassword(newName);
    setNewLogin(gen_login);
    setNewPassword(gen_pwd);
  };

  const handleAdd = () => {
    if (!newName.trim() || !newLogin.trim() || !newPassword.trim()) {
      toast.error('Preencha nome, login e senha');
      return;
    }
    if (attendants.some(a => a.login === newLogin.trim())) {
      toast.error('Login já existe');
      return;
    }
    const updated = [...attendants, {
      id: Date.now().toString(),
      name: newName.trim(),
      login: newLogin.trim().toLowerCase(),
      password: newPassword.trim(),
    }];
    setAttendants(updated);
    saveAttendants(updated);
    setNewName(''); setNewLogin(''); setNewPassword('');
    toast.success('Atendente criado com sucesso!');
  };

  const handleDelete = (id) => {
    const updated = attendants.filter(a => a.id !== id);
    setAttendants(updated);
    saveAttendants(updated);
    toast.success('Atendente removido');
  };

  const handleSavePassword = (id) => {
    if (!editPassword.trim()) { toast.error('Informe a nova senha'); return; }
    const updated = attendants.map(a => a.id === id ? { ...a, password: editPassword.trim() } : a);
    setAttendants(updated);
    saveAttendants(updated);
    setEditId(null); setEditPassword('');
    toast.success('Senha atualizada!');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Gerenciar Atendentes</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Lista de atendentes */}
      <div className="space-y-2">
        {attendants.map(att => (
          <div key={att.id} className="border border-border rounded-2xl p-4 bg-card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-foreground text-sm">{att.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Login: <span className="font-mono font-bold text-foreground">{att.login}</span></p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Senha:</span>
                  <span className="font-mono text-xs text-foreground">
                    {showPasswords[att.id] ? att.password : '••••••••'}
                  </span>
                  <button onClick={() => toggleShow(att.id)} className="text-muted-foreground hover:text-foreground">
                    {showPasswords[att.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => copyToClipboard(`Login: ${att.login}\nSenha: ${att.password}`)} className="text-muted-foreground hover:text-primary">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs rounded-xl h-7"
                  onClick={() => { setEditId(att.id); setEditPassword(''); setShowEditPwd(false); }}
                >
                  <KeyRound className="w-3 h-3" /> Trocar senha
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs rounded-xl h-7 text-destructive hover:text-destructive border-destructive/30"
                  onClick={() => handleDelete(att.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Trocar senha inline */}
            {editId === att.id && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                <label className="text-xs font-semibold text-foreground">Nova senha:</label>
                <div className="relative flex-1 min-w-36">
                  <input
                    type={showEditPwd ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Nova senha..."
                    className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-8"
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowEditPwd(!showEditPwd)}
                  >
                    {showEditPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <Button size="sm" className="rounded-xl h-8 gap-1 text-xs" onClick={() => handleSavePassword(att.id)}>
                  <Check className="w-3 h-3" /> Salvar
                </Button>
                <Button size="sm" variant="ghost" className="rounded-xl h-8 text-xs" onClick={() => setEditId(null)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Adicionar novo */}
      <div className="border border-dashed border-primary/40 rounded-2xl p-4 bg-primary/5 space-y-3">
        <p className="text-sm font-bold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Novo Atendente
        </p>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Nome completo</label>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ex: João da Silva"
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl w-full"
          onClick={handleGenerateName}
        >
          <KeyRound className="w-4 h-4" /> Gerar login e senha automaticamente
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Login</label>
            <input
              type="text"
              value={newLogin}
              onChange={e => setNewLogin(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="login"
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Senha</label>
            <div className="relative">
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="senha"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring pr-8"
              />
              {newPassword && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary" onClick={() => copyToClipboard(newPassword)}>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        <Button onClick={handleAdd} className="w-full rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Criar atendente
        </Button>
      </div>
    </div>
  );
}