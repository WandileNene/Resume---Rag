import { create } from 'zustand';
import {
  ingestResume,
  getIngestionError,
  type IngestionSummary,
  type IngestionTimings,
  validateResumeFile,
} from '../services/ingestionApi';

interface IngestionState {
  file: File | null;
  uploading: boolean;
  success: boolean;
  error: string | null;
  statusMessage: string;
  uploadProgress: number;
  currentStage: string;
  summary: IngestionSummary | null;
  timings: IngestionTimings | null;
  setFile: (file: File | null) => void;
  reset: () => void;
  uploadFile: (file: File) => Promise<void>;
}

const getStageFromProgress = (percent: number) => {
  if (percent < 15) return 'Resume Upload';
  if (percent < 35) return 'PDF Processing';
  if (percent < 55) return 'Resume Parsing';
  if (percent < 75) return 'Embedding Generation';
  if (percent < 100) return 'MongoDB ingestion';
  return 'Completed';
};

export const useIngestionStore = create<IngestionState>((set) => ({
  file: null,
  uploading: false,
  success: false,
  error: null,
  statusMessage: 'Ready to upload resume',
  uploadProgress: 0,
  currentStage: 'Waiting for PDF',
  summary: null,
  timings: null,
  setFile: (file) => {
    const validationError = validateResumeFile(file);

    set({
      file,
      success: false,
      error: validationError,
      summary: null,
      timings: null,
      uploadProgress: 0,
      currentStage: validationError ? 'Validation failed' : file ? 'PDF ready for upload' : 'Waiting for PDF',
      statusMessage: validationError ?? (file ? `Selected: ${file.name}` : 'Ready to upload resume'),
    });
  },
  reset: () => {
    set({
      file: null,
      uploading: false,
      success: false,
      error: null,
      summary: null,
      timings: null,
      uploadProgress: 0,
      currentStage: 'Waiting for PDF',
      statusMessage: 'Ready to upload resume',
    });
  },
  uploadFile: async (file) => {
    const validationError = validateResumeFile(file);

    if (validationError) {
      set({
        uploading: false,
        success: false,
        error: validationError,
        summary: null,
        uploadProgress: 0,
        currentStage: 'Validation failed',
        statusMessage: validationError,
      });
      return;
    }

    set({
      file,
      uploading: true,
      success: false,
      error: null,
      summary: null,
      timings: null,
      uploadProgress: 0,
      currentStage: 'Resume Upload',
      statusMessage: 'Validating PDF and preparing upload...',
    });

    try {
      const payload = await ingestResume(file, (percent) => {
        const nextStage = getStageFromProgress(percent);

        set({
          uploadProgress: percent,
          currentStage: nextStage,
          statusMessage: `${nextStage} (${percent}%)`,
        });
      });

      set({
        uploading: false,
        success: true,
        error: null,
        summary: payload.data ?? null,
        timings: payload.timings ?? null,
        uploadProgress: 100,
        currentStage: 'Completed',
        statusMessage: payload.message ?? 'Resume ingestion completed',
      });
    } catch (caughtError) {
      const { message, stage } = getIngestionError(caughtError);

      set({
        uploading: false,
        success: false,
        error: message,
        summary: null,
        timings: null,
        uploadProgress: 0,
        currentStage: stage,
        statusMessage: message,
      });
    }
  },
}));
