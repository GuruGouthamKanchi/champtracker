"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Trophy, Plus, Users, Sparkles, Check, Flame } from "lucide-react";

interface CreateChampionshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  onSuccess: (newId: string) => void;
}

export default function CreateChampionshipModal({ isOpen, onClose, apiUrl, onSuccess }: CreateChampionshipModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [idealGroupSize, setIdealGroupSize] = useState(4);
  const [minPlayers, setMinPlayers] = useState(4);
  const [advanceCount, setAdvanceCount] = useState(2);
  const [format, setFormat] = useState("standard");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${apiUrl}/api/championships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create championship.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["championships"] });
      onSuccess(data.championship_id);
      setName("");
      onClose();
    },
    onError: (err: any) => {
      setError(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a championship name.");
      return;
    }
    setError("");

    // Create a safe database slug
    const newId = `c_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Math.floor(Date.now() / 1000).toString().slice(-4)}`;

    createMutation.mutate({
      championship_id: newId,
      name: name.trim(),
      status: "open",
      ideal_group_size: idealGroupSize,
      min_players_for_groups: minPlayers,
      advance_per_group: advanceCount,
      created_at: new Date().toISOString(),
      closed_at: null,
      format: format,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Mobile Slide-Up Sheet Container */}
      <div className="relative w-full max-w-md bg-[#1C0407] border-t border-[#98111E]/40 rounded-t-3xl p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.9)] flex flex-col z-10 max-h-[90vh] overflow-y-auto">
        
        {/* Handle Bar */}
        <div className="w-12 h-1 bg-[#FBE4E3]/15 rounded-full mx-auto mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#98111E]/20 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#98111E]/20 border border-[#98111E]/30 text-[#D72638]">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-race text-[13px] font-black uppercase text-white tracking-widest">
                Create Tournament
              </h2>
              <span className="text-[7.5px] font-race text-white/40">
                Setup Championship Format & Driver Roster
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#3F0D12] text-[#FBE4E3]/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-[#D72638]/15 border border-[#D72638]/40 rounded-xl p-2.5 text-[8px] font-race text-[#D72638] font-bold mb-3 flex items-center gap-1.5">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Tournament Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[7px] font-race font-bold uppercase text-white/50 tracking-wider">
              Tournament Title
            </label>
            <input
              type="text"
              placeholder="e.g. F1 Grand Prix Championship Season 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#2C0509] text-[10.5px] font-race border border-[#98111E]/30 rounded-xl px-3 py-2.5 text-white placeholder-white/25 outline-none focus:border-[#D72638]"
              required
            />
          </div>

          {/* Quick Preset Selector for Min Players */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[7px] font-race font-bold uppercase text-white/50 tracking-wider flex items-center justify-between">
              <span>Required Driver Capacity</span>
              <span className="text-[#D72638]">{minPlayers} Drivers Minimum</span>
            </label>

            <div className="grid grid-cols-5 gap-1.5">
              {[4, 6, 8, 10, 12].map((count) => (
                <button
                  type="button"
                  key={count}
                  onClick={() => {
                    setMinPlayers(count);
                    if (count <= 4) setIdealGroupSize(4);
                    else if (count <= 6) setIdealGroupSize(3);
                    else setIdealGroupSize(4);
                  }}
                  className={`py-2 rounded-xl text-[9px] font-race font-extrabold uppercase border transition-all ${
                    minPlayers === count 
                      ? "bg-[#D72638] text-white border-[#D72638] shadow-md scale-105" 
                      : "bg-[#2C0509]/60 text-white/50 border-[#98111E]/20 hover:text-white"
                  }`}
                >
                  {count} P
                </button>
              ))}
            </div>
          </div>

          {/* Ideal Group Size & Advancement Count */}
          <div className="grid grid-cols-2 gap-3 bg-[#2C0509]/50 p-3 rounded-2xl border border-[#98111E]/20">
            
            {/* Ideal Group Size */}
            <div className="flex flex-col gap-1">
              <label className="text-[6.5px] font-race font-bold text-white/50 uppercase">Group Target Size</label>
              <select
                value={idealGroupSize}
                onChange={(e) => setIdealGroupSize(Number(e.target.value))}
                className="bg-[#1C0407] border border-[#98111E]/30 text-[9.5px] font-race font-bold text-white rounded-xl p-2 outline-none focus:border-[#D72638]"
              >
                <option value={3}>3 Drivers / Group</option>
                <option value={4}>4 Drivers / Group</option>
                <option value={5}>5 Drivers / Group</option>
                <option value={6}>6 Drivers / Group</option>
              </select>
            </div>

            {/* Advance Per Group */}
            <div className="flex flex-col gap-1">
              <label className="text-[6.5px] font-race font-bold text-white/50 uppercase">Advancing Per Group</label>
              <select
                value={advanceCount}
                onChange={(e) => setAdvanceCount(Number(e.target.value))}
                className="bg-[#1C0407] border border-[#98111E]/30 text-[9.5px] font-race font-bold text-white rounded-xl p-2 outline-none focus:border-[#D72638]"
              >
                <option value={1}>Top 1 Driver Advances</option>
                <option value={2}>Top 2 Drivers Advance</option>
                <option value={3}>Top 3 Drivers Advance</option>
              </select>
            </div>

          </div>

          {/* Playoff Structure Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[7px] font-race font-bold uppercase text-white/50 tracking-wider">
              Playoff Elimination Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat("standard")}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                  format === "standard"
                    ? "bg-[#D72638]/20 border-[#D72638] text-white shadow-inner"
                    : "bg-[#2C0509]/60 border-[#98111E]/20 text-white/40 hover:text-white"
                }`}
              >
                <span className="text-[8.5px] font-race font-extrabold uppercase flex items-center gap-1">
                  ⚡ Standard (Semis + Finals)
                </span>
                <span className="text-[6.5px] font-sans text-white/50">
                  Groups ➔ Semifinal Duels ➔ Grand Final
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("skip_semifinals")}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                  format === "skip_semifinals"
                    ? "bg-[#D72638]/20 border-[#D72638] text-white shadow-inner"
                    : "bg-[#2C0509]/60 border-[#98111E]/20 text-white/40 hover:text-white"
                }`}
              >
                <span className="text-[8.5px] font-race font-extrabold uppercase flex items-center gap-1">
                  🏁 Fast Track (Direct Final)
                </span>
                <span className="text-[6.5px] font-sans text-white/50">
                  Group Winners ➔ Straight to Final Duel
                </span>
              </button>
            </div>
          </div>

          {/* Configuration Preview Box */}
          <div className="bg-[#98111E]/10 border border-[#98111E]/25 rounded-xl p-2.5 flex items-center justify-between text-[7.5px] font-race text-[#FBE4E3]/80">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Min {minPlayers} Drivers required to trigger Fisher-Yates group allotment!
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full mt-1 bg-gradient-to-r from-[#98111E] via-[#D72638] to-[#FF4D5E] hover:from-[#D72638] hover:to-[#98111E] text-white font-race font-black uppercase tracking-widest text-[9.5px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-xl border border-[#FBE4E3]/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Start Tournament Registration
          </button>

        </form>
      </div>
    </div>
  );
}
