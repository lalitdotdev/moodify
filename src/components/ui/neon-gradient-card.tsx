"use client";

import {
    CSSProperties,
    ReactElement,
    ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";

import { cn } from "@/lib/utils";

interface NeonColorsProps {
    firstColor: string;
    secondColor: string;
    accentColor?: string;
}

interface NeonGradientCardProps {
    as?: ReactElement;
    className?: string;
    children?: ReactNode;
    borderSize?: number;
    borderRadius?: number;
    neonColors?: NeonColorsProps;
    glowIntensity?: number;
    animated?: boolean;
    glassmorphism?: boolean;
    [key: string]: unknown;
}

const NeonGradientCard: React.FC<NeonGradientCardProps> = ({
    className,
    children,
    borderSize = 2,
    borderRadius = 24,
    neonColors = {
        firstColor: "#A855F7",  // Purple
        secondColor: "#EC4899",  // Pink
        accentColor: "#8B5CF6"   // Indigo
    },
    glowIntensity = 0.7,
    animated = true,
    glassmorphism = true,
    ...props
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { offsetWidth, offsetHeight } = containerRef.current;
                setDimensions({ width: offsetWidth, height: offsetHeight });
            }
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);

        return () => {
            window.removeEventListener("resize", updateDimensions);
        };
    }, []);

    useEffect(() => {
        if (containerRef.current) {
            const { offsetWidth, offsetHeight } = containerRef.current;
            setDimensions({ width: offsetWidth, height: offsetHeight });
        }
    }, [children]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || !animated) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePosition({ x, y });
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                "--border-size": `${borderSize}px`,
                "--border-radius": `${borderRadius}px`,
                "--neon-first-color": neonColors.firstColor,
                "--neon-second-color": neonColors.secondColor,
                "--neon-accent-color": neonColors.accentColor,
                "--card-width": `${dimensions.width}px`,
                "--card-height": `${dimensions.height}px`,
                "--card-content-radius": `${borderRadius - borderSize}px`,
                "--glow-intensity": glowIntensity,
                "--mouse-x": `${mousePosition.x}px`,
                "--mouse-y": `${mousePosition.y}px`,
                "--hover-scale": isHovered ? "1.01" : "1",
            } as CSSProperties}
            className={cn(
                "relative z-10 h-full w-full rounded-[var(--border-radius)] transition-all duration-500",
                "hover:scale-[var(--hover-scale)]",
                className
            )}
            {...props}
        >
            <div
                className={cn(
                    "relative h-full min-h-[inherit] w-full rounded-[var(--card-content-radius)]",
                    "bg-gradient-to-br from-slate-950/90 to-slate-900/90",
                    glassmorphism && "backdrop-blur-xl bg-opacity-90",
                    "p-6 transition-all duration-300",
                    // Gradient border effect
                    "before:absolute before:-left-[var(--border-size)] before:-top-[var(--border-size)] before:-z-10",
                    "before:block before:h-[calc(100%+calc(var(--border-size)*2))] before:w-[calc(100%+calc(var(--border-size)*2))]",
                    "before:rounded-[var(--border-radius)] before:content-['']",
                    "before:bg-[linear-gradient(90deg,var(--neon-first-color),var(--neon-second-color),var(--neon-accent-color))]",
                    "before:bg-[length:200%_200%] before:animate-gradientSlow",
                    // Glow effect
                    "after:absolute after:-left-[var(--border-size)] after:-top-[var(--border-size)] after:-z-20",
                    "after:block after:h-[calc(100%+calc(var(--border-size)*2))] after:w-[calc(100%+calc(var(--border-size)*2))]",
                    "after:rounded-[var(--border-radius)] after:blur-2xl after:content-['']",
                    "after:bg-[radial-gradient(circle_at_var(--mouse-x)_var(--mouse-y),var(--neon-accent-color),transparent_40%)]",
                    "after:opacity-[var(--glow-intensity)] after:transition-opacity duration-300",
                    isHovered && "after:opacity-100",
                    // Subtle shadow
                    "shadow-lg shadow-purple-500/5",
                    // Music app specific styles
                    "[&_input]:bg-transparent [&_input]:border-0 [&_input]:ring-0",
                    "[&_input]:placeholder-slate-500",
                    "[&_input:focus]:ring-0 [&_input:focus]:border-0"
                )}
            >
                {children}
            </div>
        </div>
    );
};

export { NeonGradientCard };
