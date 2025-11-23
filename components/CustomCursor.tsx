
import React, { useEffect, useRef, useState } from 'react';

const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  
  // Initialize off-screen
  const position = useRef({ x: -100, y: -100 });
  const followerPosition = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Only enable on devices with a fine pointer (mouse) to avoid issues on touchscreens
    const mediaQuery = window.matchMedia('(pointer: fine)');
    setIsSupported(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsSupported(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const onMouseMove = (e: MouseEvent) => {
      // Show cursor on movement
      if (!isVisible) setIsVisible(true);
      
      position.current = { x: e.clientX, y: e.clientY };
      
      const target = e.target as HTMLElement;
      // Check if target is interactive
      const isInteractive = 
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.matches('a, button, input, select, textarea, [role="button"]') ||
        target.closest('a, button, [role="button"]') !== null;
      
      setHovering(isInteractive);
    };
    
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);
    const onMouseDown = () => {
        if (followerRef.current) followerRef.current.style.transform += ' scale(0.8)';
    };
    const onMouseUp = () => {
        // Trigger re-render or let animation loop handle logic, 
        // usually purely visual click effects are handled by the loop if we track 'clicking' state,
        // but CSS transition handles scale well enough if we toggle a class.
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    let animationFrameId: number;

    const animate = () => {
      if (cursorRef.current && followerRef.current) {
        // Main dot follows instantly
        cursorRef.current.style.transform = `translate3d(${position.current.x}px, ${position.current.y}px, 0)`;
        
        // Follower smooth lerp (Linear Interpolation)
        followerPosition.current.x += (position.current.x - followerPosition.current.x) * 0.2; // Speed of follow
        followerPosition.current.y += (position.current.y - followerPosition.current.y) * 0.2;
        
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
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSupported, isVisible]);

  if (!isSupported) return null;

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
        <div className={`pointer-events-none fixed inset-0 z-[9999] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Main Dot */}
            <div 
                ref={cursorRef}
                className="absolute w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full -ml-1.5 -mt-1.5 shadow-[0_0_10px_rgba(236,72,153,0.5)] z-50"
            />
            {/* Follower Ring */}
            <div 
                ref={followerRef}
                className={`absolute rounded-full -ml-5 -mt-5 transition-all duration-300 ease-out flex items-center justify-center border-2 z-40
                ${hovering 
                    ? 'w-10 h-10 border-pink-500/80 bg-pink-500/10 dark:border-pink-400/80 dark:bg-pink-400/10 scale-125' 
                    : 'w-10 h-10 border-gray-400/60 dark:border-gray-500/60 scale-75'}
                `}
            />
        </div>
    </>
  );
};

export default CustomCursor;
