import apiClient from '../../lib/api/client';
import type { CandidateProfile } from './types';

export const getCandidateProfile = async (candidateId: string): Promise<CandidateProfile> => {
  const response = await apiClient.get(`/v1/candidate/${encodeURIComponent(candidateId)}`);
  return response.data as CandidateProfile;
};