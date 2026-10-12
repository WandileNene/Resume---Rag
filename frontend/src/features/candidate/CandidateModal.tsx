import { useEffect, useRef } from 'react';
import type { CandidateProfile } from './types';

interface CandidateModalProps {
  candidate: CandidateProfile | null;
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function CandidateModal({ candidate, isOpen, loading, error, onClose }: CandidateModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contactRows = [
    ['Email', candidate?.email],
    ['Phone', candidate?.phoneNumber ?? candidate?.phone],
    ['Location', candidate?.location],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  const education = Array.isArray(candidate?.education)
    ? candidate.education.map((item) => [item.degree, item.institution, item.year].filter(Boolean).join(' · '))
    : candidate?.education;

  return (
    <div className="candidate-modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={modalRef} className="candidate-modal" role="dialog" aria-modal="true" aria-labelledby="candidate-modal-title">
        <header className="candidate-modal-header">
          <div>
            <span className="message-kicker">Candidate profile</span>
            <h2 id="candidate-modal-title">{candidate?.name ?? 'Loading profile'}</h2>
            {candidate && <p>{candidate.role ?? candidate.title ?? 'Role not specified'} · {candidate.company ?? 'Company not specified'}</p>}
          </div>
          <button ref={closeButtonRef} type="button" className="modal-close-button" onClick={onClose} aria-label="Close candidate profile">×</button>
        </header>

        {loading && <div className="modal-loading" role="status">Loading candidate profile...</div>}
        {error && <div className="status-box error"><p>{error}</p></div>}
        {candidate && !loading && (
          <div className="candidate-modal-body">
            {contactRows.length > 0 && <section><h3>Contact</h3>{contactRows.map(([label, value]) => <p key={label}><strong>{label}</strong>{value}</p>)}</section>}
            {candidate.skills && candidate.skills.length > 0 && <section><h3>Skills</h3><div className="modal-chip-list">{candidate.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></section>}
            {(candidate.experienceSummary || candidate.totalExperience !== undefined) && <section><h3>Experience</h3><p>{candidate.totalExperience !== undefined ? `${candidate.totalExperience} years total experience.` : ''} {candidate.experienceSummary}</p></section>}
            {education && <section><h3>Education</h3><p>{Array.isArray(education) ? education.join(' · ') : education}</p></section>}
            {candidate.projects && candidate.projects.length > 0 && <section><h3>Projects</h3>{candidate.projects.map((project) => <p key={project.title}><strong>{project.title}</strong>{project.description ? ` · ${project.description}` : ''}</p>)}</section>}
            {candidate.certifications && candidate.certifications.length > 0 && <section><h3>Certifications</h3><div className="modal-chip-list">{candidate.certifications.map((certification) => <span key={certification}>{certification}</span>)}</div></section>}
            <section className="full-resume-section">
              <div className="full-resume-heading">
                <h3>Full resume</h3>
                {candidate.fileName && <span>{candidate.fileName}</span>}
              </div>
              <pre>{candidate.rawText ?? 'The full resume text is not available for this candidate.'}</pre>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}