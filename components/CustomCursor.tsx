
import React, { useEffect, useRef, useState } from 'react';

export type CursorVariant = 
  | 'normal'
  | 'default' 
  | 'figma'
  | 'minimal' 
  | 'retro' 
  | 'glow' 
  | 'bubble' 
  | 'crosshair' 
  | 'magic' 
  | 'pixel' 
  | 'eclipse' 
  | 'sonar' 
  | 'heart'
  | 'star'
  | 'ring'
  | 'ghost'
  | 'fire'
  | 'ice'
  | 'music'
  | 'diamond'
  | 'ufo'
  | 'target'
  | 'pencil'
  | 'paw'
  | 'leaf'
  | 'rocket'
  | 'smile'
  | 'binary'
  | 'electric'
  | 'brush'
  | 'anchor'
  | 'flower'
  | 'puzzle'
  | 'pizza'
  | 'alien'
  | 'basketball'
  | 'sword'
  | 'wand'
  | 'spider'
  | 'clock'
  | 'compass'
  | 'film'
  | 'gear'
  | 'magnet'
  | 'map'
  | 'medal'
  | 'mic'
  | 'palette'
  | 'sun'
  | 'moon'
  | 'umbrella'
  | 'bomb'
  | 'robot'
  | 'skull'
  | 'potion';

