import { useEffect } from 'react';

// Join now goes to the Google Form (Core Team); this page is a redirect for old links.

export default function JoinCorePage() {
  useEffect(() => {
    window.location.replace('https://forms.gle/NFLeVpiFziPjYY2m8');
  }, []);

  return <PageLoader />;
}

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
    <div className="lb-bracket t-yellow" style={{ padding: '24px 40px', textAlign: 'center' }}>
      <div className="lb-bracket-corner lb-c-tl" />
      <div className="lb-bracket-corner lb-c-tr" />
      <div className="lb-bracket-corner lb-c-bl" />
      <div className="lb-bracket-corner lb-c-br" />
      <p className="lb-mono ts-blink" style={{ color: 'var(--c-green)', fontSize: '12px', letterSpacing: '0.15em', margin: 0 }}>
        &gt; loading…
      </p>
    </div>
  </div>
);
