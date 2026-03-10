import React from 'react';
import { apiFetch } from '../utils/apiFetch';

export type TermsDocument = {
  id?: string;
  title?: string;
  lastUpdatedLabel?: string;
  publicContent?: string;
  settingsContent?: string;
  updatedAt?: string | null;
};

const normalizeValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const useTermsDocument = () => {
  const [terms, setTerms] = React.useState<TermsDocument | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadTerms = async () => {
      try {
        const response = await apiFetch('/api/content/terms');
        if (!response.ok) return;

        const payload = (await response.json()) as TermsDocument;
        if (!isMounted) return;

        setTerms({
          id: normalizeValue(payload.id),
          title: normalizeValue(payload.title),
          lastUpdatedLabel: normalizeValue(payload.lastUpdatedLabel),
          publicContent: normalizeValue(payload.publicContent),
          settingsContent: normalizeValue(payload.settingsContent),
          updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null
        });
      } catch (error) {
        console.error('Error loading terms content:', error);
      }
    };

    loadTerms();

    return () => {
      isMounted = false;
    };
  }, []);

  return terms;
};
