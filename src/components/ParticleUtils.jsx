/**
 * Particle class for managing individual particles
 */
class Particle {
  constructor(canvas) {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 5 + 1;
    this.speedX = Math.random() * 0.5 - 0.25;
    this.speedY = Math.random() * 0.5 - 0.25;
    this.opacity = Math.random() * 0.5 + 0.2;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    // Bounce off the edges
    if (this.x > window.innerWidth || this.x < 0) this.speedX *= -1;
    if (this.y > window.innerHeight || this.y < 0) this.speedY *= -1;
  }

  draw(ctx) {
    ctx.fillStyle = `rgba(52, 73, 85, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Create an array of particle objects
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @returns {Particle[]} Array of particle objects
 */
export function initializeParticles(canvas) {
  const isMobile = window.innerWidth < 500;
  const particleCount = isMobile ? 30 : 100;

  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(canvas));
  }

  return particles;
}

/**
 * Connect particles with lines if they are close enough
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Particle[]} particles - Array of particle objects
 */
function connectParticles(ctx, particles) {
  const maxDistance = window.innerWidth < 500 ? 80 : 150;

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxDistance) {
        ctx.strokeStyle = `rgba(52, 73, 85, ${
          (1 - distance / maxDistance) * 0.4
        })`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

/**
 * Animation function to update and draw particles
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Particle[]} particles - Array of particle objects
 * @returns {number} Animation frame ID
 */
export function animate(canvas, ctx, particles) {
  function animateFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw each particle
    particles.forEach((particle) => {
      particle.update();
      particle.draw(ctx);
    });

    // Connect particles with lines
    connectParticles(ctx, particles);

    // Continue animation loop
    return requestAnimationFrame(animateFrame);
  }

  return animateFrame();
}
