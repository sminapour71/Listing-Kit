'use client';
import {useEffect, useRef, useState} from 'react';
import {ArrowDown, Pause, Play} from 'lucide-react';

export default function YaletownHero({video, poster}: {video: string | null; poster: string | null}) {
  const film = useRef<HTMLVideoElement>(null);
  const [playbackAllowed, setPlaybackAllowed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setPlaybackAllowed(!preference.matches);
      if (preference.matches) film.current?.pause();
    };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  async function togglePlayback() {
    const player = film.current;
    if (!player) return;
    if (player.paused) {
      try { await player.play(); } catch { setPaused(true); }
    } else player.pause();
  }
  return <section className="yaletown-hero" aria-labelledby="yaletown-title">
    {poster && <img className="yaletown-hero-poster" src={poster} alt="" fetchPriority="high"/>}
    {video && playbackAllowed && !failed && <video ref={film} className="yaletown-hero-video" autoPlay muted loop playsInline preload="metadata" poster={poster || undefined} aria-hidden="true" onPause={() => setPaused(true)} onPlay={() => setPaused(false)} onError={() => setFailed(true)}><source src={video} type="video/mp4"/></video>}
    <div className="yaletown-hero-shade" aria-hidden="true"/>
    <div className="yaletown-title-card"><h1 id="yaletown-title">Yaletown.</h1><p>Vancouver, British Columbia</p></div>
    <a className="yaletown-scroll-cue" href="#yaletown-introduction"><span>Scroll to explore</span><ArrowDown size={18} aria-hidden="true"/></a>
    {video && playbackAllowed && !failed && <button className="yaletown-video-toggle" type="button" onClick={togglePlayback} aria-label={paused ? 'Play background video' : 'Pause background video'}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button>}
  </section>;
}
