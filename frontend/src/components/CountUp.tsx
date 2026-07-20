"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
}

export default function CountUp({ value, duration = 800, decimals = 0 }: CountUpProps) {
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    
    const obj = { val: 0 };
    const multiplier = 10 ** decimals;

    animate(obj, {
      val: value,
      duration: duration,
      easing: "easeOutCubic",
      update: () => {
        if (elementRef.current) {
          const displayVal = decimals === 0 
            ? Math.round(obj.val) 
            : Math.round(obj.val * multiplier) / multiplier;
          elementRef.current.innerText = displayVal.toFixed(decimals);
        }
      }
    });
  }, [value, duration, decimals]);

  return <span ref={elementRef}>0</span>;
}