const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [variant, setVariant] = useState<CursorVariant>('figma');
  
  // Initialize off-screen
  const position = useRef({ x: -100, y: -100 });
  const followerPosition = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Check storage for saved preference
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_cursor') as CursorVariant;
        if (saved) setVariant(saved);
    }

    // Listen for changes from Profile page
    const handleCursorChange = (e: CustomEvent) => {
        if (e.detail) setVariant(e.detail);
    };
    window.addEventListener('cursor-change' as any, handleCursorChange);

    // Only enable on devices with a fine pointer (mouse)
    const mediaQuery = window.matchMedia('(pointer: fine)');
    setIsSupported(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsSupported(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
        mediaQuery.removeEventListener('change', handleChange);
        window.removeEventListener('cursor-change' as any, handleCursorChange);
    };
  }, []);

  useEffect(() => {
    if (!isSupported || variant === 'normal') return;

    const onMouseMove = (e: MouseEvent) => {
      if (!isVisible) setIsVisible(true);
      position.current = { x: e.clientX, y: e.clientY };
      
      // Update the main cursor position immediately for zero-latency feel
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      const target = e.target as HTMLElement;
      const isInteractive = 
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.matches('a, button, input, select, textarea, [role="button"]') ||
        target.closest('a, button, [role="button"]') !== null;
      
      setHovering(isInteractive);
    };
    
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);
    const onMouseDown = () => {
        if (followerRef.current) {
            followerRef.current.style.transform += ' scale(0.9)';
        }
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    window.addEventListener('mousedown', onMouseDown);

    let animationFrameId: number;

    const animate = () => {
      // Follower movement with smooth lerp
      if (followerRef.current) {
        // Adjust speed based on variant - EVEN FASTER FOR SNAPPY FEEL
        let speed = 0.85; // High Base speed
        
        if (['retro', 'pixel', 'target', 'ring', 'gear', 'figma'].includes(variant)) speed = 0.95; // Near instant
        if (['bubble', 'ghost', 'ufo', 'potion'].includes(variant)) speed = 0.5; // Floating feel but faster
        if (['crosshair', 'pencil', 'wand', 'sword'].includes(variant)) speed = 0.9; // Very Precise
        
        followerPosition.current.x += (position.current.x - followerPosition.current.x) * speed;
        followerPosition.current.y += (position.current.y - followerPosition.current.y) * speed;
        
        followerRef.current.style.transform = `translate3d(${followerPosition.current.x}px, ${followerPosition.current.y}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      window.removeEventListener('mousedown', onMouseDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSupported, isVisible, variant]);

  if (!isSupported || variant === 'normal') return null;

  // --- Styles based on variant ---

  const renderCursor = () => {
      switch (variant) {
          case 'figma':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-0 -mt-0"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                            <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.1943L11.7841 12.3673H5.65376Z" fill="black" stroke="white" strokeWidth="1"/>
                        </svg>
                    </div>
                    {/* No follower for Figma style to keep it clean and authentic */}
                  </>
              );
          case 'minimal':
              return (
                  <div 
                    ref={cursorRef}
                    className="fixed top-0 left-0 w-3 h-3 bg-white rounded-full mix-blend-difference pointer-events-none z-[9999] -ml-1.5 -mt-1.5"
                  />
              );
          case 'retro':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-4 h-4 bg-green-500 pointer-events-none z-[9999] -ml-2 -mt-2"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-green-500 transition-all duration-75
                        ${hovering ? 'bg-green-500/20 scale-110' : 'scale-100'}`}
                    />
                  </>
              );
          case 'glow':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-4 h-4 bg-blue-400 rounded-full blur-[1px] pointer-events-none z-[9999] -ml-2 -mt-2"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-8 -mt-8 w-16 h-16 rounded-full bg-blue-500/30 blur-xl transition-all duration-200 ease-out
                        ${hovering ? 'scale-150 bg-blue-400/40' : 'scale-100'}`}
                    />
                  </>
              );
          case 'bubble':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-3 h-3 bg-cyan-300 rounded-full pointer-events-none z-[9999] -ml-1.5 -mt-1.5 shadow-[0_0_5px_rgba(103,232,249,0.8)]"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-cyan-400/40 bg-cyan-400/10 rounded-full transition-all duration-150 ease-out backdrop-blur-[1px]
                        ${hovering ? 'scale-125 border-cyan-400 bg-cyan-400/20' : 'scale-100'}`}
                    />
                  </>
              );
          case 'crosshair':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 flex items-center justify-center w-6 h-6">
                        <div className="absolute w-full h-0.5 bg-red-500 shadow-[0_0_2px_white]"></div>
                        <div className="absolute h-full w-0.5 bg-red-500 shadow-[0_0_2px_white]"></div>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border border-red-500/50 transition-all duration-100 ease-out
                        ${hovering ? 'scale-75 rotate-45 border-red-500 bg-red-500/10' : 'scale-100'}`}
                    />
                  </>
              );
          case 'magic':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-3 h-3 bg-purple-500 rounded-full pointer-events-none z-[9999] -ml-1.5 -mt-1.5 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border-2 border-yellow-400/60 rounded-full transition-all duration-200 ease-out flex items-center justify-center
                        ${hovering ? 'scale-150 rotate-180 border-yellow-300' : 'scale-100'}`}
                    >
                        <div className={`w-full h-full border-2 border-purple-400/30 rounded-full absolute ${hovering ? 'animate-ping' : ''}`}></div>
                    </div>
                  </>
              );
          case 'pixel':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-3 h-3 bg-black dark:bg-white pointer-events-none z-[9999] -ml-1.5 -mt-1.5"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-4 -mt-4 w-8 h-8 border-2 border-dashed border-gray-500 dark:border-gray-400 transition-all duration-75
                        ${hovering ? 'scale-125 bg-gray-500/20 border-solid' : 'scale-100'}`}
                    />
                  </>
              );
          case 'eclipse':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-4 h-4 bg-gray-900 dark:bg-black rounded-full pointer-events-none z-[9999] -ml-2 -mt-2 border border-white/20"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-8 -mt-8 w-16 h-16 rounded-full bg-white/20 blur-md transition-all duration-150 ease-out
                        ${hovering ? 'scale-125 bg-white/40' : 'scale-100'}`}
                    />
                  </>
              );
          case 'sonar':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-2 h-2 bg-green-400 rounded-full pointer-events-none z-[9999] -ml-1 -mt-1"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-green-500/50 rounded-full transition-all duration-150
                        ${hovering ? 'bg-green-500/10' : ''}`}
                    >
                        <div className="absolute inset-0 rounded-full border border-green-500/30 animate-ping"></div>
                    </div>
                  </>
              );
          case 'heart':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-2.5 -mt-2.5 text-pink-500">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-pink-400/50 rounded-full transition-all duration-150 ease-out
                        ${hovering ? 'scale-150 bg-pink-500/10 border-pink-500' : 'scale-100'}`}
                    />
                  </>
              );
          case 'star':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-yellow-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-yellow-400/50 rounded-full transition-all duration-150 ease-out
                        ${hovering ? 'scale-150 bg-yellow-400/10 rotate-45' : 'scale-100'}`}
                    />
                  </>
              );
          case 'ring':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-2 h-2 bg-orange-500 rounded-full pointer-events-none z-[9999] -ml-1 -mt-1"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-orange-500 rounded-full transition-all duration-75 ease-linear
                        ${hovering ? 'w-8 h-8 -ml-4 -mt-4 border-4' : ''}`}
                    />
                  </>
              );
          case 'ghost':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-gray-400 dark:text-gray-300 opacity-90">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 00-7 7v11l3.5-3.5L12 20l3.5-3.5L19 20V9a7 7 0 00-7-7zM9 9a2 2 0 114 0 2 2 0 01-4 0z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-gray-200/20 dark:bg-white/10 rounded-full blur-sm transition-all duration-200 ease-out
                        ${hovering ? 'scale-150 opacity-50' : 'scale-100'}`}
                    />
                  </>
              );
          case 'fire':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-4 text-orange-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.48 13.03A4 4 0 0116 19h-4a4 4 0 110-8h1a1 1 0 00.78-1.62 7 7 0 10-1.15-3.27l.31.31a9.92 9.92 0 012.25 5.62c0 .35.29.64.64.64h1.33a1 1 0 00.83-1.56 2 2 0 011.49 3.91z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 bg-red-500/20 rounded-full blur-md transition-all duration-150 ease-out
                        ${hovering ? 'bg-orange-500/40 scale-125' : 'scale-100'}`}
                    />
                  </>
              );
          case 'ice':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-cyan-300">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-cyan-200/50 bg-white/10 rounded-full backdrop-blur-sm transition-all duration-150 ease-out
                        ${hovering ? 'rotate-180 scale-110 border-cyan-300' : 'scale-100'}`}
                    />
                  </>
              );
          case 'music':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-purple-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border border-purple-400 rounded-full transition-all duration-150 ease-out
                        ${hovering ? 'animate-ping opacity-50' : 'scale-100'}`}
                    />
                  </>
              );
          case 'diamond':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-blue-300">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l-9.86 6L12 22l9.86-14L12 2z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border border-blue-300/50 rotate-45 transition-all duration-150 ease-out
                        ${hovering ? 'rotate-90 scale-125 bg-blue-300/10' : 'rotate-45'}`}
                    />
                  </>
              );
          case 'ufo':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-4 -mt-2 text-green-500">
                        <svg width="32" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 10c0-3.87-3.13-7-7-7S5 6.13 5 10c0 .34.03.67.08 1H3v2h18v-2h-2.08c.05-.33.08-.66.08-1zM7 10c0-2.76 2.24-5 5-5s5 2.24 5 5H7zm5 6c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-4 w-12 h-8 bg-green-500/10 rounded-[100%] border border-green-500/30 transition-all duration-200 ease-out
                        ${hovering ? 'translate-y-2 scale-110' : 'scale-100'}`}
                    />
                  </>
              );
          case 'target':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-1 h-1 bg-red-600 rounded-full pointer-events-none z-[9999] -ml-0.5 -mt-0.5"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-4 -mt-4 w-8 h-8 border border-red-600 rounded-full transition-all duration-75 ease-linear flex items-center justify-center
                        ${hovering ? 'bg-red-600/10 border-2 w-10 h-10 -ml-5 -mt-5' : ''}`}
                    >
                        <div className="w-full h-full border border-red-600/30 rounded-full scale-50"></div>
                    </div>
                  </>
              );
          case 'pencil':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-0 -mt-6 text-yellow-600 -rotate-12 origin-bottom-left">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-1 -mt-1 w-2 h-2 bg-gray-800 rounded-full opacity-50 transition-all duration-75
                        ${hovering ? 'w-3 h-3 bg-black dark:bg-white' : 'w-2 h-2'}`}
                    />
                  </>
              );
          case 'paw':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-amber-700">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 8c.46 0 .91-.05 1.34-.12C19.44 7.76 20 7.13 20 6.4c0-.92-.92-1.6-1.9-1.45-1.2.18-2.25.9-2.91 1.91-.32.49.03 1.14.61 1.14.26 0 .53 0 .7.0zm-11 0c.17 0 .44 0 .7-.0.58 0 .93-.65.61-1.14-.66-1.01-1.71-1.73-2.91-1.91C3.92 4.8 3 5.48 3 6.4c0 .73.56 1.36 1.16 1.48.43.07.88.12 1.34.12zM12 6c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm7 3.2c-1.23 0-2.4.2-3.5.55C14.77 10 13.92 10.2 13 10.2c-.92 0-1.77-.2-2.5-.45-1.1-.35-2.27-.55-3.5-.55C3.27 9.2 0 12.2 0 16.2 0 20.5 4.16 24 9 24c.6 0 1.18-.06 1.73-.16.83-.16 1.71-.16 2.54 0 .55.1 1.13.16 1.73.16 4.84 0 9-3.5 9-7.8 0-4-3.27-7-7-7z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-amber-600/30 rounded-full transition-all duration-150 ease-out
                        ${hovering ? 'bg-amber-600/10 scale-110' : 'scale-100'}`}
                    />
                  </>
              );
          case 'leaf':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-green-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-green-500/10 rounded-full blur-sm transition-all duration-150 ease-out
                        ${hovering ? 'scale-150 bg-green-500/20' : 'scale-100'}`}
                    />
                  </>
              );
          case 'rocket':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-indigo-500 -rotate-45">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 11L12 15.5L22 5.5L7.5 11ZM2.81 14.12L5.3 15.36L2.26 18.4C1.91 18.75 1.91 19.32 2.26 19.67L4.33 21.74C4.68 22.09 5.25 22.09 5.6 21.74L8.64 18.7L9.88 21.19L7.5 22.5L6.66 20.58L3.42 17.34L1.5 16.5L2.81 14.12ZM20.5 3.5L15.5 8.5L14.5 6.5L15.12 5.26L18.74 1.64C19.09 1.29 19.66 1.29 20.01 1.64L22.36 3.99C22.71 4.34 22.71 4.91 22.36 5.26L18.74 8.88L17.5 9.5L15.5 8.5L20.5 3.5Z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-dashed border-indigo-400 rounded-full transition-all duration-150 ease-out animate-spin-slow
                        ${hovering ? 'scale-125' : 'scale-100'}`}
                    />
                  </>
              );
          case 'smile':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-yellow-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-yellow-400/20 rounded-full transition-all duration-150 ease-out
                        ${hovering ? 'scale-150 rotate-12' : 'scale-100'}`}
                    />
                  </>
              );
          case 'binary':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-green-500 font-mono font-bold text-xs">
                        1
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-4 -mt-4 text-green-500/50 font-mono font-bold text-sm transition-all duration-75
                        ${hovering ? 'scale-150 opacity-80' : 'scale-100'}`}
                    >
                        0
                    </div>
                  </>
              );
          case 'electric':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-2 -mt-3 text-yellow-300">
                        <svg width="20" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-yellow-300/30 rounded-full transition-all duration-75 ease-linear
                        ${hovering ? 'border-yellow-300 scale-90 animate-pulse' : 'scale-100'}`}
                    />
                  </>
              );
          case 'brush':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-1 -mt-5 text-pink-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 000-1.41z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-3 -mt-3 w-6 h-6 bg-pink-500/30 rounded-full blur-sm transition-all duration-75
                        ${hovering ? 'w-10 h-10 -ml-5 -mt-5 bg-pink-500/50' : ''}`}
                    />
                  </>
              );
          case 'anchor':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-blue-700">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 13a5 5 0 01-10 0h2a3 3 0 006 0h2m-5-6V5h2V3h-4v2h2v2c2.76 0 5 2.24 5 5h2v2h-2c0 3.31-2.69 6-6 6s-6-2.69-6-6H5v-2h2a5 5 0 015-5z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-blue-700/30 rounded-full transition-all duration-150 ease-out
                        ${hovering ? 'rotate-180 scale-90 border-blue-700' : 'scale-100'}`}
                    />
                  </>
              );
          case 'flower':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-pink-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25a2.5 2.5 0 003.92 2.06l.02-.01a2.5 2.5 0 00-1.42-4.53c-.51 0-1.02.15-1.46.44-.44.29-.78.71-.96 1.2l-.1.84zm8.53-3.93a2.5 2.5 0 001.94-4.21 2.5 2.5 0 00-3.88 2.11c0 .78.36 1.51.99 1.98.28.21.6.32.95.12zM12 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-pink-400/20 rounded-full transition-all duration-150 ease-out
                        ${hovering ? 'scale-125 rotate-45' : 'scale-100'}`}
                    />
                  </>
              );
          case 'puzzle':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-teal-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-dashed border-teal-500/50 rounded-lg transition-all duration-150 ease-out
                        ${hovering ? 'rotate-90 scale-90 bg-teal-500/10' : 'scale-100'}`}
                    />
                  </>
              );
          case 'pizza':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-yellow-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.43 2 5.23 3.54 3.01 6L12 22l8.99-16C18.78 3.55 15.57 2 12 2zm-1 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2.5 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 1c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2.5 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-yellow-200/20 rounded-full blur-sm transition-all duration-150 ease-out
                        ${hovering ? 'scale-125 bg-orange-200/30' : 'scale-100'}`}
                    />
                  </>
              );
          case 'alien':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-green-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a9 9 0 00-9 9c0 4.17 2.84 7.67 6.69 8.69L12 22l2.31-2.31C18.16 18.67 21 15.17 21 11a9 9 0 00-9-9zm-4 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-green-400/30 rounded-full bg-green-900/10 transition-all duration-150
                        ${hovering ? 'scale-110 border-green-400' : 'scale-100'}`}
                    />
                  </>
              );
          case 'basketball':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-orange-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border-2 border-orange-500/50 rounded-full transition-all duration-75
                        ${hovering ? 'scale-90 border-orange-600' : 'scale-100'}`}
                    />
                  </>
              );
          case 'sword':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-1 -mt-5 text-gray-400 rotate-45 origin-bottom-left">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3l-5 5-1-1-2 2 1 1-5 5-4 7 7-4 5-5 1 1 2-2-1-1 5-5z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-4 -mt-4 w-8 h-8 bg-gray-200/10 rounded-full blur-sm transition-all duration-75
                        ${hovering ? 'scale-150 bg-red-500/20 -ml-6 -mt-6 w-12 h-12' : 'scale-100'}`}
                    />
                  </>
              );
          case 'wand':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-2 -mt-5 text-indigo-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7l2.5-1.4zM14.3 10L16.8 14.2 19.3 10 23.5 12.5 19.3 15 21.8 19.2 17.6 16.7 13.4 19.2 15.9 15 11.7 12.5 15.9 10H14.3zM2 21l7-7-1.4-1.4L.6 19.6 2 21z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-4 -mt-4 w-8 h-8 bg-indigo-400/20 rounded-full blur transition-all duration-100
                        ${hovering ? 'animate-pulse bg-indigo-500/30 scale-125' : 'scale-100'}`}
                    />
                  </>
              );
          case 'spider':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-gray-800 dark:text-gray-200">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7a2 2 0 10-.001-4.001A2 2 0 0012 7zm0 2a3 3 0 100 6 3 3 0 000-6zm-4 2H4v-2h4v2zm8 0h4v-2h-4v2zm-8 4H4v2h4v-2zm8 0h4v2h-4v-2z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-gray-400/30 rounded-full flex items-center justify-center transition-all duration-150
                        ${hovering ? 'scale-110 border-gray-500/50' : 'scale-100'}`}
                    >
                        <div className="w-8 h-8 border border-gray-400/20 rounded-full"></div>
                    </div>
                  </>
              );
          case 'clock':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-blue-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-dashed border-blue-400/40 rounded-full transition-all duration-150 animate-spin-slow
                        ${hovering ? 'scale-110 border-blue-500' : 'scale-100'}`}
                    />
                  </>
              );
          case 'compass':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-red-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8-8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-red-500/20 rounded-full transition-all duration-150
                        ${hovering ? 'rotate-90 scale-110' : 'scale-100'}`}
                    />
                  </>
              );
          case 'film':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-gray-700 dark:text-gray-300">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border border-gray-500 rounded-md transition-all duration-75
                        ${hovering ? 'scale-125 bg-black/10' : 'scale-100'}`}
                    />
                  </>
              );
          case 'gear':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-gray-600 dark:text-gray-400 animate-spin-slow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.68 8.87a.484.484 0 00.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.48.48 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 00-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border-2 border-dashed border-gray-500/50 rounded-full transition-all duration-150
                        ${hovering ? 'rotate-180 scale-110 border-gray-600' : 'scale-100'}`}
                    />
                  </>
              );
          case 'magnet':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-red-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3H18v6c0 3.31-2.69 6-6 6s-6-2.69-6-6V3H3.5v6c0 4.69 3.81 8.5 8.5 8.5s8.5-3.81 8.5-8.5V3zm-5 0h-2v6c0 .55-.45 1-1 1s-1-.45-1-1V3h-2v6c0 1.66 1.34 3 3 3s3-1.34 3-3V3z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border border-red-500/30 rounded-full flex items-center justify-center transition-all duration-150
                        ${hovering ? 'scale-125 bg-red-500/10' : 'scale-100'}`}
                    >
                        <div className="w-full h-0.5 bg-red-500/20"></div>
                        <div className="h-full w-0.5 bg-red-500/20 absolute"></div>
                    </div>
                  </>
              );
          case 'map':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-5 text-red-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-3 -mt-3 w-6 h-6 border-2 border-red-500 rounded-full transition-all duration-100 ease-out
                        ${hovering ? 'scale-150 opacity-50' : 'scale-100 opacity-20'}`}
                    />
                  </>
              );
          case 'medal':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-yellow-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm-4.4-8.78l3.17 5.51.34-.2a6.976 6.976 0 01-1.1-2.22l-2.41-3.09zM11 2l-4 6.93c.61.15 1.19.38 1.72.68L12 4.07l3.28 5.54c.53-.3 1.11-.53 1.72-.68L13 2h-2zM5.38 4.12L7.79 8.3c-.38.55-.69 1.15-.9 1.8L3.5 4.12h1.88zm13.24 0h1.88l-3.38 5.97c-.21-.64-.52-1.24-.9-1.8l2.4-4.17z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-yellow-200/20 rounded-full blur-sm transition-all duration-150
                        ${hovering ? 'scale-125 bg-yellow-300/30' : 'scale-100'}`}
                    />
                  </>
              );
          case 'mic':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-4 text-gray-800 dark:text-gray-200">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-gray-400/30 rounded-full transition-all duration-100
                        ${hovering ? 'scale-110 border-2 border-pink-500/50' : 'scale-100'}`}
                    />
                  </>
              );
          case 'palette':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-pink-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 000 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-gradient-to-tr from-pink-400 via-purple-400 to-blue-400 rounded-full opacity-20 transition-all duration-150
                        ${hovering ? 'scale-150 opacity-40' : 'scale-100'}`}
                    />
                  </>
              );
          case 'sun':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-yellow-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.93l1.41 1.41c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.4 3.52c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41zm11.31 11.31l1.41 1.41c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-1.41-1.41c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41zm-1.41-9.9l1.41-1.41c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0zM7.4 19.07l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-yellow-400/40 rounded-full transition-all duration-150 animate-spin-slow
                        ${hovering ? 'scale-125 border-dashed border-2' : 'scale-100'}`}
                    />
                  </>
              );
          case 'moon':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-indigo-300">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-indigo-900/20 rounded-full blur-sm transition-all duration-150
                        ${hovering ? 'scale-150 bg-indigo-500/20' : 'scale-100'}`}
                    />
                  </>
              );
          case 'umbrella':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-blue-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.85 15.79 17 12 17s-7.17-2.15-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7.58 4 .13 7.58.13 12c0 .34.04.67.11 1H2v6c0 1.1.9 2 2 2s2-.9 2-2v-6h12v6c0 1.1.9 2 2 2s2-.9 2-2v-6h1.76c.07-.33.11-.66.11-1 0-4.42-7.45-8-11.87-8z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border-t-2 border-blue-400/50 rounded-full transition-all duration-150
                        ${hovering ? 'translate-y-1 scale-110 border-t-4' : 'scale-100'}`}
                    />
                  </>
              );
          case 'bomb':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-gray-800 dark:text-gray-200">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11.25 2h1.5v2.25h-1.5zM8.88 3.94l1.06-1.06 1.59 1.59-1.06 1.06zM16.53 3.94l-1.06-1.06-1.59 1.59 1.06 1.06zM12 7a8 8 0 100 16 8 8 0 000-16zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-red-500/10 rounded-full blur-md transition-all duration-75
                        ${hovering ? 'scale-150 bg-orange-500/30 animate-pulse' : 'scale-100'}`}
                    />
                  </>
              );
          case 'robot':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-gray-600 dark:text-gray-300">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15 8c0-1.42-.5-2.73-1.33-3.76.42-.02.85.12 1.17.44l.41.41.71-.71-.41-.41C14.71 3.13 13.53 2.71 12.38 3c-1.27-.32-2.61.07-3.51.97l-.41.41.71.71.41-.41c.32-.32.75-.46 1.17-.44C9.9 5.27 9.4 6.58 9.4 8c-1.53.71-2.4 2.37-2.4 4 0 2.21 1.79 4 4 4h2c2.21 0 4-1.79 4-4 0-1.63-.87-3.29-2.4-4zM9 11c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm6 0c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border border-gray-400/50 rounded-md transition-all duration-100
                        ${hovering ? 'scale-110 bg-green-500/10 border-green-500' : 'scale-100'}`}
                    />
                  </>
              );
          case 'skull':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-gray-500 dark:text-gray-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.04.78 3.9 2.07 5.32C6.63 16.38 7 17.62 7 19v1h10v-1c0-1.38.37-2.62.93-3.68C19.22 13.9 20 12.04 20 10c0-4.42-3.58-8-8-8zm0 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4.29-3.29l-1.41 1.41c-.63-.63-1.66-.63-2.29 0-.63.63-1.66.63-2.29 0L8.9 11.71c1.41-1.41 3.69-1.41 5.1 0 1.41 1.41 3.69 1.41 5.1 0 1.41 1.41 3.69 1.41 5.1 0 1.41-1.41-2.29-1.41z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-gray-300/10 rounded-full blur-sm transition-all duration-150
                        ${hovering ? 'scale-125 opacity-20' : 'scale-100'}`}
                    />
                  </>
              );
          case 'potion':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 text-purple-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 16v-2h-2v-1h2v-2h-2V9h2V7h-2V5h2V3H7v2h2v2H7v2h2v2H7v1h2v2H7v3c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-3h2zM12 6c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-1 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 bg-purple-500/20 rounded-full blur-md transition-all duration-300 ease-out
                        ${hovering ? 'scale-150 bg-purple-400/30 animate-pulse' : 'scale-100'}`}
                    />
                  </>
              );
          default: // 'default'
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full pointer-events-none z-[9999] -ml-1.5 -mt-1.5 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border-2 rounded-full transition-all duration-150 ease-out flex items-center justify-center
                        ${hovering 
                            ? 'border-pink-500/80 bg-pink-500/10 dark:border-pink-400/80 dark:bg-pink-400/10 scale-125' 
                            : 'border-gray-400/60 dark:border-gray-500/60 scale-75'}`}
                    />
                  </>
              );
      }
  };

  return (
    <>
        {/* Global CSS to hide default cursor only when custom cursor is supported */}
        <style>{`
            @media (pointer: fine) {
                body, a, button, input, textarea, select, [role="button"], .cursor-pointer {
                    cursor: none !important;
                }
            }
        `}</style>
        <div className={`pointer-events-none transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {renderCursor()}
        </div>
    </>
  );
};

export default CustomCursor;
