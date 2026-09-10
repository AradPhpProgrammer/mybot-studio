import React, { useEffect, useRef } from 'react';

export default function NanoGridCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Floating subtle futuristic nano-squares
    const squares = [];
    const count = 35;

    for (let i = 0; i < count; i++) {
      squares.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 8 + 4,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.015,
        alpha: Math.random() * 0.25 + 0.05
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle grid connections between nearby squares
      for (let i = 0; i < squares.length; i++) {
        for (let j = i + 1; j < squares.length; j++) {
          const dx = squares[i].x - squares[j].x;
          const dy = squares[i].y - squares[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const opacity = (1 - dist / 140) * 0.12;
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(squares[i].x, squares[i].y);
            ctx.lineTo(squares[j].x, squares[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw rotating nano squares
      for (let i = 0; i < squares.length; i++) {
        const sq = squares[i];
        sq.x += sq.vx;
        sq.y += sq.vy;
        sq.rotation += sq.vRot;

        if (sq.x < 0 || sq.x > width) sq.vx *= -1;
        if (sq.y < 0 || sq.y > height) sq.vy *= -1;

        ctx.save();
        ctx.translate(sq.x, sq.y);
        ctx.rotate(sq.rotation);
        ctx.strokeStyle = `rgba(96, 165, 250, ${sq.alpha})`;
        ctx.strokeRect(-sq.size / 2, -sq.size / 2, sq.size, sq.size);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
