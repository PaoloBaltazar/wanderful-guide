
import { useCallback, useState, useEffect } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import type { Engine, ISourceOptions } from "tsparticles-engine";

interface ConfettiAnimationProps {
  isActive?: boolean;
  duration?: number;
}

const confettiConfig: ISourceOptions = {
  fullScreen: {
    enable: true,
    zIndex: 1
  },
  particles: {
    number: {
      value: 0
    },
    color: {
      value: ["#00FFFC", "#FC00FF", "#fffc00", "#00FF6F", "#FF0000", "#0044FF"]
    },
    shape: {
      type: ["circle", "square", "triangle"]
    },
    opacity: {
      value: 1,
      animation: {
        enable: true,
        speed: 0.5,
        minimumValue: 0,
        sync: false,
        startValue: "max",
        destroy: "min"
      }
    },
    size: {
      value: { min: 3, max: 7 }
    },
    life: {
      duration: {
        sync: true,
        value: 6
      },
      count: 1
    },
    move: {
      enable: true,
      gravity: {
        enable: true,
        acceleration: 20
      },
      speed: { min: 25, max: 50 },
      decay: 0.05,
      direction: "none",
      outModes: {
        default: "destroy",
        top: "none"
      }
    }
  },
  emitters: {
    direction: "none",
    rate: {
      delay: 0.1,
      quantity: 10
    },
    position: {
      x: 50,
      y: 0
    },
    size: {
      width: 100,
      height: 0
    },
    startCount: 0
  }
};

const ConfettiAnimation = ({ isActive = false, duration = 3000 }: ConfettiAnimationProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize confetti when isActive changes
  useEffect(() => {
    if (isActive && !isPlaying) {
      setIsPlaying(true);
      
      // Auto-stop after duration
      const timer = setTimeout(() => {
        setIsPlaying(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isActive, duration, isPlaying]);

  // Initialize particles engine
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  if (!isPlaying) return null;

  return (
    <Particles
      id="confetti-animation"
      init={particlesInit}
      options={confettiConfig}
      className="absolute inset-0 pointer-events-none z-50"
    />
  );
};

export default ConfettiAnimation;
