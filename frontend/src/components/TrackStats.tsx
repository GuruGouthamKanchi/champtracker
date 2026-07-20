"use client";

import { useState } from "react";
import { Timer, Award, Flame, Zap, Check, Search, Crown, MapPin, Flag } from "lucide-react";

interface Track {
  track_id: string;
  name: string;
  country: string;
  real_world_inspiration?: string;
  difficulty: string;
}

interface TrackRecord {
  track_id: string;
  record_time_value?: string;
  record_time_driver_id?: string;
  fastest_lap_value?: string;
  fastest_lap_driver_id?: string;
  most_wins_driver_id?: string;
  most_wins_count: number;
  undefeated_driver_id?: string;
  track_champion_driver_id?: string;
  track_champion_count: number;
}

interface Driver {
  driver_id: string;
  name: string;
  avatar_color: string;
}

interface TrackStatsProps {
  tracks: Track[];
  trackRecords: TrackRecord[];
  drivers: Driver[];
}

export default function TrackStats({ tracks, trackRecords, drivers }: TrackStatsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "extreme">("all");

  const getDriver = (id?: string) => drivers.find(d => d.driver_id === id);

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "medium": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "extreme": return "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse";
      default: return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  const filteredTracks = tracks.filter((track) => {
    const matchesSearch = 
      track.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      track.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (track.real_world_inspiration && track.real_world_inspiration.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDiff = difficultyFilter === "all" || track.difficulty.toLowerCase() === difficultyFilter;
    return matchesSearch && matchesDiff;
  });

  return (
    <div className="flex flex-col gap-3 px-4 pb-8 select-none">
      
      {/* Header Controls & Filter Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[7.5px] font-race text-[#D72638] uppercase font-bold tracking-widest">
            F1 Circuit Records & Hall of Fame
          </span>
          <span className="text-[7px] font-race text-white/50 bg-[#3F0D12] px-2 py-0.5 rounded-full border border-[#98111E]/20">
            {filteredTracks.length} Circuits
          </span>
        </div>

        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search circuit by name or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#2C0509]/80 border border-[#98111E]/30 rounded-xl pl-8 pr-8 py-2 text-[9px] font-race text-white placeholder-white/30 outline-none focus:border-[#D72638]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-white/40 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Difficulty Filter Tabs */}
        <div className="flex border border-[#98111E]/20 bg-[#2C0509]/60 rounded-xl p-0.5 text-[7.5px] font-race font-bold uppercase select-none">
          <button 
            onClick={() => setDifficultyFilter("all")}
            className={`flex-1 text-center py-1 rounded-lg transition-all ${difficultyFilter === "all" ? "bg-[#D72638] text-white shadow" : "text-white/40 hover:text-white"}`}
          >
            All Tracks
          </button>
          <button 
            onClick={() => setDifficultyFilter("easy")}
            className={`flex-1 text-center py-1 rounded-lg transition-all ${difficultyFilter === "easy" ? "bg-emerald-600 text-white shadow" : "text-white/40 hover:text-white"}`}
          >
            Easy
          </button>
          <button 
            onClick={() => setDifficultyFilter("medium")}
            className={`flex-1 text-center py-1 rounded-lg transition-all ${difficultyFilter === "medium" ? "bg-amber-600 text-white shadow" : "text-white/40 hover:text-white"}`}
          >
            Medium
          </button>
          <button 
            onClick={() => setDifficultyFilter("extreme")}
            className={`flex-1 text-center py-1 rounded-lg transition-all ${difficultyFilter === "extreme" ? "bg-red-600 text-white shadow" : "text-white/40 hover:text-white"}`}
          >
            Extreme 🔥
          </button>
        </div>
      </div>

      {/* Tracks Grid */}
      {filteredTracks.length === 0 ? (
        <div className="text-center py-14 text-[9.5px] text-[#FBE4E3]/40 italic">
          No circuits matching filter.
        </div>
      ) : (
        filteredTracks.map((track) => {
          const record = trackRecords.find((r) => r.track_id === track.track_id);
          
          const bestRaceDriver = getDriver(record?.record_time_driver_id);
          const fastestLapDriver = getDriver(record?.fastest_lap_driver_id);
          const mostWinsDriver = getDriver(record?.most_wins_driver_id);
          const championDriver = getDriver(record?.track_champion_driver_id);
          const undefeatedDriver = getDriver(record?.undefeated_driver_id);

          const hasRecords = record && (record.record_time_value || record.fastest_lap_value || record.most_wins_count > 0);
          const kingDriver = undefeatedDriver || mostWinsDriver || championDriver || bestRaceDriver;

          return (
            <div
              key={track.track_id}
              className="glass-panel border border-[#98111E]/20 rounded-2xl p-3.5 flex flex-col gap-2.5 relative overflow-hidden transition-all duration-300 hover:border-[#D72638]/40 shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#98111E]/15 pb-2">
                <div className="flex flex-col">
                  <h3 className="text-[12.5px] font-race font-black text-white tracking-wider uppercase flex items-center gap-1.5">
                    🏁 {track.name}
                  </h3>
                  <span className="text-[7.5px] text-[#FBE4E3]/60 font-sans tracking-wide mt-0.5 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-[#D72638]" /> {track.country} 
                    {track.real_world_inspiration ? ` • Inspired by ${track.real_world_inspiration}` : ""}
                  </span>
                </div>
                <span className={`text-[7px] font-race font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${getDifficultyColor(track.difficulty)}`}>
                  {track.difficulty}
                </span>
              </div>

              {/* King of the Track Hero Badge (If records exist) */}
              {kingDriver && (
                <div className="bg-gradient-to-r from-[#98111E]/30 via-[#3F0D12]/60 to-[#98111E]/30 border border-[#D72638]/30 rounded-xl p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
                    <div className="flex flex-col">
                      <span className="text-[6.5px] font-race text-amber-400 font-extrabold uppercase tracking-widest">
                        Circuit Record Holder
                      </span>
                      <span className="text-[10.5px] font-race font-black text-white">
                        {kingDriver.name}
                      </span>
                    </div>
                  </div>
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-race font-black text-[9px] border-2 shadow"
                    style={{ backgroundColor: kingDriver.avatar_color, borderColor: `${kingDriver.avatar_color}88` }}
                  >
                    {kingDriver.name.substring(0, 2).toUpperCase()}
                  </div>
                </div>
              )}

              {/* Records display grid */}
              {hasRecords ? (
                <div className="grid grid-cols-2 gap-2 mt-0.5">
                  
                  {/* Fastest Race Completion */}
                  {record.record_time_value && (
                    <div className="bg-[#2C0509]/60 rounded-xl p-2 border border-[#98111E]/20 flex items-center gap-2">
                      <Timer className="w-3.5 h-3.5 text-[#D72638] shrink-0" />
                      <div className="min-w-0 flex flex-col">
                        <span className="text-[6.5px] font-race text-white/40 uppercase tracking-widest leading-none">Fastest Race</span>
                        <span className="text-[10px] font-mono font-bold text-white mt-1 leading-none">
                          {record.record_time_value}
                        </span>
                        {bestRaceDriver && (
                          <span className="text-[7.5px] font-race font-semibold truncate mt-1" style={{ color: bestRaceDriver.avatar_color }}>
                            • {bestRaceDriver.name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fastest Lap Time */}
                  {record.fastest_lap_value && (
                    <div className="bg-[#2C0509]/60 rounded-xl p-2 border border-[#98111E]/20 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <div className="min-w-0 flex flex-col">
                        <span className="text-[6.5px] font-race text-white/40 uppercase tracking-widest leading-none">Fastest Lap</span>
                        <span className="text-[10px] font-mono font-bold text-indigo-300 mt-1 leading-none">
                          {record.fastest_lap_value}
                        </span>
                        {fastestLapDriver && (
                          <span className="text-[7.5px] font-race font-semibold truncate mt-1" style={{ color: fastestLapDriver.avatar_color }}>
                            • {fastestLapDriver.name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Most Wins */}
                  {record.most_wins_count > 0 && (
                    <div className="bg-[#2C0509]/60 rounded-xl p-2 border border-[#98111E]/20 flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div className="min-w-0 flex flex-col">
                        <span className="text-[6.5px] font-race text-white/40 uppercase tracking-widest leading-none">Most Wins</span>
                        <span className="text-[10px] font-race font-bold text-amber-400 mt-1 leading-none">
                          {record.most_wins_count} Wins
                        </span>
                        {mostWinsDriver && (
                          <span className="text-[7.5px] font-race font-semibold truncate mt-1" style={{ color: mostWinsDriver.avatar_color }}>
                            • {mostWinsDriver.name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Track Champion / Points */}
                  {record.track_champion_count > 0 && (
                    <div className="bg-[#2C0509]/60 rounded-xl p-2 border border-[#98111E]/20 flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <div className="min-w-0 flex flex-col">
                        <span className="text-[6.5px] font-race text-white/40 uppercase tracking-widest leading-none">Track Points</span>
                        <span className="text-[10px] font-race font-bold text-orange-400 mt-1 leading-none">
                          {record.track_champion_count} Pts
                        </span>
                        {championDriver && (
                          <span className="text-[7.5px] font-race font-semibold truncate mt-1" style={{ color: championDriver.avatar_color }}>
                            • {championDriver.name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Undefeated Badge (Overlay footer if any) */}
                  {undefeatedDriver && (
                    <div className="col-span-2 mt-1 py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                      <span className="text-[7.5px] font-race text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3" /> Undefeated Champion
                      </span>
                      <span className="text-[9px] font-race font-extrabold text-white" style={{ color: undefeatedDriver.avatar_color }}>
                        {undefeatedDriver.name}
                      </span>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-5 text-[9px] text-[#FBE4E3]/35 font-sans italic border border-dashed border-[#98111E]/20 rounded-xl bg-[#2C0509]/30">
                  🏎️ Unclaimed Track — Log a duel on this circuit to claim the all-time lap record!
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
