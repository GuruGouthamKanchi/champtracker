"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { Trophy, Swords, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";

interface LeaderboardRowData {
  driver_id: string;
  name: string;
  avatar_color: string;
  points: number;
  wins: number;
  losses: number;
  matches_played: number;
  rank: number;
  career_wins: number;
  championships_won: number;
  group_id: string;
  group_name?: string;
}

interface LeaderboardProps {
  drivers: LeaderboardRowData[];
}

export default function Leaderboard({ drivers }: LeaderboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Group the standings by group_id
  const grouped: Record<string, LeaderboardRowData[]> = {};
  drivers.forEach((d) => {
    const gid = d.group_id || "G1";
    if (!grouped[gid]) grouped[gid] = [];
    grouped[gid].push(d);
  });

  const groupIds = Object.keys(grouped).sort();
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const activeGroupId = groupIds[activeGroupIdx];
  const activeGroupStandings = grouped[activeGroupId] || [];

  // Sort each group standings by rank ascending
  activeGroupStandings.sort((a, b) => a.rank - b.rank);

  useEffect(() => {
    if (activeGroupStandings.length > 0 && containerRef.current) {
      // Stagger fade-in translate animation
      animate(".leaderboard-row", {
        opacity: [0, 1],
        translateX: [-15, 0],
        delay: stagger(30, { start: 50 }),
        duration: 400,
        easing: "easeOutCubic",
      });
    }
  }, [activeGroupIdx, activeGroupId, drivers]);

  if (drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#FBE4E3]/60 text-sm">
        <ShieldAlert className="w-8 h-8 text-[#D72638] mb-2" />
        No standings registered yet.
      </div>
    );
  }

  const handlePrev = () => {
    setActiveGroupIdx((prev) => (prev > 0 ? prev - 1 : groupIds.length - 1));
  };

  const handleNext = () => {
    setActiveGroupIdx((prev) => (prev < groupIds.length - 1 ? prev + 1 : 0));
  };

  const groupLabel = activeGroupStandings[0]?.group_name || `Group ${activeGroupId.replace("G", "")}`;

  return (
    <div ref={containerRef} className="flex flex-col gap-3 px-4 pb-6 select-none">
      
      {/* Group Swiper Header */}
      {groupIds.length > 1 && (
        <div className="flex items-center justify-between bg-[#3F0D12]/35 border border-[#98111E]/15 rounded-lg p-2">
          <button 
            onClick={handlePrev}
            className="p-1 rounded bg-[#2C0509] text-[#FBE4E3]/70 hover:text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-race font-extrabold uppercase text-[#D72638] tracking-widest glow-text-crimson">
              🏆 {groupLabel}
            </span>
            <span className="text-[6px] font-race uppercase text-white/40 mt-0.5">
              Swipe or toggle to view other pools
            </span>
          </div>

          <button 
            onClick={handleNext}
            className="p-1 rounded bg-[#2C0509] text-[#FBE4E3]/70 hover:text-white"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Standings List Container */}
      <div className="flex flex-col gap-2.5 pr-0.5">
        {activeGroupStandings.map((driver) => {
          const rank = driver.rank || 1;
          const isPodium = rank <= 3;
          const rankColors = [
            "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-[0_0_8px_rgba(251,191,36,0.5)]", // Gold
            "bg-gradient-to-r from-slate-300 to-slate-400 text-black shadow-[0_0_8px_rgba(203,213,225,0.5)]", // Silver
            "bg-gradient-to-r from-amber-700 to-amber-800 text-white shadow-[0_0_8px_rgba(180,83,9,0.4)]",   // Bronze
          ];
          
          return (
            <div
              key={driver.driver_id}
              className="leaderboard-row opacity-0 glass-panel hover:glass-panel-active transition-all duration-300 rounded-lg flex items-center p-3 relative overflow-hidden group"
            >
              {/* Color stripe representing the driver */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-[4px]" 
                style={{ backgroundColor: driver.avatar_color || "#D72638" }}
              />
              
              {/* Rank Badge */}
              <div className="flex items-center justify-center w-8 h-8 rounded-md font-race font-extrabold text-sm mr-3">
                {isPodium ? (
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${rankColors[rank - 1]}`}>
                    {rank}
                  </span>
                ) : (
                  <span className="text-[#FBE4E3]/60">{rank}</span>
                )}
              </div>

              {/* Driver Initials */}
              <div 
                className="w-9 h-9 rounded-full bg-[#2C0509] border flex items-center justify-center text-[10px] font-race font-bold mr-3 text-[#FBE4E3]/80 select-none"
                style={{ borderColor: `${driver.avatar_color}40` }}
              >
                {driver.name ? driver.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "?"}
              </div>

              {/* Driver info */}
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-[11.5px] font-race font-semibold text-white tracking-wide truncate">
                  {driver.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[7.5px] text-[#FBE4E3]/50 font-sans tracking-wide flex items-center gap-0.5">
                    🏆 {driver.championships_won} Titles
                  </span>
                  <span className="text-[7.5px] text-[#FBE4E3]/50 font-sans tracking-wide flex items-center gap-0.5">
                    🏁 {driver.career_wins} Wins
                  </span>
                </div>
              </div>

              {/* Standings Stats Grid */}
              <div className="flex items-center gap-3 text-right">
                {/* Record wins/played */}
                <div className="flex flex-col items-end">
                  <span className="text-[9.5px] text-white/95 flex items-center gap-1 font-race">
                    <Swords className="w-2.5 h-2.5 text-[#D72638]" />
                    {driver.wins}W - {driver.losses}L
                  </span>
                  <span className="text-[6.5px] text-[#FBE4E3]/40 tracking-wider">matches</span>
                </div>

                {/* Total Points */}
                <div className="flex flex-col items-end justify-center pl-2.5 border-l border-[#98111E]/20 min-w-[36px]">
                  <span className="text-[13px] font-race font-extrabold text-[#D72638] glow-text-crimson leading-tight">
                    {driver.points}
                  </span>
                  <span className="text-[6px] font-race text-[#FBE4E3]/60 uppercase tracking-widest leading-none">PTS</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
