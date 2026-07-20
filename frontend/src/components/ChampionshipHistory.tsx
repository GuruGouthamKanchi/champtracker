"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Trophy, Calendar, Award } from "lucide-react";

interface Driver {
  driver_id: string;
  name: string;
  avatar_color: string;
}

interface Championship {
  championship_id: string;
  name: string;
  status: string;
  created_at: string;
  closed_at?: string;
  format: string;
}

interface Podium {
  championship_id: string;
  gold_driver_id: string;
  silver_driver_id: string;
  bronze_driver_id: string;
  completed_at: string;
}

interface ChampionshipHistoryProps {
  championships: Championship[];
  podiums: Podium[];
  drivers: Driver[];
  activeChampionshipId: string;
}

export default function ChampionshipHistory({
  championships,
  podiums,
  drivers,
  activeChampionshipId
}: ChampionshipHistoryProps) {
  const podiumRef = useRef<HTMLDivElement>(null);

  const closedChamps = championships.filter(c => c.status === "closed");
  const activePodium = podiums.find(p => p.championship_id === activeChampionshipId);

  useEffect(() => {
    if (activePodium && podiumRef.current) {
      // Staggered vertical scale up for the podium blocks
      animate(".podium-block-2nd", {
        height: ["0px", "65px"],
        duration: 800,
        easing: "easeOutElastic(1, .6)",
      });
      animate(".podium-block-1st", {
        height: ["0px", "90px"],
        duration: 900,
        delay: 150,
        easing: "easeOutElastic(1, .6)",
      });
      animate(".podium-block-3rd", {
        height: ["0px", "45px"],
        duration: 700,
        delay: 300,
        easing: "easeOutElastic(1, .6)",
      });

      // Fade in driver names on podiums
      animate(".podium-driver-name", {
        opacity: [0, 1],
        translateY: [10, 0],
        delay: 600,
        duration: 400,
        easing: "easeOutQuad",
      });

      // Trophy reveal scale-up bounce
      animate(".podium-trophy", {
        opacity: [0, 1],
        scale: [0.3, 1],
        translateY: [-15, 0],
        duration: 700,
        delay: 500,
        easing: "easeOutBack",
      });
    }
  }, [activeChampionshipId, activePodium]);

  const getDriver = (id: string) => drivers.find(d => d.driver_id === id);

  const dGold = activePodium ? getDriver(activePodium.gold_driver_id) : null;
  const dSilver = activePodium ? getDriver(activePodium.silver_driver_id) : null;
  const dBronze = activePodium ? getDriver(activePodium.bronze_driver_id) : null;

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 select-none">
      
      {/* 1. Active Closed Championship Podium Reveal */}
      {activePodium && (
        <div 
          ref={podiumRef}
          className="bg-gradient-to-b from-[#2C0509] to-[#3F0D12]/70 border border-[#98111E]/30 rounded-2xl p-4 flex flex-col items-center gap-4 shadow-xl"
        >
          <div className="text-center flex flex-col items-center gap-1">
            <span className="text-[7.5px] font-race text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1">
              🏆 Championship Conclusion
            </span>
            <span className="text-[6.5px] font-race uppercase text-[#FBE4E3]/40 tracking-wider">
              Podium Winners Ceremony
            </span>
          </div>

          {/* Vertical Podium Reveal Visualization */}
          <div className="flex items-end justify-center gap-4.5 w-full h-[180px] pt-4 pb-2 border-b border-[#98111E]/10">
            
            {/* 2nd Place (Silver) */}
            <div className="flex flex-col items-center w-[75px]">
              <div className="podium-driver-name opacity-0 flex flex-col items-center mb-1 text-center truncate w-full">
                <span className="text-[9px] font-race font-bold text-white truncate max-w-full">
                  {dSilver ? dSilver.name.split(" ")[0] : "Silver"}
                </span>
                <span className="text-[6px] font-race text-white/30 uppercase mt-0.5">2nd place</span>
              </div>
              <div 
                className="podium-block-2nd w-full bg-gradient-to-t from-slate-500/30 to-slate-400/25 border-t border-slate-400/50 rounded-t-lg flex items-center justify-center text-sm font-race font-extrabold text-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.15)]"
                style={{ height: "0px" }}
              >
                P2
              </div>
            </div>

            {/* 1st Place (Gold) */}
            <div className="flex flex-col items-center w-[85px]">
              <Trophy className="podium-trophy opacity-0 w-5 h-5 text-amber-400 mb-1" />
              <div className="podium-driver-name opacity-0 flex flex-col items-center mb-1 text-center truncate w-full">
                <span className="text-[10px] font-race font-extrabold text-amber-400 truncate max-w-full">
                  {dGold ? dGold.name.split(" ")[0] : "Gold"}
                </span>
                <span className="text-[6px] font-race text-amber-400/50 uppercase mt-0.5">1st Champion</span>
              </div>
              <div 
                className="podium-block-1st w-full bg-gradient-to-t from-amber-500/35 to-amber-400/30 border-t border-amber-400/60 rounded-t-lg flex items-center justify-center text-lg font-race font-black text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                style={{ height: "0px" }}
              >
                P1
              </div>
            </div>

            {/* 3rd Place (Bronze) */}
            <div className="flex flex-col items-center w-[75px]">
              <div className="podium-driver-name opacity-0 flex flex-col items-center mb-1 text-center truncate w-full">
                <span className="text-[9px] font-race font-bold text-white truncate max-w-full">
                  {dBronze ? dBronze.name.split(" ")[0] : "Bronze"}
                </span>
                <span className="text-[6px] font-race text-white/30 uppercase mt-0.5">3rd place</span>
              </div>
              <div 
                className="podium-block-3rd w-full bg-gradient-to-t from-amber-800/35 to-amber-700/30 border-t border-amber-700/50 rounded-t-lg flex items-center justify-center text-xs font-race font-bold text-amber-500 shadow-[0_0_12px_rgba(180,83,9,0.1)]"
                style={{ height: "0px" }}
              >
                P3
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. Full Championships History List */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#98111E]/15">
          <span className="text-[7.5px] font-race text-[#D72638] uppercase font-bold tracking-widest">Tournament History</span>
          <span className="text-[7.5px] font-race text-white/50">{closedChamps.length} closed events</span>
        </div>

        {closedChamps.length === 0 ? (
          <div className="text-center py-10 text-[9.5px] text-[#FBE4E3]/40 italic">
            No historical tournaments found.
          </div>
        ) : (
          closedChamps.map((c) => {
            const pod = podiums.find(p => p.championship_id === c.championship_id);
            const winner = pod ? getDriver(pod.gold_driver_id) : null;
            
            return (
              <div 
                key={c.championship_id}
                className="glass-panel border-l-2 rounded-lg p-3 flex flex-col gap-1.5"
                style={{ borderLeftColor: winner?.avatar_color || "#98111E" }}
              >
                <div className="flex items-center justify-between text-[7px] text-[#FBE4E3]/40 font-race uppercase">
                  <span>Championship ID: {c.championship_id}</span>
                  <span className="bg-[#2C0509] px-2 py-0.5 rounded border border-[#98111E]/20 text-[6px]">CLOSED</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11.5px] font-extrabold text-white">{c.name}</span>
                    <span className="text-[7.5px] font-race text-white/50 uppercase mt-0.5">
                      Champion: <span className="text-amber-400 font-bold">{winner ? winner.name.toUpperCase() : "None"}</span>
                    </span>
                  </div>

                  <Award className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
