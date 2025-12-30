import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function BackgroundMesh() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        let animationFrameId: number;

        const orbs = [
            { x: w * 0.2, y: h * 0.2, r: 400, color: "rgba(20, 184, 166, 0.08)", vx: 0.2, vy: 0.1 }, // Teal
            { x: w * 0.8, y: h * 0.8, r: 500, color: "rgba(16, 185, 129, 0.06)", vx: -0.1, vy: -0.2 }, // Emerald
            { x: w * 0.5, y: h * 0.5, r: 300, color: "rgba(59, 130, 246, 0.05)", vx: 0.15, vy: -0.1 }, // Blue hint
        ];

        const render = () => {
            ctx.clearRect(0, 0, w, h);

            // Update and draw orbs
            orbs.forEach(orb => {
                orb.x += orb.vx;
                orb.y += orb.vy;

                // Bounce
                if (orb.x < -100 || orb.x > w + 100) orb.vx *= -1;
                if (orb.y < -100 || orb.y > h + 100) orb.vy *= -1;

                // Draw radial gradient
                const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
                g.addColorStop(0, orb.color);
                g.addColorStop(1, "rgba(0,0,0,0)");

                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", handleResize);
        render();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-slate-50 dark:bg-[#020408]">
            {/* CSS-based fallback/layer */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(200,200,200,0.05)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,100,0.02)_0%,transparent_50%)]" />

            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }}
            />

            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full blur-3xl opacity-60" />
        </div>
    );
}
