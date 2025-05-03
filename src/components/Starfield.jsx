import React, { useEffect, useRef } from "react";
import styles from "./Starfield.module.css";

const Starfield = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let stars = [];
    let animationFrameId;

    // Make canvas full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createStars(); // Recreate stars on resize
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    function createStars() {
      stars = []; // Clear existing stars

      // Create stars (significantly increased density)
      const numStars = 1500;

      for (let i = 0; i < numStars; i++) {
        // Create stars with z position for 3D effect - wider distribution and more size variation
        stars.push({
          x: Math.random() * canvas.width * 1.5 - canvas.width * 0.25, // Wider x distribution
          y: Math.random() * canvas.height * 1.5 - canvas.height * 0.25, // Wider y distribution
          z: Math.random() * 1500, // Deeper Z-depth for more layers
          radius: Math.random() * 2.2, // Larger maximum size
          color: `rgba(255, 255, 255, ${Math.random() * 0.6 + 0.4})`, // Brighter overall
          // Add some color variation - occasionally create colored stars
          colorHue:
            Math.random() > 0.85 ? Math.floor(Math.random() * 360) : null, // 15% of stars will have color
        });
      }
    }

    function animateStars() {
      // Set background
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center point for perspective
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Update and draw stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Move star closer (decrease z) - varied speed for more dynamic feel
        star.z = star.z - (3 + Math.random() * 2);

        // Reset star if it's too close
        if (star.z <= 0) {
          star.z = 1000;
          star.x = Math.random() * canvas.width;
          star.y = Math.random() * canvas.height;
        }

        // Project 3D position to 2D with perspective
        const scale = 1000 / star.z;
        const x2d = (star.x - centerX) * scale + centerX;
        const y2d = (star.y - centerY) * scale + centerY;

        // Calculate size based on distance
        const radius = Math.max(0.1, star.radius * scale);

        // Only draw if in bounds
        if (x2d > 0 && x2d < canvas.width && y2d > 0 && y2d < canvas.height) {
          // Star brightness increases as it gets closer
          const alpha = Math.min(1, (1000 - star.z) / 1000);

          // Use color if star has a hue, otherwise white
          if (star.colorHue !== null) {
            // Apply color with varying saturation based on distance
            const saturation = Math.floor(40 + (1 - star.z / 1000) * 60);
            const lightness = Math.floor(70 + (1 - star.z / 1000) * 30);
            ctx.fillStyle = `hsla(${star.colorHue}, ${saturation}%, ${lightness}%, ${alpha})`;
          } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          }

          // Draw star - brighter stars get a glow effect
          ctx.beginPath();
          ctx.arc(x2d, y2d, radius, 0, Math.PI * 2);
          ctx.fill();

          // Add subtle glow for closer/brighter stars
          if (star.z < 300) {
            const glowSize = radius * (1 + (300 - star.z) / 150);
            const glowAlpha = alpha * 0.4;

            // Create radial gradient for glow
            const glow = ctx.createRadialGradient(
              x2d,
              y2d,
              radius * 0.5,
              x2d,
              y2d,
              glowSize
            );

            if (star.colorHue !== null) {
              const saturation = Math.floor(40 + (1 - star.z / 1000) * 60);
              const lightness = Math.floor(70 + (1 - star.z / 1000) * 30);
              glow.addColorStop(
                0,
                `hsla(${star.colorHue}, ${saturation}%, ${lightness}%, ${glowAlpha})`
              );
            } else {
              glow.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha})`);
            }
            glow.addColorStop(1, "rgba(255, 255, 255, 0)");

            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x2d, y2d, glowSize, 0, Math.PI * 2);
            ctx.fill();
          }

          // Motion blur / speed lines code has been removed
        }
      }

      animationFrameId = requestAnimationFrame(animateStars);
    }

    createStars();
    animateStars();

    // Clean up
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.starfield}></canvas>;
};

export default Starfield;
