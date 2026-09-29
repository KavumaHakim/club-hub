
import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
  /** Global alpha applied to every glyph — the shell runs it at 0.55 so the
   *  rain sits behind the sidebar rules instead of competing with them. */
  dim?: number;
}

const MatrixRain: React.FC<MatrixRainProps> = ({ dim = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let drops: number[] = [];

    const getDimensions = () => {
        const parent = canvas.parentElement;
        if (parent) {
            return { width: parent.clientWidth, height: parent.clientHeight };
        }
        return { width: window.innerWidth, height: window.innerHeight };
    };

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = getDimensions();
      
      // Set actual size in memory (scaled to account for extra pixel density)
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Set visible style size (css pixels)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Normalize coordinate system to use css pixels
      ctx.scale(dpr, dpr);

      // Calculate columns based on logical width
      const columns = Math.floor(width / 20);
      
      // Initialize drops if array length is different
      if (drops.length !== columns) {
          drops = new Array(columns).fill(1);
      }
    };

    // Use ResizeObserver to detect size changes of the parent container (Sidebar)
    const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
    });
    
    if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
    }

    resizeCanvas();

    // Added binary and matrix-like chars
    const characters = "01ICTCLUBHUB<>/{};[]010101HAKIM";

    // Theme colours come from the document's tokens. They're cached and only
    // re-read when <html>'s class (the dark toggle) changes, not every frame.
    let fadeColor = '';
    let inkColor = '';
    const readThemeColors = () => {
      const rootStyles = getComputedStyle(document.documentElement);
      const isDark = document.documentElement.classList.contains('dark');
      fadeColor =
        rootStyles.getPropertyValue('--ch-matrix-fade').trim() ||
        (isDark ? 'rgba(20, 19, 18, 0.12)' : 'rgba(243, 242, 242, 0.12)');
      inkColor =
        rootStyles.getPropertyValue('--ch-matrix-ink').trim() ||
        (isDark ? '#f472b6' : '#db2777');
    };
    readThemeColors();
    const themeObserver = new MutationObserver(readThemeColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const draw = () => {
      const { width, height } = getDimensions();
      
      // Fade effect - trails
      ctx.fillStyle = fadeColor;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = inkColor;
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        const x = i * 20;
        const y = drops[i] * 20;

        // Random opacity for character variation to give "glitch" feel
        ctx.globalAlpha = (Math.random() > 0.95 ? 1.0 : 0.3 + Math.random() * 0.5) * dim;
        ctx.fillText(text, x, y);
        ctx.globalAlpha = 1.0;

        // Randomly reset drop to top (using logical height)
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [dim]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ mixBlendMode: 'normal' }}
    />
  );
};

export default MatrixRain;
