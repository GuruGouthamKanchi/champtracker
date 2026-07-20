"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { X, Trophy, Swords, Timer, Award, Scale, RefreshCw, Flame, Gauge, Flag } from "lucide-react";
import { animate } from "animejs";

interface Driver {
  driver_id: string;
  name: string;
  avatar_color: string;
}

interface DriverCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  apiUrl: string;
}

export default function DriverCompareModal({ isOpen, onClose, drivers, apiUrl }: DriverCompareModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Search states
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");

  // Selector states
  const [driverAId, setDriverAId] = useState("");
  const [driverBId, setDriverBId] = useState("");

  // Initialize selectors
  useEffect(() => {
    if (drivers.length >= 2) {
      setDriverAId(drivers[0].driver_id);
      setDriverBId(drivers[1].driver_id);
    }
  }, [drivers, isOpen]);

  // Fetch H2H comparison using React Query
  const { data: comparison, isLoading, error } = useQuery({
    queryKey: ["driverComparison", driverAId, driverBId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/api/drivers/compare?a=${driverAId}&b=${driverBId}`);
      if (!res.ok) throw new Error("Failed to load H2H comparison.");
      return res.json();
    },
    enabled: isOpen && !!driverAId && !!driverBId && driverAId !== driverBId,
  });

  useEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current) {
      animate(overlayRef.current, {
        opacity: [0, 1],
        duration: 250,
        easing: "easeOutQuad",
      });
      animate(modalRef.current, {
        scale: [0.93, 1],
        opacity: [0, 1],
        duration: 300,
        easing: "easeOutCubic",
      });
    }
  }, [isOpen]);

  const handleClose = () => {
    if (overlayRef.current && modalRef.current) {
      animate(overlayRef.current, {
        opacity: [1, 0],
        duration: 200,
        easing: "easeInQuad",
      });
      animate(modalRef.current, {
        scale: [1, 0.93],
        opacity: [1, 0],
        duration: 200,
        easing: "easeInCubic",
        complete: onClose,
      });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const activeDriverA = drivers.find(d => d.driver_id === driverAId);
  const activeDriverB = drivers.find(d => d.driver_id === driverBId);

  // Search filtered dropdown list
  const filteredA = drivers.filter(d => 
    d.name.toLowerCase().includes(searchA.toLowerCase()) || 
    d.driver_id.toLowerCase().includes(searchA.toLowerCase())
  );

  const filteredB = drivers.filter(d => 
    d.name.toLowerCase().includes(searchB.toLowerCase()) || 
    d.driver_id.toLowerCase().includes(searchB.toLowerCase())
  );

  const totalMatches = comparison?.head_to_head?.matches_played || 0;
  const winsA = comparison?.head_to_head?.wins_a || 0;
  const winsB = comparison?.head_to_head?.wins_b || 0;
  const winPctA = totalMatches > 0 ? Math.round((winsA / totalMatches) * 100) : 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={handleClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md opacity-0"
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-[#1C0407] border border-[#98111E]/40 rounded-3xl overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.95)] flex flex-col z-10 max-h-[90vh]"
        style={{ opacity: 0 }}
      >
        {/* Header */}
        <div className="bg-[#2C0509] px-5 py-3.5 border-b border-[#98111E]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#D72638]">
            <div className="p-1.5 rounded-xl bg-[#98111E]/20 border border-[#98111E]/30 text-[#D72638]">
              <Scale className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-race text-[12px] font-black uppercase tracking-widest text-white">
                H2H Driver Battle Arena
              </h2>
              <span className="text-[7.5px] font-race text-white/40">
                Direct Telemetry & Career Record Comparison
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full bg-[#3F0D12] text-[#FBE4E3]/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dropdown Selectors with Search Pickers */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-[#2C0509]/60 border-b border-[#98111E]/15">
          
          {/* Driver A Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[7px] font-race font-bold uppercase tracking-widest text-[#D72638]">Driver A</label>
            <select
              value={driverAId}
              onChange={(e) => setDriverAId(e.target.value)}
              className="bg-[#1C0407] text-[10.5px] font-race font-bold text-white rounded-xl border border-[#98111E]/30 p-2 outline-none cursor-pointer focus:border-[#D72638]"
            >
              {filteredA.map((d) => (
                <option key={d.driver_id} value={d.driver_id} disabled={d.driver_id === driverBId}>
                  🏎️ {d.name.split(" ")[0]} ({d.driver_id})
                </option>
              ))}
            </select>
          </div>

          {/* Driver B Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[7px] font-race font-bold uppercase tracking-widest text-[#D72638]">Driver B</label>
            <select
              value={driverBId}
              onChange={(e) => setDriverBId(e.target.value)}
              className="bg-[#1C0407] text-[10.5px] font-race font-bold text-white rounded-xl border border-[#98111E]/30 p-2 outline-none cursor-pointer focus:border-[#D72638]"
            >
              {filteredB.map((d) => (
                <option key={d.driver_id} value={d.driver_id} disabled={d.driver_id === driverAId}>
                  🏎️ {d.name.split(" ")[0]} ({d.driver_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          
          {driverAId === driverBId ? (
            <div className="text-center py-12 text-[9.5px] text-[#FBE4E3]/40 italic">
              Please select two different drivers to compare.
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[#FBE4E3]/60 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-[#D72638] mb-2" />
              Calculating H2H Telemetry Comparison...
            </div>
          ) : error || !comparison ? (
            <div className="text-center py-12 text-[9.5px] text-[#D72638] font-medium">
              ⚠️ Comparison failed. Ensure both drivers are registered.
            </div>
          ) : (
            <>
              {/* Head-to-Head Battle Arena Card */}
              <div className="bg-gradient-to-r from-[#2C0509] via-[#3F0D12] to-[#2C0509] border border-[#98111E]/30 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
                
                {/* Competitor Face-Off Header */}
                <div className="flex items-center justify-between">
                  {/* Driver A Avatar & Name */}
                  <div className="flex flex-col items-center flex-1">
                    <div 
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-race font-black text-white shadow-lg"
                      style={{ 
                        backgroundColor: activeDriverA?.avatar_color || "#D72638",
                        borderColor: `${activeDriverA?.avatar_color || "#D72638"}aa`,
                        boxShadow: `0 0 12px ${activeDriverA?.avatar_color}44`
                      }}
                    >
                      {activeDriverA?.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[12px] font-race font-black text-white mt-1.5 truncate max-w-full">
                      {activeDriverA?.name}
                    </span>
                  </div>

                  {/* Scoreboard Middle */}
                  <div className="flex flex-col items-center px-3 text-center">
                    <span className="text-[8px] font-race text-white/40 uppercase tracking-widest mb-1">
                      {totalMatches} DUELS
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-race font-black text-white" style={{ color: activeDriverA?.avatar_color }}>
                        {winsA}
                      </span>
                      <span className="text-xs font-race text-[#D72638] font-bold">VS</span>
                      <span className="text-2xl font-race font-black text-white" style={{ color: activeDriverB?.avatar_color }}>
                        {winsB}
                      </span>
                    </div>
                  </div>

                  {/* Driver B Avatar & Name */}
                  <div className="flex flex-col items-center flex-1">
                    <div 
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-race font-black text-white shadow-lg"
                      style={{ 
                        backgroundColor: activeDriverB?.avatar_color || "#3F0D12",
                        borderColor: `${activeDriverB?.avatar_color || "#3F0D12"}aa`,
                        boxShadow: `0 0 12px ${activeDriverB?.avatar_color}44`
                      }}
                    >
                      {activeDriverB?.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[12px] font-race font-black text-white mt-1.5 truncate max-w-full">
                      {activeDriverB?.name}
                    </span>
                  </div>
                </div>

                {/* Tug-of-War Victory Dominance Meter */}
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between text-[7px] font-race uppercase text-white/50">
                    <span>{winPctA}% Dominance</span>
                    <span>{100 - winPctA}% Dominance</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#1C0407] rounded-full overflow-hidden flex border border-[#98111E]/20 p-0.5">
                    <div 
                      className="h-full rounded-l-full transition-all duration-500"
                      style={{ 
                        width: `${winPctA}%`, 
                        backgroundColor: activeDriverA?.avatar_color || "#D72638" 
                      }}
                    />
                    <div 
                      className="h-full rounded-r-full transition-all duration-500"
                      style={{ 
                        width: `${100 - winPctA}%`, 
                        backgroundColor: activeDriverB?.avatar_color || "#3F0D12" 
                      }}
                    />
                  </div>
                </div>

                {/* Speed Delta Pill */}
                <div className="pt-2 border-t border-[#98111E]/15 text-center flex flex-col items-center">
                  <span className="text-[7px] font-race uppercase text-white/40 tracking-wider">Average Speed Margin</span>
                  <span className="text-[11px] font-mono font-bold text-indigo-300 mt-0.5">
                    {comparison.head_to_head.average_signed_gap_a_vs_b}s Avg Time Delta
                  </span>
                </div>
              </div>

              {/* Metric Breakdown Comparison Rows */}
              <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3 border border-[#98111E]/20">
                <span className="text-[8px] font-race font-black uppercase text-[#D72638] tracking-widest pb-1 border-b border-[#98111E]/15">
                  Career Comparison Metrics
                </span>

                {/* Row 1: Titles */}
                <div className="flex items-center justify-between text-[9px] font-race border-b border-[#98111E]/10 pb-2">
                  <span className="font-bold text-amber-400">🏆 {comparison.profile_a.championships_won} Titles</span>
                  <span className="text-white/40 uppercase text-[7.5px]">Championship Titles</span>
                  <span className="font-bold text-amber-400">🏆 {comparison.profile_b.championships_won} Titles</span>
                </div>

                {/* Row 2: Win Percentage */}
                <div className="flex items-center justify-between text-[9px] font-race border-b border-[#98111E]/10 pb-2">
                  <span className="font-bold text-white">{comparison.profile_a.win_percentage}%</span>
                  <span className="text-white/40 uppercase text-[7.5px]">Career Win Rate</span>
                  <span className="font-bold text-white">{comparison.profile_b.win_percentage}%</span>
                </div>

                {/* Row 3: Dominance Margin */}
                <div className="flex items-center justify-between text-[9px] font-race border-b border-[#98111E]/10 pb-2">
                  <span className="font-mono font-bold text-indigo-300">{comparison.profile_a.average_time_gap_margin}s</span>
                  <span className="text-white/40 uppercase text-[7.5px]">Avg Dominance Margin</span>
                  <span className="font-mono font-bold text-indigo-300">{comparison.profile_b.average_time_gap_margin}s</span>
                </div>

                {/* Row 4: Total Race Wins */}
                <div className="flex items-center justify-between text-[9px] font-race">
                  <span className="font-bold text-white">🏎️ {comparison.profile_a.total_race_wins} Wins</span>
                  <span className="text-white/40 uppercase text-[7.5px]">Career Victories</span>
                  <span className="font-bold text-white">🏎️ {comparison.profile_b.total_race_wins} Wins</span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
