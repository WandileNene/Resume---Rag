import { useState } from 'react';
import { getCandidateProfile } from './candidateApi';
import type { CandidateProfile } from './types';

export function useCandidateModal() {
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCandidateModal = async (candidateId: string) => {
    setIsOpen(true);
    setLoading(true);
    setError(null);

    try {
      setCandidate(await getCandidateProfile(candidateId));
    } catch {
      setCandidate(null);
      setError('Failed to load candidate profile.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setCandidate(null);
    setError(null);
  };

  return { candidate, isOpen, loading, error, openCandidateModal, closeModal };
}