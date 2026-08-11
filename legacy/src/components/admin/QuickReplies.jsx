import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Plus, Trash2, X, Check, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'reparo_quick_replies';

const DEFAULT_REPLIES = [
  {
    id: '1',
    title: 'Recebido - em análise',
    text: 'Olá! Recebemos seu ticket e nossa equipe já está analisando o caso. Em breve retornaremos com mais informações. Agradecemos sua paciência!',
  },
  {
    id: '2',
    title: 'Solicitar mais detalhes',
    text: 'Olá! Para que possamos ajudá-lo(a) da melhor forma, precisamos de mais detalhes sobre o ocorrido. Poderia nos informar a data, horário e uma descrição completa do problema?',
  },
  {
    id: '3',
    title: 'Problema resolvido',
    text: 'Olá! Informamos que o seu chamado foi analisado e o problema foi resolvido. Caso tenha mais dúvidas ou o problema persista, não hesite em nos contatar novamente. Ficamos à disposição!',
  },
  {
    id: '4',
    title: 'Aguardando prestador',
    text: 'Olá! Estamos verificando a disponibilidade de um prestador para o seu serviço. Assim que tivermos uma previsão, atualizaremos o seu chamado. Obrigado pela compreensão!',
  },
];

export function loadQuickReplies() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return DEFAULT_REPLIES;
}

function saveQuickReplies(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Componente inline de seleção de resposta rápida (para dentro do TicketCard)
export function QuickReplyPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const replies = loadQuickReplies();

  if (replies.length === 0) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 rounded-xl text-xs h-8"
        onClick={() => setOpen(o => !o)}
      >
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        Respostas Rápidas
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </Button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground px-1">Clique para inserir no campo de resposta</p>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {replies.map(r => (
              <button
                key={r.id}
                onClick={() => { onSelect(r.text); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group"
              >
                <p className="text-xs font-semibold text-foreground group-hover:text-primary">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de gerenciamento completo (para a aba de configurações)
export default function QuickRepliesManager() {
  const [replies, setReplies] = useState(loadQuickReplies);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const persist = (list) => { setReplies(list); saveQuickReplies(list); };

  const handleDelete = (id) => {
    persist(replies.filter(r => r.id !== id));
    toast.success('Resposta removida');
  };

  const handleStartEdit = (r) => {
    setEditId(r.id);
    setEditTitle(r.title);
    setEditText(r.text);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editText.trim()) { toast.error('Preencha título e texto'); return; }
    persist(replies.map(r => r.id === editId ? { ...r, title: editTitle.trim(), text: editText.trim() } : r));
    setEditId(null);
    toast.success('Resposta atualizada!');
  };

  const handleAdd = () => {
    if (!newTitle.trim() || !newText.trim()) { toast.error('Preencha título e texto'); return; }
    persist([...replies, { id: Date.now().toString(), title: newTitle.trim(), text: newText.trim() }]);
    setNewTitle(''); setNewText(''); setShowAdd(false);
    toast.success('Resposta rápida criada!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-foreground">Respostas Rápidas</h3>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{replies.length}</span>
        </div>
        <Button size="sm" variant="outline" className="gap-2 rounded-xl text-xs" onClick={() => setShowAdd(s => !s)}>
          <Plus className="w-3.5 h-3.5" /> Nova resposta
        </Button>
      </div>

      {/* Formulário de nova resposta */}
      {showAdd && (
        <div className="border border-dashed border-amber-300 bg-amber-50/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-amber-700">Nova resposta rápida</p>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Título (nome do modelo)</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Ex: Problema resolvido"
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Texto da resposta</label>
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Olá! ..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="rounded-xl gap-1.5 text-xs" onClick={handleAdd}>
              <Check className="w-3.5 h-3.5" /> Salvar
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => setShowAdd(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de respostas */}
      <div className="space-y-2">
        {replies.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma resposta rápida cadastrada.</p>
        )}
        {replies.map(r => (
          <div key={r.id} className="border border-border rounded-2xl p-4 bg-card">
            {editId === r.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl gap-1.5 text-xs" onClick={handleSaveEdit}>
                    <Check className="w-3 h-3" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => setEditId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <p className="font-semibold text-foreground text-sm">{r.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.text}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-xl" onClick={() => handleStartEdit(r)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 rounded-xl text-destructive hover:text-destructive border-destructive/30"
                    onClick={() => handleDelete(r.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}