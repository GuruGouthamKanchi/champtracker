"use client";

import { useQuery } from "@tanstack/react-query";
import { X, Trophy, Calendar, Swords, Timer, Flag, Award, Gauge } from "lucide-react";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import CountUp from "@/components/CountUp";

interface Match {
  match_id: string;
  driver_a_id: string;
  driver_b_id: string;
  winner_id?: string;
  status: string;
  played_at?: string;
}

interface DriverProfileCardProps {
  driverId: string;
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  matches: Match[];
}

export default function DriverProfileCard({ driverId, isOpen, onClose, apiUrl, matches }: DriverProfileCardProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch driver profile data using React Query
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["driverProfile", driverId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/api/drivers/${driverId}`);
      if (!res.ok) throw new Error("Failed to load driver profile.");
      return res.json();
    },
    enabled: isOpen && !!driverId,
  });

  useEffect(() => {
    if (isOpen && overlayRef.current && panelRef.current) {
      // Slide up and fade in
      animate(overlayRef.current, {
        opacity: [0, 1],
        duration: 250,
        easing: "easeOutQuad",
      });
      animate(panelRef.current, {
        translateY: ["100%", "0%"],
        duration: 350,
        easing: "easeOutCubic",
      });
    }
  }, [isOpen, driverId]);

  const handleClose = () => {
    if (overlayRef.current && panelRef.current) {
      animate(overlayRef.current, {
        opacity: [1, 0],
        duration: 200,
        easing: "easeInQuad",
      });
      animate(panelRef.current, {
        translateY: ["0%", "100%"],
        duration: 250,
        easing: "easeInCubic",
        complete: onClose,
      });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Compute recent form from matches list
  const targetId = (driverId || "").toLowerCase().trim();
  const played = matches
    .filter(m => m.status === "played" && (
      (m.driver_a_id || "").toLowerCase().trim() === targetId || 
      (m.driver_b_id || "").toLowerCase().trim() === targetId
    ))
    .sort((a, b) => {
      const dateA = a.played_at ? new Date(a.played_at).getTime() : 0;
      const dateB = b.played_at ? new Date(b.played_at).getTime() : 0;
      return dateA - dateB;
    });
  const recentMatches = played.slice(-5); // last 5 matches

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop Overlay */}
      <div
        ref={overlayRef}
        onClick={handleClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0"
      />

      {/* Slide-Up Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-[#2C0509] border-t border-[#98111E]/40 rounded-t-3xl overflow-hidden shadow-2xl flex flex-col z-10 select-none pb-6 max-h-[85vh]"
        style={{ transform: "translateY(100%)" }}
      >
        {/* Header Indicator */}
        <div className="w-12 h-1 bg-[#FBE4E3]/15 rounded-full mx-auto my-3" />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#FBE4E3]/60 text-xs">
            <Timer className="w-6 h-6 animate-spin text-[#D72638] mb-2" />
            Analyzing career stats...
          </div>
        ) : error || !profile ? (
          <div className="text-center py-16 text-[10px] text-[#D72638] font-medium px-4">
            ⚠️ Could not load profile details. Check backend connection.
            <button onClick={handleClose} className="mt-4 block mx-auto px-4 py-1.5 bg-[#98111E] text-white rounded font-race">
              Go Back
            </button>
          </div>
        ) : (
          <div className="flex flex-col overflow-y-auto px-5">
            {/* Driver Hero Banner */}
            <div className="flex items-center gap-4 pb-4 border-b border-[#98111E]/20">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-race font-black text-lg border-2"
                style={{ 
                  backgroundColor: profile.avatar_color,
                  borderColor: `${profile.avatar_color}88`,
                  boxShadow: `0 0 12px ${profile.avatar_color}44`
                }}
              >
                {profile.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col flex-1">
                <h2 className="font-race text-[15px] font-black uppercase text-white tracking-widest leading-tight">
                  {profile.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[7.5px] font-race text-[#D72638] font-bold uppercase bg-[#98111E]/10 border border-[#98111E]/20 px-2 py-0.5 rounded-full">
                    ID: {profile.driver_id}
                  </span>
                  {profile.championships_won > 0 && (
                    <span className="text-[7.5px] font-race text-amber-400 font-bold uppercase bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      🏆 {profile.championships_won} CHAMP
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-1.5 rounded-full bg-[#3F0D12] text-[#FBE4E3]/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Statistics Grid */}
            <div className="grid grid-cols-2 gap-3.5 mt-5">
              
              {/* Championships Summary */}
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-between min-h-[70px]">
                <div className="flex items-center justify-between text-[7px] font-race uppercase text-[#FBE4E3]/40 tracking-wider">
                  <span>Championships</span>
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-race font-black text-white glow-text-crimson">
                    {profile.championships_won ?? 0}
                  </span>
                  <span className="text-[8px] text-[#FBE4E3]/40 font-race uppercase font-bold">
                    Won / {profile.championships_entered ?? 0} Entered
                  </span>
                </div>
              </div>

              {/* Dominance Index (Average Time Gap) */}
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-between min-h-[70px]">
                <div className="flex items-center justify-between text-[7px] font-race uppercase text-[#FBE4E3]/40 tracking-wider">
                  <span>Dominance Index</span>
                  <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span 
                    className="text-lg font-race font-black glow-text-ruby"
                    style={{ color: profile.average_time_gap_margin.startsWith("+") ? "#22C55E" : profile.average_time_gap_margin.startsWith("-") ? "#EF4444" : "#FBE4E3" }}
                  >
                    {profile.average_time_gap_margin}
                  </span>
                  <span className="text-[7.5px] text-[#FBE4E3]/40 font-race uppercase font-bold">
                    s Avg Margin
                  </span>
                </div>
              </div>

              {/* Matches Played & Wins */}
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-between min-h-[70px]">
                <div className="flex items-center justify-between text-[7px] font-race uppercase text-[#FBE4E3]/40 tracking-wider">
                  <span>Matches Played</span>
                  <Swords className="w-3.5 h-3.5 text-red-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-race font-black text-white">
                    {profile.total_matches_played ?? 0}
                  </span>
                  <span className="text-[8px] text-[#FBE4E3]/40 font-race uppercase font-bold">
                    ({profile.total_race_wins ?? 0} Wins)
                  </span>
                </div>
              </div>

              {/* Win Percentage */}
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-between min-h-[70px]">
                <div className="flex items-center justify-between text-[7px] font-race uppercase text-[#FBE4E3]/40 tracking-wider">
                  <span>Win Rate</span>
                  <Award className="w-3.5 h-3.5 text-[#D72638]" />
                </div>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-xl font-race font-black text-white glow-text-crimson">
                    {typeof profile.win_percentage === "number" ? profile.win_percentage.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-[9px] font-bold text-white/80">%</span>
                </div>
              </div>

            </div>

            {/* Recent Form */}
            <div className="glass-panel rounded-xl p-3.5 mt-4 flex items-center justify-between">
              <span className="text-[7.5px] font-race uppercase text-[#FBE4E3]/40 tracking-wider">Recent Form</span>
              <div className="flex gap-1.5">
                {recentMatches.length === 0 ? (
                  <span className="text-[8px] font-race text-[#FBE4E3]/30 italic">No matches played</span>
                ) : (
                  recentMatches.map((m, idx) => {
                    const winnerClean = (m.winner_id || "").toLowerCase().trim();
                    const isWin = winnerClean === targetId;
                    const isLoss = winnerClean !== "" && !["none", "null"].includes(winnerClean) && winnerClean !== targetId;
                    const label = isWin ? "W" : isLoss ? "L" : "D";
                    const colorClass = isWin 
                      ? "bg-green-500/10 text-green-400 border-green-500/20" 
                      : isLoss 
                        ? "bg-red-500/10 text-red-400 border-red-500/20" 
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20";
                    return (
                      <span 
                        key={idx}
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-race font-extrabold text-[9px] border ${colorClass}`}
                      >
                        {label}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* Best Track & Records */}
            <div className="flex flex-col gap-3 mt-4">
              
              {/* Best Track */}
              <div className="glass-panel rounded-xl p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#2C0509] border border-[#98111E]/20 text-[#D72638]">
                  <Flag className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[7.5px] font-race uppercase tracking-widest text-[#FBE4E3]/40">Best Track (Most Wins)</span>
                  <span className="text-[11px] font-semibold text-white/95 mt-0.5">
                    {profile.best_track_name ? `${profile.best_track_name}` : "No match victories yet"}
                  </span>
                  {profile.best_track_wins > 0 && (
                    <span className="text-[7.5px] text-[#D72638] font-race font-bold uppercase mt-0.5">
                      🏆 {profile.best_track_wins} Duel Victories
                    </span>
                  )}
                </div>
              </div>

              {/* Fastest Lap Overall */}
              <div className="glass-panel rounded-xl p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#2C0509] border border-[#98111E]/20 text-indigo-400">
                  <Timer className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[7.5px] font-race uppercase tracking-widest text-[#FBE4E3]/40">Absolute Fastest Lap</span>
                  <span className="text-[11.5px] font-mono font-bold text-indigo-300 mt-0.5">
                    {profile.fastest_recorded_lap ? profile.fastest_recorded_lap : "No lap times logged"}
                  </span>
                  {profile.fastest_lap_track_name && (
                    <span className="text-[7.5px] text-[#FBE4E3]/50 font-race font-semibold uppercase mt-0.5">
                      📍 {profile.fastest_lap_track_name}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* F1 Driver Quote Decor */}
            <div className="mt-6 mb-2 border-l-2 border-[#D72638] pl-3 py-1 italic text-[9px] text-[#FBE4E3]/50 leading-relaxed font-sans">
              "To achieve anything, you must be prepared to dabble on the boundary of disaster." 
              <span className="block mt-1 font-race uppercase tracking-wider text-[7px] text-[#D72638] font-bold font-style-normal">— MonoPosto Legends</span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
