import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function mapPasswordError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('senha atual')) return err.message;
  if (msg.includes('invalid login') || msg.includes('incorrect')) {
    return 'Senha atual incorreta.';
  }
  if (msg.includes('at least') || msg.includes('short')) {
    return 'A nova senha precisa ter no mínimo 6 caracteres.';
  }
  if (msg.includes('different')) {
    return 'A nova senha deve ser diferente da atual.';
  }
  return err?.message || 'Não foi possível alterar a senha. Tente novamente.';
}

function PasswordField({ id, label, value, onChange, autoComplete, hint }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="rounded-xl h-11"
        required
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function ChangePasswordForm() {
  const { updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('A nova senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação da senha não confere.');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('A nova senha deve ser diferente da atual.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha alterada com sucesso!');
    } catch (err) {
      toast.error(mapPasswordError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mb-8 bg-card rounded-3xl p-6 border border-border">
      <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" />
        Alterar senha
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        Informe sua senha atual e escolha uma nova senha segura.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordField
          id="current-password"
          label="Senha atual"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <PasswordField
          id="new-password"
          label="Nova senha"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          hint="Mínimo de 6 caracteres"
        />
        <PasswordField
          id="confirm-password"
          label="Confirmar nova senha"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
          className="w-full rounded-2xl h-11 font-semibold"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar nova senha'
          )}
        </Button>
      </form>
    </section>
  );
}
