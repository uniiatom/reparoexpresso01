import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  deleteProviderRegistrationDraft,
  draftToForm,
  hasDraftContent,
  loadProviderRegistrationDraft,
  saveProviderRegistrationDraft,
} from '@/lib/providerRegistrationDraft';

const DEBOUNCE_MS = 1500;

/**
 * Carrega e salva automaticamente o rascunho do cadastro de prestador no Supabase.
 */
export function useProviderRegistrationDraft({
  context = 'admin',
  form,
  customFieldValues,
  autoApprove,
  enabled = true,
}) {
  const { user } = useAuth();
  const ownerId = user?.id;

  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(enabled && ownerId));
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [restoredForm, setRestoredForm] = useState(null);
  const [restoredCustomFields, setRestoredCustomFields] = useState(null);
  const [restoredAutoApprove, setRestoredAutoApprove] = useState(null);

  const skipNextSave = useRef(true);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!enabled || !ownerId) {
      setIsLoadingDraft(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const draft = await loadProviderRegistrationDraft(ownerId, context);
        if (cancelled) return;
        if (draft && hasDraftContent(draft.form_data)) {
          setRestoredForm(draftToForm(draft));
          setRestoredCustomFields(draft.custom_field_values ?? {});
          setRestoredAutoApprove(Boolean(draft.auto_approve));
          setLastSavedAt(draft.updated_at ? new Date(draft.updated_at) : null);
        }
      } catch {
        if (!cancelled) setSaveStatus('error');
      } finally {
        if (!cancelled) {
          setDraftLoaded(true);
          setIsLoadingDraft(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, ownerId, context]);

  useEffect(() => {
    if (!enabled || !ownerId || !draftLoaded) return;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    if (!hasDraftContent(form)) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const saved = await saveProviderRegistrationDraft({
          ownerId,
          context,
          form,
          customFieldValues,
          autoApprove,
        });
        setSaveStatus('saved');
        setLastSavedAt(saved?.updated_at ? new Date(saved.updated_at) : new Date());
      } catch {
        setSaveStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [enabled, ownerId, context, draftLoaded, form, customFieldValues, autoApprove]);

  const clearDraft = useCallback(async () => {
    if (!ownerId) return;
    try {
      await deleteProviderRegistrationDraft(ownerId, context);
      setLastSavedAt(null);
      setSaveStatus('idle');
    } catch {
      setSaveStatus('error');
    }
  }, [ownerId, context]);

  return {
    isLoadingDraft,
    draftLoaded,
    saveStatus,
    lastSavedAt,
    restoredForm,
    restoredCustomFields,
    restoredAutoApprove,
    hasRestoredDraft: Boolean(restoredForm),
    clearDraft,
  };
}
