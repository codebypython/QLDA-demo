import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Dialog xác nhận cho thao tác “nặng” (không hoàn tác / ảnh hưởng nghiệp vụ).
 * - acknowledgeLabel: bắt buộc tick checkbox trước khi xác nhận
 * - typedPhrase + typedPhraseLabel: bắt buộc gõ đúng cụm (so khớp không phân biệt hoa thường, trim)
 */
export default function ConfirmActionModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger',
  acknowledgeLabel = null,
  typedPhrase = null,
  typedPhraseHint = 'Nhập chính xác cụm bên dưới để xác nhận.',
}) {
  const [ack, setAck] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setAck(false);
      setTyped('');
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const phraseOk = !typedPhrase
    || typed.trim().toLowerCase() === String(typedPhrase).trim().toLowerCase();
  const ackOk = !acknowledgeLabel || ack;
  const canSubmit = ackOk && phraseOk && !busy;

  const confirmClass = variant === 'danger' ? 'btn btn-primary' : 'btn btn-primary';

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      /* parent toast */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 260,
      }}
      onClick={busy ? undefined : onClose}
    >
      <div
        className="card"
        style={{ width: 'min(480px, 94vw)', boxShadow: '0 16px 48px rgba(0,0,0,0.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
          {variant === 'danger' && (
            <AlertTriangle size={22} style={{ flexShrink: 0, color: 'var(--accent-amber, #f59e0b)', marginTop: 2 }} />
          )}
          <div>
            <h4 className="card-title" style={{ marginBottom: 6 }}>{title}</h4>
            {typeof description === 'string' ? (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {description}
              </p>
            ) : (
              description
            )}
          </div>
        </div>

        {acknowledgeLabel && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 4 }} />
            <span>{acknowledgeLabel}</span>
          </label>
        )}

        {typedPhrase && (
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">{typedPhraseHint}</label>
            <div style={{
              fontSize: 12, fontFamily: 'monospace', padding: '6px 10px',
              borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)',
              marginBottom: 8, border: '1px solid var(--border-color)',
            }}
            >
              {typedPhrase}
            </div>
            <input
              className="form-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Nhập cụm xác nhận"
              autoComplete="off"
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={() => void handleConfirm()}
            disabled={!canSubmit}
            style={variant === 'danger' ? { background: '#b45309', borderColor: '#b45309' } : undefined}
          >
            {busy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
