import type { ReactNode } from 'react';

export interface ModalProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  tone?: 'default' | 'danger' | 'action';
}

/** Diálogo simples, usável por toque: fecha por botão, nunca por hover. */
export function Modal({ title, subtitle, onClose, children, footer, tone = 'default' }: ModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal modal--${tone}`}>
        <header className="modal__header">
          <div>
            <h2 className="modal__title">{title}</h2>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" className="btn btn--icon" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          )}
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
