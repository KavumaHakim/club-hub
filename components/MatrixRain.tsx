
import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
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
    const characters = "01ICTCLUBHUB<>/{};[]010101";

    const draw = () => {
      const { width, height } = getDimensions();
      
      // Check dark mode directly from DOM to handle theme switches instantly
      const isDark = document.documentElement.classList.contains('dark');
      
      // Fade effect - trails
      ctx.fillStyle = isDark ? 'rgba(17, 24, 39, 0.1)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Text color - brighter pink/purple
      ctx.fillStyle = isDark ? '#f472b6' : '#d946ef'; // Pink-400 / Fuchsia-500
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        const x = i * 20;
        const y = drops[i] * 20;

        // Random opacity for character variation to give "glitch" feel
        ctx.globalAlpha = Math.random() > 0.95 ? 1.0 : 0.3 + Math.random() * 0.5;
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
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ mixBlendMode: 'normal' }}
    />
  );
};

export default MatrixRain;
