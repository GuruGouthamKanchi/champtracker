"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Sparkles, Trophy, X, Dices, ShieldCheck, ChevronRight } from "lucide-react";

interface GroupAssignment {
  championship_id: string;
  group_id: string;
  group_name: string;
  driver_id: string;
}

interface Driver {
  driver_id: string;
  name: string;
  avatar_color: string;
}

interface GroupDrawRevealProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: GroupAssignment[];
  drivers: Driver[];
}

export default function GroupDrawReveal({ isOpen, onClose, assignments, drivers }: GroupDrawRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Group assignments by group_name
  const groupsData: Record<string, string[]> = {};
  assignments.forEach((a) => {
    if (!groupsData[a.group_name]) {
      groupsData[a.group_name] = [];
    }
    groupsData[a.group_name].push(a.driver_id);
  });

  useEffect(() => {
    if (isOpen && assignments.length > 0 && containerRef.current && titleRef.current) {
      // 1. Title glow & scale entry
      animate(titleRef.current, {
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 800,
        easing: "easeOutElastic(1, .6)",
      });

      // 2. Group cards fade-in & stagger slide-up
      animate(".group-reveal-card", {
        opacity: [0, 1],
        translateY: [40, 0],
        scale: [0.95, 1],
        delay: stagger(150, { start: 100 }),
        duration: 600,
        easing: "easeOutBack",
      });

      // 3. Driver items flip into slots inside their groups
      animate(".driver-reveal-item", {
        opacity: [0, 1],
        rotateY: [90, 0],
        scale: [0.8, 1],
        delay: stagger(100, { start: 500 }),
        duration: 650,
        easing: "easeOutBack",
      });
    }
  }, [isOpen, assignments]);

  if (!isOpen || assignments.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity"
      />

      {/* Mobile Glassmorphic Board */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-md bg-[#1C0407]/95 border border-[#D72638]/40 rounded-3xl p-5 shadow-[0_15px_50px_rgba(0,0,0,0.95)] flex flex-col z-10 overflow-y-auto max-h-[85vh]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-[#3F0D12] text-[#FBE4E3]/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title Block */}
        <div className="text-center flex flex-col items-center gap-1.5 mt-1 mb-5">
          <div className="flex items-center gap-2 text-[#D72638]">
            <Dices className="w-6 h-6 animate-bounce text-amber-400" />
            <h2 
              ref={titleRef}
              className="font-race text-[14px] font-black uppercase tracking-widest text-[#FBE4E3] glow-text-crimson"
            >
              Group Allotment Reveal
            </h2>
            <Sparkles className="w-5 h-5 animate-pulse text-amber-400" />
          </div>
          <span className="text-[7.5px] font-race uppercase text-[#FBE4E3]/50 tracking-wider bg-[#3F0D12] px-3 py-0.5 rounded-full border border-[#98111E]/20">
            🎲 Fisher-Yates Randomized Race Allotment
          </span>
        </div>

        {/* Groups Grid */}
        <div className="flex flex-col gap-3.5">
          {Object.keys(groupsData).sort().map((groupName) => (
            <div 
              key={groupName}
              className="group-reveal-card opacity-0 bg-[#2C0509]/80 border border-[#98111E]/30 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-xl"
            >
              {/* Group Title */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[#98111E]/25">
                <span className="text-[11px] font-race font-black uppercase text-[#D72638] tracking-widest flex items-center gap-1.5">
                  🏆 {groupName}
                </span>
                <span className="text-[7px] font-race text-white/50 bg-[#3F0D12] px-2 py-0.5 rounded-full border border-[#98111E]/20 uppercase">
                  {groupsData[groupName].length} Drivers Allotted
                </span>
              </div>

              {/* Drivers Stack Grid */}
              <div className="grid grid-cols-2 gap-2" style={{ perspective: "600px" }}>
                {groupsData[groupName].map((driverId) => {
                  const driverObj = drivers.find(d => d.driver_id === driverId);
                  const initial = (driverObj?.name || driverId).substring(0, 2).toUpperCase();

                  return (
                    <div 
                      key={driverId}
                      className="driver-reveal-item opacity-0 flex items-center gap-2.5 bg-[#1C0407]/90 border border-[#98111E]/20 rounded-xl p-2.5 shadow"
                    >
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-race font-black text-[9px] border shadow flex-none"
                        style={{ 
                          backgroundColor: driverObj?.avatar_color || "#D72638",
                          borderColor: `${driverObj?.avatar_color || "#D72638"}aa`
                        }}
                      >
                        {initial}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] font-race font-bold text-white truncate">
                          {driverObj?.name.split(" ")[0] || driverId}
                        </span>
                        <span className="text-[6.5px] font-race text-[#D72638] uppercase font-bold">
                          ID: {driverId}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Confirm Button */}
        <button
          onClick={onClose}
          className="mt-5 w-full bg-gradient-to-r from-[#98111E] via-[#D72638] to-[#FF4D5E] hover:from-[#D72638] hover:to-[#98111E] text-white font-race font-black uppercase tracking-widest text-[9.5px] py-3.5 rounded-2xl shadow-xl border border-[#FBE4E3]/30 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" /> Confirm Allotment & Proceed
        </button>
      </div>
    </div>
  );
}
