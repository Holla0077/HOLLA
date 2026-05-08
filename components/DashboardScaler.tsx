"use client";

import { useEffect, useState, ReactNode } from "react";

export default function DashboardScaler({ children }: { children: ReactNode }) {
  const BASE_WIDTH = 1440;
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const scaleValue = Math.min(window.innerWidth / BASE_WIDTH, 1);
      setScale(scaleValue);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div className="w-screen overflow-auto bg-[#070B1A]">
      <div
        className="origin-top-left"
        style={{
          transform: `scale(${scale})`,
          width: `${BASE_WIDTH}px`,
          height: `calc(100vh / ${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}