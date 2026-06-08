import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Análise — FIIs · Invest' };

export default function FiisPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '360px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '12px',
          backgroundColor: 'var(--color-bg-3)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5">
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21V11h6v10" />
        </svg>
      </div>
      <div>
        <h2 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
          Análise de FIIs
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-3)', maxWidth: '360px', lineHeight: '1.5' }}>
          Esta seção está em desenvolvimento. A análise de fundos imobiliários incluirá: dividend yield, P/VP, cap rate, vacância, qualidade dos contratos e dos CRIs.
        </p>
      </div>
    </div>
  );
}
