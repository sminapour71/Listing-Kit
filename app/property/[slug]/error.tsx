'use client';
export default function PropertyError({ reset }: { reset: () => void }) { return <main className="public-unavailable"><div className="eyebrow">PROPERTY PAGE</div><h1>A moment, please.</h1><p>This property page could not be loaded right now.</p><button className="primary" onClick={reset}>Try again</button></main>; }
