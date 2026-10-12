import axios from 'axios';
import apiClient from '../../../lib/api/client';

export type IngestionSummary = {
  name?: string;
  role?: string;
  company?: string;
  totalExperience?: number;
  skillsCount?: number;
  embeddingModel?: string;
  embeddingDimension?: number;
};

export type IngestionTimings = Record<string, number | string>;

export type IngestionResponse = {
  success?: boolean;
  message?: string;
  file?: {
    originalName?: string;
    mimeType?: string;
    size?: number;
  };
  resumeId?: string;
  data?: IngestionSummary;
  timings?: IngestionTimings;
  errorCode?: string;
};

const ingestionErrorMessages: Record<string, string> = {
  RESUME_EXTRACTION_FAILED: 'PDF extraction failed',
  LLM_PARSE_FAILED: 'Resume parsing failed',
  EMBEDDING_FAILED: 'Embedding generation failed',
  INGESTION_FAILED: 'MongoDB ingestion failed',
};

export const getIngestionError = (caughtError: unknown): { message: string; stage: string } => {
  if (axios.isAxiosError(caughtError)) {
    if (!caughtError.response) {
      return { message: 'Network error', stage: 'Network error' };
    }

    const responseData = caughtError.response.data as { errorCode?: string; message?: string } | undefined;
    const message = responseData?.errorCode
      ? ingestionErrorMessages[responseData.errorCode]
      : undefined;

    if (message) {
      return { message, stage: message };
    }

    return {
      message: responseData?.message ?? 'Resume ingestion failed',
      stage: 'Upload failed',
    };
  }

  if (caughtError instanceof Error && caughtError.message) {
    return { message: caughtError.message, stage: 'Upload failed' };
  }

  return { message: 'Resume ingestion failed', stage: 'Upload failed' };
};

export const validateResumeFile = (file: File | null): string | null => {
  if (!file) {
    return 'Please select a file.';
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return 'Only PDF allowed';
  }

  if (file.size === 0) {
    return 'Please select a file.';
  }

  const maxFileSizeBytes = 5 * 1024 * 1024;
  if (file.size > maxFileSizeBytes) {
    return 'Maximum 5MB allowed';
  }

  return null;
};

export const ingestResume = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<IngestionResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/v1/resume/ingest', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (!progressEvent.total) {
        return;
      }

      const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
      onProgress?.(percent);
    },
  });

  return response.data as IngestionResponse;
};
