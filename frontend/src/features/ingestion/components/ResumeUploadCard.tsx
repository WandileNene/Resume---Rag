import type { ChangeEvent, DragEvent } from 'react';
import { useState } from 'react';
import { useIngestionStore } from '../store/ingestionStore';

export function ResumeUploadCard() {
  const {
    file,
    uploading,
    success,
    error,
    statusMessage,
    uploadProgress,
    currentStage,
    summary,
    timings,
    setFile,
    uploadFile,
    reset,
  } = useIngestionStore();
  const [isDragging, setIsDragging] = useState(false);

  const stages = [
    'Resume Upload',
    'PDF Processing',
    'Resume Parsing',
    'Embedding Generation',
    'MongoDB ingestion',
    'Completed',
  ];

  const currentIndex = Math.max(
    0,
    stages.findIndex((stage) => stage === currentStage),
  );

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    handleFileSelect(nextFile);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const nextFile = event.dataTransfer.files?.[0] ?? null;
    handleFileSelect(nextFile);
  };

  return (
    <section className="upload-card">
      <div className="upload-header">
        <div>
          <p className="eyebrow">Resume ingestion</p>
          <h1>Upload candidate resume</h1>
        </div>
        <button type="button" className="secondary-button" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="file-meta-row">
        <span>PDF only</span>
        <span>Max 5 MB</span>
      </div>

      <label
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input type="file" accept=".pdf,application/pdf" onChange={handleInputChange} />
        <div className="dropzone-content">
          <div className="dropzone-icon">PDF</div>
          <div>
            <strong>{file ? file.name : 'Drop resume PDF here'}</strong>
            <p>or click to browse</p>
          </div>
        </div>
      </label>

      <div className="upload-progress-wrap" aria-live="polite">
        <div className="progress-header">
          <span>{currentStage}</span>
          <span>{uploading || success ? `${uploadProgress}%` : '0%'}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${uploading || success ? uploadProgress : 0}%` }} />
        </div>
      </div>

      <div className="step-list" aria-label="Resume ingestion stages">
        {stages.map((stage, index) => (
          <div
            key={stage}
            className={`step-item ${index <= currentIndex ? 'active' : ''} ${index === currentIndex ? 'current' : ''}`}
          >
            <span className="step-indicator">{index + 1}</span>
            <span>{stage}</span>
          </div>
        ))}
      </div>

      <div className="upload-actions">
        <button
          type="button"
          className="primary-button"
          disabled={!file || uploading}
          onClick={() => file && uploadFile(file)}
        >
          {uploading ? 'Uploading...' : success ? 'Upload complete' : 'Upload resume'}
        </button>
      </div>

      <div className={`status-box ${success ? 'success' : error ? 'error' : ''}`}>
        <p>{statusMessage}</p>
      </div>

      {summary && (
        <>
          <div className="success-result-card">
            <span className="success-badge">Vector search ready</span>
            <h2>Resume uploaded successfully</h2>
            <p className="success-copy">
              Embedding generated successfully and MongoDB ingestion completed.
            </p>

            <div className="success-list">
              <span>✓ Embedding generated</span>
              <span>✓ Resume stored in MongoDB</span>
              <span>✓ Ready for retrieval</span>
            </div>

            {timings && (
              <div className="timing-grid">
                {Object.entries(timings).map(([label, value]) => (
                  <div key={label} className="timing-chip">
                    <span>{label}</span>
                    <strong>{typeof value === 'number' ? `${value} ms` : value}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="summary-card">
            <h2>Ingestion summary</h2>
            <div className="summary-grid">
              <div>
                <span>Name</span>
                <strong>{summary.name ?? 'Not available'}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{summary.role ?? 'Not available'}</strong>
              </div>
              <div>
                <span>Company</span>
                <strong>{summary.company ?? 'Not available'}</strong>
              </div>
              <div>
                <span>Experience</span>
                <strong>{summary.totalExperience ?? 'N/A'} years</strong>
              </div>
              <div>
                <span>Skills</span>
                <strong>{summary.skillsCount ?? 0}</strong>
              </div>
              <div>
                <span>Embedding</span>
                <strong>
                  {summary.embeddingModel ?? 'mistral-embed'} / {summary.embeddingDimension ?? '1024'}
                </strong>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
