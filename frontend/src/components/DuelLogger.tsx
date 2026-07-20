"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { X, Send, RefreshCw, Timer, Swords, Gauge, Zap, CheckCircle2, Trophy, Copy } from "lucide-react";

interface Driver {
  driver_id: string;
  name: string;
  avatar_color: string;
}

interface Track {
  track_id: string;
  name: string;
  country: string;
  difficulty: string;
}

interface Match {
  match_id: string;
  championship_id: string;
  stage: string;
  group_id?: string;
  round: number;
  track_id: string;
  driver_a_id: string;
  driver_b_id: string;
  status: string;
}

interface DuelLoggerProps {
  drivers: Driver[];
  tracks: Track[];
  matches: Match[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiUrl: string;
  activeChampionshipId: string;
  initialMatchId?: string;
}

// Time parse helper
function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr || !timeStr.includes(":")) return null;
  try {
    const parts = timeStr.split(":");
    const minutes = parseInt(parts[0], 10);
    const secParts = parts[1].split(".");
    const seconds = parseInt(secParts[0], 10);
    const tenths = parseInt(secParts[1] || "0", 10);
    return minutes * 60 + seconds + tenths / 10;
  } catch {
    return null;
  }
}

// Smart auto-formatter for raw numeric inputs (e.g., "0122400" -> "01:22.400")
function autoFormatTime(input: string): string {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.length === 7) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}.${digits.slice(4)}`;
  }
  return input;
}

export default function DuelLogger({ 
  drivers, 
  tracks, 
  matches,
  isOpen, 
  onClose, 
  onSuccess, 
  apiUrl, 
  activeChampionshipId,
  initialMatchId
}: DuelLoggerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Scheduled match selection
  const [selectedMatchId, setSelectedMatchId] = useState("");
  
  // Custom fallback picker states (used if no scheduled match is chosen)
  const [fallbackTrackId, setFallbackTrackId] = useState("");
  const [fallbackDriverA, setFallbackDriverA] = useState("");
  const [fallbackDriverB, setFallbackDriverB] = useState("");

  // Race Stats
  const [raceTimeA, setRaceTimeA] = useState("");
  const [raceTimeB, setRaceTimeB] = useState("");
  const [raceLapA, setRaceLapA] = useState("");
  const [raceLapB, setRaceLapB] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Filter scheduled matches for active tournament
  const activeScheduled = matches.filter(
    (m) => m.championship_id === activeChampionshipId && m.status === "scheduled"
  );

  const targetMatchId = initialMatchId || "";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setSelectedMatchId(targetMatchId || activeScheduled[0]?.match_id || "");
      setFallbackTrackId(tracks[0]?.track_id || "");
      setFallbackDriverA("");
      setFallbackDriverB("");
      setRaceTimeA("");
      setRaceTimeB("");
      setRaceLapA("");
      setRaceLapB("");
      setError("");
      setSuccess(false);

      if (sheetRef.current) {
        animate(sheetRef.current, {
          translateY: ["100%", "0%"],
          duration: 350,
          easing: "easeOutCubic",
        });
      }
      if (overlayRef.current) {
        animate(overlayRef.current, {
          opacity: [0, 1],
          duration: 250,
          easing: "easeOutQuad",
        });
      }
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen, activeChampionshipId, targetMatchId]);

  const handleClose = () => {
    if (sheetRef.current) {
      animate(sheetRef.current, {
        translateY: ["0%", "100%"],
        duration: 250,
        easing: "easeInCubic",
      });
    }
    if (overlayRef.current) {
      animate(overlayRef.current, {
        opacity: [1, 0],
        duration: 200,
        easing: "easeInQuad",
      }).then(() => {
        onClose();
      });
    } else {
      onClose();
    }
  };

  const validateTimeFormat = (timeStr: string) => {
    if (!timeStr) return true;
    const regex = /^[0-5][0-9]:[0-5][0-9]\.[0-9]{3}$/;
    return regex.test(timeStr);
  };

  // Find active driver and track objects based on selection
  const selectedMatch = matches.find((m) => m.match_id === selectedMatchId);
  
  const driverAId = selectedMatch ? selectedMatch.driver_a_id : fallbackDriverA;
  const driverBId = selectedMatch ? selectedMatch.driver_b_id : fallbackDriverB;
  const trackId = selectedMatch ? selectedMatch.track_id : fallbackTrackId;

  const d1 = drivers.find((d) => d.driver_id === driverAId);
  const d2 = drivers.find((d) => d.driver_id === driverBId);
  const trackObj = tracks.find((t) => t.track_id === trackId);

  // Live gap bar calculation
  let gapSeconds = 0;
  let leadingDriver: "a" | "b" | "draw" = "draw";

  const tA = parseTimeToSeconds(raceTimeA);
  const tB = parseTimeToSeconds(raceTimeB);

  if (tA !== null && tB !== null) {
    gapSeconds = Math.abs(tA - tB);
    if (tA < tB) {
      leadingDriver = "a";
    } else if (tB < tA) {
      leadingDriver = "b";
    }
  }

  // Calculate percentage fill for the live gap bar
  const maxGapScale = 3.0;
  const fillPercentage = Math.min((gapSeconds / maxGapScale) * 100, 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverAId || !driverBId || !trackId) {
      setError("Please select a scheduled match or manual players.");
      return;
    }
    if (driverAId === driverBId) {
      setError("Driver A and Driver B cannot be the same player.");
      return;
    }

    if (!raceTimeA || !raceTimeB) {
      setError("Please enter race completion times for both drivers.");
      return;
    }

    const formattedRaceTimeA = autoFormatTime(raceTimeA);
    const formattedRaceTimeB = autoFormatTime(raceTimeB);
    const formattedLapA = raceLapA ? autoFormatTime(raceLapA) : formattedRaceTimeA;
    const formattedLapB = raceLapB ? autoFormatTime(raceLapB) : formattedRaceTimeB;

    const timeFields = [formattedRaceTimeA, formattedRaceTimeB, formattedLapA, formattedLapB];
    for (const f of timeFields) {
      if (f && !validateTimeFormat(f)) {
        setError("Times must use MM:SS.mmm format (e.g. 01:22.400). You can also type 7 digits like 0122400.");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      let matchIdToSave = selectedMatchId;
      if (!selectedMatchId) {
        const createRes = await fetch(`${apiUrl}/api/matches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match_id: `m-${Math.random().toString(36).substr(2, 9)}`,
            championship_id: activeChampionshipId,
            stage: "group",
            round: 1,
            track_id: trackId,
            driver_a_id: driverAId,
            driver_b_id: driverBId,
            status: "scheduled",
          })
        });
        if (!createRes.ok) throw new Error("Failed to create manual match skeleton.");
        const createdMatch = await createRes.json();
        matchIdToSave = createdMatch.match_id;
      }

      const payload = {
        race_time_a: formattedRaceTimeA,
        race_time_b: formattedRaceTimeB,
        race_fastest_lap_a: formattedLapA,
        race_fastest_lap_b: formattedLapB,
      };

      const resultRes = await fetch(`${apiUrl}/api/matches/${matchIdToSave}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resultRes.ok) {
        const err = await resultRes.json();
        throw new Error(err.detail || "Failed to submit match results.");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1000);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <div 
        ref={overlayRef}
        onClick={handleClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md opacity-0"
      />

      {/* Mobile Glassmorphic Drawer */}
      <div 
        ref={sheetRef}
        className="relative w-full max-w-md bg-[#1C0407] border-t border-[#98111E]/40 rounded-t-3xl shadow-[0_-12px_45px_rgba(0,0,0,0.95)] z-10 flex flex-col max-h-[92vh] overflow-hidden"
        style={{ transform: "translateY(100%)" }}
      >
        {/* Handle Bar */}
        <div className="w-12 h-1 bg-[#FBE4E3]/15 rounded-full mx-auto my-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-[#98111E]/20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#98111E]/20 border border-[#98111E]/30 text-[#D72638]">
              <Swords className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-race text-[13px] font-black uppercase tracking-widest text-white">
                Record Telemetry
              </h2>
              <span className="text-[7.5px] font-race text-white/40">
                Log Race Times & Fastest Laps
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {error && (
            <div className="bg-[#D72638]/15 border border-[#D72638]/40 rounded-xl p-3 text-[8px] text-[#D72638] font-race font-bold flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-[8.5px] text-emerald-400 font-race font-extrabold text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Match telemetry logged! Standings recomputed.
            </div>
          )}

          {/* Scheduled Match Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[7px] font-race font-bold uppercase tracking-wider text-[#D72638]">
              Scheduled Duel Pairing
            </label>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="bg-[#2C0509] text-[10.5px] font-race font-bold text-white rounded-xl border border-[#98111E]/30 p-2.5 outline-none cursor-pointer focus:border-[#D72638]"
            >
              <option value="">Manual Match Entry...</option>
              {activeScheduled.map((m) => {
                const da = drivers.find(d => d.driver_id === m.driver_a_id);
                const db = drivers.find(d => d.driver_id === m.driver_b_id);
                const track = tracks.find(t => t.track_id === m.track_id);
                return (
                  <option key={m.match_id} value={m.match_id}>
                    🏁 RD {m.round} • {da?.name.split(" ")[0]} vs {db?.name.split(" ")[0]} ({track?.name || "Circuit"})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Fallback Pickers */}
          {!selectedMatchId && (
            <div className="grid grid-cols-3 gap-2 bg-[#2C0509]/60 p-3 rounded-2xl border border-[#98111E]/20">
              <div className="flex flex-col gap-1">
                <label className="text-[6px] font-race text-white/40 uppercase">Driver A</label>
                <select
                  value={fallbackDriverA}
                  onChange={(e) => setFallbackDriverA(e.target.value)}
                  className="bg-[#1C0407] text-[9.5px] font-race font-bold text-white rounded-xl p-1.5 outline-none"
                >
                  <option value="">Select...</option>
                  {drivers.map(d => (
                    <option key={d.driver_id} value={d.driver_id} disabled={d.driver_id === fallbackDriverB}>{d.name.split(" ")[0]}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[6px] font-race text-white/40 uppercase">Driver B</label>
                <select
                  value={fallbackDriverB}
                  onChange={(e) => setFallbackDriverB(e.target.value)}
                  className="bg-[#1C0407] text-[9.5px] font-race font-bold text-white rounded-xl p-1.5 outline-none"
                >
                  <option value="">Select...</option>
                  {drivers.map(d => (
                    <option key={d.driver_id} value={d.driver_id} disabled={d.driver_id === fallbackDriverA}>{d.name.split(" ")[0]}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[6px] font-race text-white/40 uppercase">Circuit</label>
                <select
                  value={fallbackTrackId}
                  onChange={(e) => setFallbackTrackId(e.target.value)}
                  className="bg-[#1C0407] text-[9.5px] font-race font-bold text-white rounded-xl p-1.5 outline-none"
                >
                  {tracks.map(t => (
                    <option key={t.track_id} value={t.track_id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Competitors Arena Header */}
          {d1 && d2 && (
            <div className="bg-gradient-to-r from-[#2C0509] via-[#3F0D12] to-[#2C0509] border border-[#98111E]/30 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
              
              {/* Driver A */}
              <div className="flex flex-col items-center flex-1">
                <div 
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-race font-black text-white shadow-md" 
                  style={{ backgroundColor: d1.avatar_color, borderColor: `${d1.avatar_color}aa` }}
                >
                  {d1.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px] font-race font-extrabold text-white mt-1.5 truncate max-w-full">
                  {d1.name}
                </span>
                <span className="text-[6.5px] font-race text-[#D72638] uppercase font-bold mt-0.5">
                  ID: {d1.driver_id}
                </span>
              </div>

              {/* VS & Circuit Indicator */}
              <div className="flex flex-col items-center justify-center px-3 text-center">
                <span className="text-[10px] font-race font-black text-[#D72638] bg-[#D72638]/15 border border-[#D72638]/30 px-2.5 py-0.5 rounded-full uppercase">
                  VS
                </span>
                {trackObj && (
                  <span className="text-[6.5px] font-race text-white/40 uppercase mt-1.5 truncate max-w-[80px]">
                    📍 {trackObj.name}
                  </span>
                )}
              </div>

              {/* Driver B */}
              <div className="flex flex-col items-center flex-1">
                <div 
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-race font-black text-white shadow-md" 
                  style={{ backgroundColor: d2.avatar_color, borderColor: `${d2.avatar_color}aa` }}
                >
                  {d2.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px] font-race font-extrabold text-white mt-1.5 truncate max-w-full">
                  {d2.name}
                </span>
                <span className="text-[6.5px] font-race text-[#D72638] uppercase font-bold mt-0.5">
                  ID: {d2.driver_id}
                </span>
              </div>

            </div>
          )}

          {/* Live Telemetry Gap Bar */}
          {d1 && d2 && tA !== null && tB !== null && (
            <div className="bg-[#2C0509]/80 border border-[#98111E]/30 rounded-2xl p-3 flex flex-col gap-2.5 shadow-lg">
              <div className="flex items-center justify-between text-[7.5px] font-race uppercase text-white/50 tracking-wider">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-indigo-400" /> Live Gap Telemetry
                </span>
                <span className="text-[8px] font-mono font-bold text-indigo-300">
                  {leadingDriver === "draw" ? "DRAW" : `+${gapSeconds.toFixed(3)}s Delta`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 w-full bg-[#1C0407] rounded-full overflow-hidden flex border border-[#98111E]/20">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 z-10" />
                <div className="w-1/2 h-full flex justify-end">
                  {leadingDriver === "a" && (
                    <div 
                      className="h-full rounded-l-full bg-gradient-to-l from-indigo-500 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                      style={{ width: `${fillPercentage}%` }}
                    />
                  )}
                </div>
                <div className="w-1/2 h-full flex justify-start">
                  {leadingDriver === "b" && (
                    <div 
                      className="h-full rounded-r-full bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                      style={{ width: `${fillPercentage}%` }}
                    />
                  )}
                </div>
              </div>

              <div className="text-center text-[10px] font-race font-black">
                {leadingDriver === "draw" ? (
                  <span className="text-white/50 uppercase">Equal Combined Times</span>
                ) : leadingDriver === "a" ? (
                  <span style={{ color: d1.avatar_color }}>
                    🏆 {d1.name.split(" ")[0]} Leading by +{gapSeconds.toFixed(3)}s
                  </span>
                ) : (
                  <span style={{ color: d2.avatar_color }}>
                    🏆 {d2.name.split(" ")[0]} Leading by +{gapSeconds.toFixed(3)}s
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Race Telemetry Input Fields */}
          {d1 && d2 && (
            <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3 border border-[#98111E]/20">
              <div className="flex items-center justify-between pb-1 border-b border-[#98111E]/15">
                <span className="text-[8px] font-race font-black uppercase text-[#D72638] tracking-widest flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" /> Race Telemetry Data
                </span>
                <span className="text-[7px] font-mono text-white/40">Format: MM:SS.mmm</span>
              </div>
              
              {/* Overall Race Completion Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[7px] font-race uppercase font-bold text-white/70 truncate">
                    {d1.name.split(" ")[0]} Total Time
                  </label>
                  <input
                    type="text"
                    placeholder="01:22.400"
                    value={raceTimeA}
                    onChange={(e) => setRaceTimeA(e.target.value)}
                    onBlur={(e) => setRaceTimeA(autoFormatTime(e.target.value))}
                    className="bg-[#2C0509] text-[11px] font-mono font-bold border border-[#98111E]/30 rounded-xl px-3 py-2 text-white placeholder-white/20 outline-none focus:border-[#D72638]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[7px] font-race uppercase font-bold text-white/70 truncate">
                    {d2.name.split(" ")[0]} Total Time
                  </label>
                  <input
                    type="text"
                    placeholder="01:22.950"
                    value={raceTimeB}
                    onChange={(e) => setRaceTimeB(e.target.value)}
                    onBlur={(e) => setRaceTimeB(autoFormatTime(e.target.value))}
                    className="bg-[#2C0509] text-[11px] font-mono font-bold border border-[#98111E]/30 rounded-xl px-3 py-2 text-white placeholder-white/20 outline-none focus:border-[#D72638]"
                    required
                  />
                </div>
              </div>

              {/* Fastest Single Lap Times */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#98111E]/10">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[7px] font-race uppercase font-bold text-white/50 truncate">
                      {d1.name.split(" ")[0]} Best Lap
                    </label>
                    {raceTimeA && (
                      <button 
                        type="button" 
                        onClick={() => setRaceLapA(raceTimeA)} 
                        className="text-[6.5px] font-race text-indigo-400 hover:text-white"
                      >
                        Copy Race Time
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="00:40.120"
                    value={raceLapA}
                    onChange={(e) => setRaceLapA(e.target.value)}
                    onBlur={(e) => setRaceLapA(autoFormatTime(e.target.value))}
                    className="bg-[#2C0509] text-[11px] font-mono font-bold border border-[#98111E]/30 rounded-xl px-3 py-2 text-white placeholder-white/20 outline-none focus:border-[#D72638]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[7px] font-race uppercase font-bold text-white/50 truncate">
                      {d2.name.split(" ")[0]} Best Lap
                    </label>
                    {raceTimeB && (
                      <button 
                        type="button" 
                        onClick={() => setRaceLapB(raceTimeB)} 
                        className="text-[6.5px] font-race text-indigo-400 hover:text-white"
                      >
                        Copy Race Time
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="00:39.990"
                    value={raceLapB}
                    onChange={(e) => setRaceLapB(e.target.value)}
                    onBlur={(e) => setRaceLapB(autoFormatTime(e.target.value))}
                    className="bg-[#2C0509] text-[11px] font-mono font-bold border border-[#98111E]/30 rounded-xl px-3 py-2 text-white placeholder-white/20 outline-none focus:border-[#D72638]"
                  />
                </div>
              </div>

            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !d1 || !d2}
            className="w-full mt-1 bg-gradient-to-r from-[#98111E] via-[#D72638] to-[#FF4D5E] hover:from-[#D72638] hover:to-[#98111E] text-white font-race font-black uppercase tracking-widest text-[9.5px] py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xl border border-[#FBE4E3]/30 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving Telemetry...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit Duel Results
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
