"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Trophy, Swords, Calendar, Plus, RefreshCw, 
  Download, Sparkles, Timer, Flag, Users, History, Scale, Search, ChevronRight
} from "lucide-react";

import Podium3D from "@/components/Podium3D";
import Leaderboard from "@/components/Leaderboard";
import TrackStats from "@/components/TrackStats";
import DuelLogger from "@/components/DuelLogger";
import DriverProfileCard from "@/components/DriverProfileCard";
import DriverCompareModal from "@/components/DriverCompareModal";
import DriverRegistration from "@/components/DriverRegistration";
import GroupDrawReveal from "@/components/GroupDrawReveal";
import ChampionshipHistory from "@/components/ChampionshipHistory";
import ModalAlert from "@/components/ModalAlert";
import CreateChampionshipModal from "@/components/CreateChampionshipModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Driver {
  driver_id: string;
  name: string;
  avatar_color: string;
  first_registered: string;
  total_championships_won: number;
  career_race_wins: number;
}

interface Championship {
  championship_id: string;
  name: string;
  status: string;
  ideal_group_size: number;
  min_players_for_groups: number;
  advance_per_group: number;
  created_at: string;
  closed_at?: string;
  format: string;
}

interface Registration {
  championship_id: string;
  driver_id: string;
  team_name_for_gp: string;
  registered_at: string;
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
  race_time_a?: string;
  race_time_b?: string;
  race_fastest_lap_a?: string;
  race_fastest_lap_b?: string;
  combined_gap?: string;
  winner_id?: string;
  points_a?: number;
  points_b?: number;
  status: string;
  played_at?: string;
}

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

interface Standing {
  championship_id: string;
  group_id: string;
  driver_id: string;
  matches_played: number;
  wins: number;
  losses: number;
  points: number;
  time_gap_margin: string;
  rank: number;
}

interface GroupAssignment {
  championship_id: string;
  group_id: string;
  group_name: string;
  driver_id: string;
}

interface Podium {
  championship_id: string;
  gold_driver_id: string;
  silver_driver_id: string;
  bronze_driver_id: string;
  completed_at: string;
}

export default function Home() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"standings" | "schedule" | "drivers" | "history">("standings");
  const [standingsSubToggle, setStandingsSubToggle] = useState<"leaderboard" | "tracks">("leaderboard");
  
  const [activeChampId, setActiveChampId] = useState("");
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isCreateChampOpen, setIsCreateChampOpen] = useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [loggerInitialMatchId, setLoggerInitialMatchId] = useState("");
  const [scheduleSubToggle, setScheduleSubToggle] = useState<"upcoming" | "results" | "circuits">("upcoming");

  // Group Draw animated reveal states
  const [drawRevealAssignments, setDrawRevealAssignments] = useState<GroupAssignment[]>([]);
  const [isDrawRevealOpen, setIsDrawRevealOpen] = useState(false);
  
  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Custom alert modal states
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "info">("info");

  const triggerAlert = (msg: string, type: "success" | "error" | "info" = "info") => {
    setAlertMsg(msg);
    setAlertType(type);
    setAlertOpen(true);
  };

  const fetchApi = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || `HTTP error ${res.status}`);
    }
    return res.json();
  };

  // 1. React Query Fetches
  const { data: championships = [], isLoading: isLoadingChamps } = useQuery<Championship[]>({
    queryKey: ["championships"],
    queryFn: () => fetchApi(`${API_URL}/api/championships`)
  });

  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => fetchApi(`${API_URL}/api/drivers`)
  });

  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: ["registrations"],
    queryFn: () => fetchApi(`${API_URL}/api/registrations`)
  });

  const { data: standings = [] } = useQuery<Standing[]>({
    queryKey: ["standings"],
    queryFn: () => fetchApi(`${API_URL}/api/standings`)
  });

  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ["tracks"],
    queryFn: () => fetchApi(`${API_URL}/api/tracks`)
  });

  const { data: trackRecords = [] } = useQuery<TrackRecord[]>({
    queryKey: ["trackRecords"],
    queryFn: () => fetchApi(`${API_URL}/api/track-records`)
  });

  const { data: matches = [], isLoading: isLoadingMatches } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: () => fetchApi(`${API_URL}/api/matches`)
  });

  const { data: podiums = [] } = useQuery<Podium[]>({
    queryKey: ["podiums"],
    queryFn: () => fetchApi(`${API_URL}/api/podiums`)
  });

  // Set default active championship
  useEffect(() => {
    if (championships.length > 0 && !activeChampId) {
      const activeChamp = championships.find(c => c.status === "in_progress" || c.status === "open" || c.status === "drawn") || championships[0];
      if (activeChamp) {
        setActiveChampId(activeChamp.championship_id);
      }
    }
  }, [championships, activeChampId]);

  // PWA Install listeners
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const handleManualRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  const handleLogSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
    queryClient.invalidateQueries({ queryKey: ["trackRecords"] });
    queryClient.invalidateQueries({ queryKey: ["drivers"] });
  };

  // Lifecycle buttons execution
  const [transitioning, setTransitioning] = useState(false);
  
  const handleDrawGroups = async () => {
    if (!activeChampId) return;
    setTransitioning(true);
    try {
      const res = await fetch(`${API_URL}/api/championships/${activeChampId}/draw`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        triggerAlert(err.detail || "Draw groups failed", "error");
      } else {
        const data = await res.json();
        setDrawRevealAssignments(data);
        setIsDrawRevealOpen(true);
        queryClient.invalidateQueries({ queryKey: ["championships"] });
        queryClient.invalidateQueries({ queryKey: ["standings"] });
      }
    } catch (e: any) {
      triggerAlert("Error drawing groups: " + e.message, "error");
    } finally {
      setTransitioning(false);
    }
  };

  const handleScheduleMatches = async () => {
    if (!activeChampId) return;
    setTransitioning(true);
    try {
      const res = await fetch(`${API_URL}/api/championships/${activeChampId}/schedule`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        triggerAlert(err.detail || "Scheduling failed", "error");
      } else {
        queryClient.invalidateQueries({ queryKey: ["championships"] });
        queryClient.invalidateQueries({ queryKey: ["matches"] });
        triggerAlert("Group matches scheduled successfully!", "success");
      }
    } catch (e: any) {
      triggerAlert("Error scheduling matches: " + e.message, "error");
    } finally {
      setTransitioning(false);
    }
  };

  const handleAdvanceSemifinals = async () => {
    if (!activeChampId) return;
    setTransitioning(true);
    try {
      const res = await fetch(`${API_URL}/api/championships/${activeChampId}/semifinal`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        triggerAlert(err.detail || "Generating semifinals failed", "error");
      } else {
        queryClient.invalidateQueries({ queryKey: ["matches"] });
        triggerAlert("Semifinals bracket generated successfully!", "success");
      }
    } catch (e: any) {
      triggerAlert("Error generating semifinals: " + e.message, "error");
    } finally {
      setTransitioning(false);
    }
  };

  const handleAdvanceFinals = async () => {
    if (!activeChampId) return;
    setTransitioning(true);
    try {
      const res = await fetch(`${API_URL}/api/championships/${activeChampId}/finals`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        triggerAlert(err.detail || "Generating finals failed", "error");
      } else {
        queryClient.invalidateQueries({ queryKey: ["matches"] });
        triggerAlert("Final and Bronze matches scheduled successfully!", "success");
      }
    } catch (e: any) {
      triggerAlert("Error generating finals: " + e.message, "error");
    } finally {
      setTransitioning(false);
    }
  };

  const handleCloseChampionship = async () => {
    if (!activeChampId) return;
    setTransitioning(true);
    try {
      const res = await fetch(`${API_URL}/api/championships/${activeChampId}/podium`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        triggerAlert(err.detail || "Podium declaration failed", "error");
      } else {
        queryClient.invalidateQueries({ queryKey: ["championships"] });
        queryClient.invalidateQueries({ queryKey: ["drivers"] });
        queryClient.invalidateQueries({ queryKey: ["podiums"] });
        triggerAlert("Championship closed! Podiums recorded successfully.", "success");
      }
    } catch (e: any) {
      triggerAlert("Error declaring podiums: " + e.message, "error");
    } finally {
      setTransitioning(false);
    }
  };

  // Filter standings & matches
  const activeStandings = Array.isArray(standings) ? standings.filter((s) => s.championship_id === activeChampId) : [];
  const leaderboardData = activeStandings
    .map((s) => {
      const d = Array.isArray(drivers) ? drivers.find((x) => x.driver_id === s.driver_id) : undefined;
      return {
        driver_id: s.driver_id,
        name: d?.name || s.driver_id,
        avatar_color: d?.avatar_color || "#D72638",
        points: s.points,
        wins: s.wins,
        losses: s.losses,
        matches_played: s.matches_played,
        rank: s.rank,
        career_wins: d?.career_race_wins || 0,
        championships_won: d?.total_championships_won || 0,
        group_id: s.group_id
      };
    })
    .sort((a, b) => a.rank - b.rank);

  const activeChampionship = Array.isArray(championships) ? championships.find((c) => c.championship_id === activeChampId) : undefined;
  const activeMatches = Array.isArray(matches) ? matches.filter((m) => m.championship_id === activeChampId) : [];

  // Split matches
  const scheduledMatches = activeMatches.filter(m => m.status === "scheduled");
  const playedMatches = activeMatches.filter(m => m.status === "played");

  // Top 3 for Podium 3D
  const getPodiumDriver = (rankIdx: number) => {
    const d = leaderboardData[rankIdx];
    if (!d) return undefined;
    const reg = Array.isArray(registrations) ? registrations.find(r => r.championship_id === activeChampId && r.driver_id === d.driver_id) : undefined;
    return {
      name: d.name,
      team_name: reg?.team_name_for_gp || "Independent",
      color: d.avatar_color
    };
  };

  const firstPlace = getPodiumDriver(0);
  const secondPlace = getPodiumDriver(1);
  const thirdPlace = getPodiumDriver(2);

  const isGlobalLoading = isLoadingChamps || isLoadingDrivers || isLoadingMatches;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#3F0D12]">
      
      {/* Header */}
      <header className="bg-[#2C0509] px-4 py-3 border-b border-[#98111E]/40 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-[#D72638] text-white px-2 py-0.5 rounded font-race text-[10px] font-black uppercase italic tracking-wider animate-pulse">
            GP
          </div>
          <h1 className="font-race text-[12px] font-black uppercase tracking-widest text-[#FBE4E3] glow-text-crimson">
            MonoPosto Arena
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 text-[8px] font-race font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full"
            >
              <Download className="w-2.5 h-2.5" /> Install
            </button>
          )}
          <button
            onClick={handleManualRefresh}
            className="p-1 rounded bg-[#3F0D12] text-[#FBE4E3]/70 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 3D Hero Podium only on Standings tab for active championships */}
      {activeTab === "standings" && standingsSubToggle === "leaderboard" && activeChampionship?.status !== "closed" && (
        <Podium3D first={firstPlace} second={secondPlace} third={thirdPlace} />
      )}

      {/* Championship Selector */}
      <div className="mx-4 mt-4 p-3 bg-gradient-to-b from-[#2C0509] to-[#3F0D12] rounded-xl border border-[#98111E]/25 shadow-md flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-race text-[#D72638] font-bold uppercase tracking-widest">Active Tournament</span>
          <span className="text-[7.5px] font-race text-white/50 uppercase tracking-widest">Status: {activeChampionship?.status.toUpperCase() || "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <select
            value={activeChampId}
            onChange={(e) => setActiveChampId(e.target.value)}
            className="flex-1 bg-transparent text-xs font-race font-bold text-[#FBE4E3] border-none p-0 focus:ring-0 cursor-pointer outline-none"
          >
            {championships.map((c) => (
              <option key={c.championship_id} value={c.championship_id} className="bg-[#3F0D12] text-white">
                🏎️ {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsCreateChampOpen(true)}
            className="p-1 rounded bg-[#98111E]/20 text-[#D72638] border border-[#98111E]/30 hover:bg-[#98111E]/40 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95"
            title="Create New Tournament"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Admin controls inside selector block */}
        {activeChampionship && !transitioning && (
          <div className="mt-2.5 pt-2 border-t border-[#98111E]/15 flex flex-wrap gap-1.5 justify-start">
            {activeChampionship.status === "open" && registrations.filter(r => r.championship_id === activeChampId).length >= activeChampionship.min_players_for_groups && (
              <button onClick={handleDrawGroups} className="text-[7.5px] font-race font-bold uppercase text-white bg-indigo-600 border border-indigo-500 px-2 py-0.5 rounded">
                🎲 Draw Groups
              </button>
            )}
            {activeChampionship.status === "drawn" && (
              <button onClick={handleScheduleMatches} className="text-[7.5px] font-race font-bold uppercase text-white bg-green-600 border border-green-500 px-2 py-0.5 rounded">
                📅 Schedule Matches
              </button>
            )}
            {activeChampionship.status === "in_progress" && (
              <>
                {scheduledMatches.length === 0 && playedMatches.length > 0 && !activeMatches.some(m => m.stage === "semifinal" || m.stage === "final") && activeChampionship.format !== "skip_semifinals" && (
                  <button onClick={handleAdvanceSemifinals} className="text-[7.5px] font-race font-bold uppercase text-white bg-amber-600 border border-amber-500 px-2 py-0.5 rounded">
                    🚀 Generate Semis
                  </button>
                )}
                {/* Semis completed? Or skip semifinals direct scheduler */}
                {((activeMatches.some(m => m.stage === "semifinal") && !activeMatches.some(m => m.stage === "semifinal" && m.status === "scheduled")) || (activeChampionship.format === "skip_semifinals" && scheduledMatches.length === 0 && playedMatches.length > 0)) && !activeMatches.some(m => m.stage === "final") && (
                  <button onClick={handleAdvanceFinals} className="text-[7.5px] font-race font-bold uppercase text-white bg-amber-600 border border-amber-500 px-2 py-0.5 rounded">
                    🏁 Schedule Finals
                  </button>
                )}
                {/* Finals completed? */}
                {activeMatches.some(m => m.stage === "final" && m.status === "played") && (
                  <button onClick={handleCloseChampionship} className="text-[7.5px] font-race font-bold uppercase text-white bg-red-600 border border-red-500 px-2 py-0.5 rounded">
                    🏆 Declare Podiums
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Driver Registration Component (Only shown when championship is open) */}
      {activeChampionship?.status === "open" && (
        <DriverRegistration
          championshipId={activeChampId}
          drivers={drivers}
          registrations={registrations}
          apiUrl={API_URL}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto mt-2 pb-24">
        {isGlobalLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#FBE4E3]/60 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-[#D72638] mb-2" />
            Reading telemetry databases...
          </div>
        ) : (
          <>
            {/* 1. STANDINGS & HISTORIES TAB */}
            {activeTab === "standings" && (
              <div className="flex flex-col gap-3">
                {activeChampionship?.status === "closed" ? (
                  /* History Ceremony reveal for Closed tournaments */
                  <ChampionshipHistory
                    championships={championships}
                    podiums={podiums}
                    drivers={drivers}
                    activeChampionshipId={activeChampId}
                  />
                ) : (
                  /* Active group standings with sub toggle records */
                  <>
                    <div className="flex mx-4 border border-[#98111E]/20 bg-[#2C0509]/60 rounded-lg p-0.5 text-[8.5px] font-race font-bold uppercase">
                      <button 
                        onClick={() => setStandingsSubToggle("leaderboard")}
                        className={`flex-1 text-center py-1.5 rounded-md ${standingsSubToggle === "leaderboard" ? "bg-[#D72638] text-white" : "text-[#FBE4E3]/50"}`}
                      >
                        Group Leaderboard
                      </button>
                      <button 
                        onClick={() => setStandingsSubToggle("tracks")}
                        className={`flex-1 text-center py-1.5 rounded-md ${standingsSubToggle === "tracks" ? "bg-[#D72638] text-white" : "text-[#FBE4E3]/50"}`}
                      >
                        Circuit Records
                      </button>
                    </div>

                    {standingsSubToggle === "leaderboard" ? (
                      <Leaderboard drivers={leaderboardData} />
                    ) : (
                      <TrackStats tracks={tracks} trackRecords={trackRecords} drivers={drivers} />
                    )}
                  </>
                )}
              </div>
            )}

            {/* 2. SCHEDULE TAB - F1 RACE WEEKEND HUB */}
            {activeTab === "schedule" && (
              <div className="flex flex-col gap-3 px-4 pb-8">
                
                {/* Header & Sub-Toggle Selector */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[7.5px] font-race text-[#D72638] uppercase font-bold tracking-widest">Race Weekend Schedule</span>
                    <span className="text-[7px] font-race text-white/50 bg-[#3F0D12] px-2 py-0.5 rounded-full border border-[#98111E]/20">
                      {scheduledMatches.length} Pending • {playedMatches.length} Finished
                    </span>
                  </div>

                  {/* Sub Toggles */}
                  <div className="flex border border-[#98111E]/20 bg-[#2C0509]/60 rounded-xl p-0.5 text-[8px] font-race font-bold uppercase select-none">
                    <button 
                      onClick={() => setScheduleSubToggle("upcoming")}
                      className={`flex-1 text-center py-1.5 rounded-lg transition-all ${scheduleSubToggle === "upcoming" ? "bg-[#D72638] text-white shadow-md" : "text-[#FBE4E3]/50 hover:text-white"}`}
                    >
                      📅 Upcoming ({scheduledMatches.length})
                    </button>
                    <button 
                      onClick={() => setScheduleSubToggle("results")}
                      className={`flex-1 text-center py-1.5 rounded-lg transition-all ${scheduleSubToggle === "results" ? "bg-[#D72638] text-white shadow-md" : "text-[#FBE4E3]/50 hover:text-white"}`}
                    >
                      🏁 Results ({playedMatches.length})
                    </button>
                  </div>
                </div>

                {/* VIEW 1: UPCOMING DUELS */}
                {scheduleSubToggle === "upcoming" && (
                  <div className="flex flex-col gap-3 mt-1">
                    {scheduledMatches.length === 0 ? (
                      <div className="text-center py-14 text-[9.5px] text-[#FBE4E3]/40 italic">
                        All matches played or schedule not drawn yet.
                      </div>
                    ) : (
                      scheduledMatches.map((match) => {
                        const d1 = drivers.find((d) => d.driver_id === match.driver_a_id);
                        const d2 = drivers.find((d) => d.driver_id === match.driver_b_id);
                        const trackObj = tracks.find((t) => t.track_id === match.track_id);
                        
                        const difficultyColorClass = 
                          trackObj?.difficulty === "easy" 
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : trackObj?.difficulty === "medium"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20";

                        return (
                          <div 
                            key={match.match_id}
                            className="glass-panel border-l-4 rounded-xl p-3 flex flex-col gap-2 transition-all shadow-xl hover:border-[#D72638] border-l-[#D72638]"
                          >
                            {/* Circuit Header */}
                            <div className="flex items-center justify-between text-[7.5px] font-race pb-1.5 border-b border-[#98111E]/15">
                              <span className="font-bold text-[#FBE4E3] uppercase flex items-center gap-1 truncate max-w-[65%]">
                                🏁 {trackObj?.name || "Circuit"} ({trackObj?.country || "GP"})
                              </span>
                              <span className={`border px-1.5 py-0.5 rounded text-[6.5px] uppercase font-black ${difficultyColorClass}`}>
                                {trackObj?.difficulty || "EASY"}
                              </span>
                            </div>

                            {/* Driver vs Driver Arena */}
                            <div className="flex items-center justify-between py-1">
                              {/* Driver A */}
                              <div className="flex items-center gap-2 flex-1">
                                <div 
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-race font-black text-[9px] border shadow flex-none"
                                  style={{ backgroundColor: d1?.avatar_color || "#D72638" }}
                                >
                                  {d1?.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[11px] font-race font-bold text-white truncate">
                                  {d1?.name.split(" ")[0]}
                                </span>
                              </div>

                              {/* VS Emblem */}
                              <div className="flex flex-col items-center justify-center px-2">
                                <span className="text-[9px] font-race font-black text-[#D72638] bg-[#D72638]/15 border border-[#D72638]/30 px-2 py-0.5 rounded-full uppercase">
                                  VS
                                </span>
                              </div>

                              {/* Driver B */}
                              <div className="flex items-center justify-end gap-2 flex-1 text-right">
                                <span className="text-[11px] font-race font-bold text-white truncate">
                                  {d2?.name.split(" ")[0]}
                                </span>
                                <div 
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-race font-black text-[9px] border shadow flex-none"
                                  style={{ backgroundColor: d2?.avatar_color || "#3F0D12" }}
                                >
                                  {d2?.name.substring(0, 2).toUpperCase()}
                                </div>
                              </div>
                            </div>

                            {/* Match Footer & Direct Log Button */}
                            <div className="flex items-center justify-between pt-1 border-t border-[#98111E]/10">
                              <span className="text-[7px] font-race text-white/40 tracking-wider">
                                ROUND {match.round} • STAGE: {match.stage.toUpperCase()}
                              </span>
                              <button
                                onClick={() => {
                                  setLoggerInitialMatchId(match.match_id);
                                  setIsLoggerOpen(true);
                                }}
                                className="flex items-center gap-1 text-[7.5px] font-race font-extrabold uppercase text-white bg-gradient-to-r from-[#98111E] to-[#D72638] border border-[#D72638]/50 px-2.5 py-1 rounded-lg shadow-md active:scale-95 transition-transform cursor-pointer"
                              >
                                ⚡ Log Duel
                              </button>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* VIEW 2: COMPLETED RESULTS */}
                {scheduleSubToggle === "results" && (
                  <div className="flex flex-col gap-2.5 mt-1">
                    {playedMatches.length === 0 ? (
                      <div className="text-center py-14 text-[9.5px] text-[#FBE4E3]/40 italic">
                        No finished duels yet.
                      </div>
                    ) : (
                      playedMatches.map((match) => {
                        const d1 = drivers.find((d) => d.driver_id === match.driver_a_id);
                        const d2 = drivers.find((d) => d.driver_id === match.driver_b_id);
                        const winner = drivers.find((d) => d.driver_id === match.winner_id);
                        const trackObj = tracks.find((t) => t.track_id === match.track_id);
                        const formattedDate = match.played_at 
                          ? new Date(match.played_at).toLocaleDateString(undefined, {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                            })
                          : "Finished";

                        return (
                          <div 
                            key={match.match_id}
                            className="glass-panel border-l-4 rounded-xl p-3 flex flex-col gap-1.5 transition-all shadow"
                            style={{ borderLeftColor: winner?.avatar_color || "#D72638" }}
                          >
                            <div className="flex items-center justify-between text-[7px] text-[#FBE4E3]/40 tracking-wider font-race">
                              <span className="font-bold text-[#D72638] uppercase truncate max-w-[65%]">
                                🏁 {trackObj?.name || "Circuit"} ({trackObj?.country || "GP"})
                              </span>
                              <span>{formattedDate}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[11.5px] font-bold text-white/95">
                                  {d1?.name.split(" ")[0]} vs {d2?.name.split(" ")[0]}
                                </span>
                                <span className="text-[8px] font-race text-[#FBE4E3]/60 mt-0.5 flex items-center gap-1">
                                  WINNER: <span style={{ color: winner?.avatar_color || "#FFF" }}>{match.winner_id ? winner?.name.toUpperCase() : "DRAW"}</span>
                                  {match.combined_gap && (
                                    <span className="text-[7.5px] font-mono text-indigo-300">
                                      (Gap: {match.combined_gap}s)
                                    </span>
                                  )}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-center bg-[#2C0509] rounded-md px-2 py-0.5 text-[6.5px] font-race text-white border border-[#98111E]/20 uppercase">
                                {match.stage}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            )}

            {/* 3. DRIVERS TAB - PREMIUM MOBILE PADDOCK GARAGE */}
            {activeTab === "drivers" && (
              <div className="flex flex-col gap-3 px-4 pb-8">
                
                {/* Search Bar & Action Row */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[7.5px] font-race text-[#D72638] uppercase font-bold tracking-widest">Paddock Drivers</span>
                      <span className="text-[7px] font-race text-white/50 bg-[#3F0D12] px-2 py-0.5 rounded-full border border-[#98111E]/20">
                        {drivers.length} Registered
                      </span>
                    </div>
                    <button 
                      onClick={() => setIsCompareOpen(true)}
                      className="flex items-center gap-1 text-[8px] font-race font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-full active:scale-95 transition-transform"
                    >
                      <Scale className="w-3 h-3" /> Compare H2H
                    </button>
                  </div>

                  {/* Instant Search Bar */}
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 absolute left-3 text-white/40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search driver by name..."
                      value={driverSearchQuery}
                      onChange={(e) => setDriverSearchQuery(e.target.value)}
                      className="w-full bg-[#2C0509]/80 border border-[#98111E]/30 rounded-xl pl-8 pr-8 py-2 text-[9px] font-race text-white placeholder-white/30 outline-none focus:border-[#D72638]"
                    />
                    {driverSearchQuery && (
                      <button
                        onClick={() => setDriverSearchQuery("")}
                        className="absolute right-3 text-white/40 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Driver Cards Grid */}
                {(() => {
                  const filteredDrivers = drivers.filter(d => 
                    d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) || 
                    d.driver_id.toLowerCase().includes(driverSearchQuery.toLowerCase())
                  );

                  if (filteredDrivers.length === 0) {
                    return (
                      <div className="text-center py-14 text-[9.5px] text-[#FBE4E3]/40 italic">
                        No drivers matching "{driverSearchQuery}".
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 gap-2.5 mt-1">
                      {filteredDrivers.map((driver) => (
                        <div 
                          key={driver.driver_id}
                          onClick={() => setSelectedProfileId(driver.driver_id)}
                          className="glass-panel border-l-4 rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer hover:border-[#D72638] active:scale-[0.98] shadow-lg"
                          style={{ borderLeftColor: driver.avatar_color || "#D72638" }}
                        >
                          {/* Left: Driver Avatar Badge & Info */}
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-race font-black text-xs border-2 shadow-md flex-none"
                              style={{ 
                                backgroundColor: driver.avatar_color,
                                borderColor: `${driver.avatar_color}aa`,
                                boxShadow: `0 0 10px ${driver.avatar_color}44`
                              }}
                            >
                              {driver.name.substring(0, 2).toUpperCase()}
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[12px] font-race font-extrabold text-white tracking-wide">
                                {driver.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[6.5px] font-race text-[#D72638] uppercase font-bold bg-[#D72638]/10 border border-[#D72638]/20 px-1.5 py-0.5 rounded">
                                  ID: {driver.driver_id}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Driver Career Stats & Arrow */}
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end gap-0.5 text-right">
                              <span className="text-[8px] font-race font-bold text-amber-400 flex items-center gap-0.5">
                                🏆 {driver.total_championships_won} Titles
                              </span>
                              <span className="text-[7.5px] font-race text-white/50">
                                🏎️ {driver.career_race_wins} Race Wins
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/30" />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

              </div>
            )}

            {/* 4. HISTORY TAB - F1 TELEMETRY & RIVALRY ARCHIVE */}
            {activeTab === "history" && (
              <div className="flex flex-col gap-3 px-4 pb-8">
                
                {/* Header & Quick Summary */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[7.5px] font-race text-[#D72638] uppercase font-bold tracking-widest">Telemetry Archive</span>
                    <span className="text-[7px] font-race text-white/50 bg-[#3F0D12] px-2 py-0.5 rounded-full border border-[#98111E]/20">
                      {playedMatches.length} Duels Logged
                    </span>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="glass-panel p-2.5 rounded-xl flex items-center justify-between">
                      <span className="text-[7px] font-race uppercase text-white/50">Total Duels</span>
                      <span className="text-[11px] font-race font-extrabold text-white">{playedMatches.length}</span>
                    </div>
                    <div className="glass-panel p-2.5 rounded-xl flex items-center justify-between">
                      <span className="text-[7px] font-race uppercase text-white/50">Circuits Raced</span>
                      <span className="text-[11px] font-race font-extrabold text-amber-400">
                        {Array.from(new Set(playedMatches.map(m => m.track_id))).length} Tracks
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duels List */}
                {playedMatches.length === 0 ? (
                  <div className="text-center py-14 text-[9.5px] text-[#FBE4E3]/40 italic">
                    No completed duels logged in history yet.
                  </div>
                ) : (
                  playedMatches.map((match) => {
                    const d1 = drivers.find((d) => d.driver_id === match.driver_a_id);
                    const d2 = drivers.find((d) => d.driver_id === match.driver_b_id);
                    const winner = drivers.find((d) => d.driver_id === match.winner_id);
                    const trackObj = tracks.find((t) => t.track_id === match.track_id);
                    const formattedDate = match.played_at 
                      ? new Date(match.played_at).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })
                      : "Completed";

                    const isDriverAWinner = match.winner_id === match.driver_a_id;
                    const isDriverBWinner = match.winner_id === match.driver_b_id;

                    return (
                      <div 
                        key={match.match_id}
                        className="glass-panel border-l-4 rounded-xl p-3 flex flex-col gap-2 transition-all shadow-xl"
                        style={{ borderLeftColor: winner?.avatar_color || "#D72638" }}
                      >
                        {/* Header Banner */}
                        <div className="flex items-center justify-between text-[7.5px] font-race pb-1.5 border-b border-[#98111E]/15">
                          <span className="font-bold text-[#D72638] uppercase truncate max-w-[65%] flex items-center gap-1">
                            🏁 {trackObj?.name || "Circuit"} ({trackObj?.country || "GP"})
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-[#2C0509] rounded-md px-1.5 py-0.5 text-[6.5px] font-race text-white border border-[#98111E]/20 uppercase">
                              {match.stage}
                            </span>
                            <span className="text-white/40 text-[7px]">{formattedDate}</span>
                          </div>
                        </div>
                        
                        {/* Driver vs Driver Outcome Arena */}
                        <div className="flex items-center justify-between py-1">
                          
                          {/* Driver A */}
                          <div className={`flex items-center gap-2 flex-1 ${isDriverAWinner ? "opacity-100" : "opacity-60"}`}>
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-race font-black text-[9.5px] border-2 shadow flex-none"
                              style={{ 
                                backgroundColor: d1?.avatar_color || "#D72638",
                                borderColor: isDriverAWinner ? "#FFD700" : "transparent"
                              }}
                            >
                              {d1?.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-race font-bold text-white truncate">
                                {d1?.name.split(" ")[0]}
                              </span>
                              {isDriverAWinner && (
                                <span className="text-[6.5px] font-race font-black text-amber-400 uppercase">
                                  🏆 VICTORY
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Gap Badge */}
                          <div className="flex flex-col items-center justify-center px-2 text-center">
                            {match.combined_gap ? (
                              <span className="text-[8px] font-mono font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                                +{match.combined_gap}s
                              </span>
                            ) : (
                              <span className="text-[7.5px] font-race text-white/40">DRAW</span>
                            )}
                          </div>

                          {/* Driver B */}
                          <div className={`flex items-center justify-end gap-2 flex-1 text-right ${isDriverBWinner ? "opacity-100" : "opacity-60"}`}>
                            <div className="flex flex-col items-end">
                              <span className="text-[11px] font-race font-bold text-white truncate">
                                {d2?.name.split(" ")[0]}
                              </span>
                              {isDriverBWinner && (
                                <span className="text-[6.5px] font-race font-black text-amber-400 uppercase">
                                  🏆 VICTORY
                                </span>
                              )}
                            </div>
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-race font-black text-[9.5px] border-2 shadow flex-none"
                              style={{ 
                                backgroundColor: d2?.avatar_color || "#3F0D12",
                                borderColor: isDriverBWinner ? "#FFD700" : "transparent"
                              }}
                            >
                              {d2?.name.substring(0, 2).toUpperCase()}
                            </div>
                          </div>

                        </div>

                        {/* Gap Meter Visualization */}
                        {match.combined_gap && (
                          <div className="w-full bg-[#1C0407] rounded-full h-1.5 overflow-hidden flex border border-[#98111E]/20 my-0.5">
                            <div className="w-1/2 h-full flex justify-end">
                              {isDriverAWinner && (
                                <div 
                                  className="h-full rounded-l-full bg-gradient-to-l from-indigo-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                                  style={{ width: `${Math.min((parseFloat(match.combined_gap) / 2.0) * 100, 100)}%` }}
                                />
                              )}
                            </div>
                            <div className="w-1/2 h-full flex justify-start">
                              {isDriverBWinner && (
                                <div 
                                  className="h-full rounded-r-full bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                                  style={{ width: `${Math.min((parseFloat(match.combined_gap) / 2.0) * 100, 100)}%` }}
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Race Telemetry Breakdown */}
                        <div className="pt-1.5 border-t border-[#98111E]/10 flex flex-col gap-1 text-[7.5px]">
                          <span className="font-race font-bold text-[#FBE4E3]/40 uppercase tracking-wider">Race Telemetry Log</span>
                          <div className="grid grid-cols-2 gap-2 text-[#FBE4E3]/70 font-mono">
                            <span>🏎️ {d1?.name.split(" ")[0]}: {match.race_time_a || "N/A"} (Lap: {match.race_fastest_lap_a || "N/A"})</span>
                            <span>🏎️ {d2?.name.split(" ")[0]}: {match.race_time_b || "N/A"} (Lap: {match.race_fastest_lap_b || "N/A"})</span>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FLOATING MOBILE NATIVE APP BOTTOM DOCK NAVBAR */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-md z-40 select-none">
        <div className="bg-[#1C0407]/90 backdrop-blur-xl border border-[#98111E]/40 rounded-3xl p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.85)] flex items-center justify-around relative">
          
          {/* Tab 1: Standings */}
          <button 
            onClick={() => setActiveTab("standings")}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
              activeTab === "standings" 
                ? "bg-gradient-to-b from-[#D72638]/30 to-[#98111E]/50 text-white font-extrabold shadow-inner border border-[#D72638]/40" 
                : "text-white/45 hover:text-white/80"
            }`}
          >
            <Trophy className={`w-4 h-4 transition-transform ${activeTab === "standings" ? "scale-110 text-[#D72638]" : ""}`} />
            <span className="text-[8px] font-race uppercase tracking-wider mt-0.5">Standings</span>
          </button>

          {/* Tab 2: Schedule */}
          <button 
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
              activeTab === "schedule" 
                ? "bg-gradient-to-b from-[#D72638]/30 to-[#98111E]/50 text-white font-extrabold shadow-inner border border-[#D72638]/40" 
                : "text-white/45 hover:text-white/80"
            }`}
          >
            <Calendar className={`w-4 h-4 transition-transform ${activeTab === "schedule" ? "scale-110 text-[#D72638]" : ""}`} />
            <span className="text-[8px] font-race uppercase tracking-wider mt-0.5">Schedule</span>
          </button>

          {/* HERO ACTION BUTTON (Center Floating Button if tournament active) */}
          {activeChampionship?.status === "in_progress" && (
            <button
              onClick={() => setIsLoggerOpen(true)}
              className="flex-none -translate-y-4 bg-gradient-to-tr from-[#98111E] via-[#D72638] to-[#FF4D5E] text-white p-3.5 rounded-full shadow-[0_8px_25px_rgba(215,38,56,0.6)] border-2 border-[#FBE4E3]/40 active:scale-90 transition-all duration-200 flex items-center justify-center group cursor-pointer"
              title="Record Duel Telemetries"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          )}

          {/* Tab 3: Drivers */}
          <button 
            onClick={() => setActiveTab("drivers")}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
              activeTab === "drivers" 
                ? "bg-gradient-to-b from-[#D72638]/30 to-[#98111E]/50 text-white font-extrabold shadow-inner border border-[#D72638]/40" 
                : "text-white/45 hover:text-white/80"
            }`}
          >
            <Users className={`w-4 h-4 transition-transform ${activeTab === "drivers" ? "scale-110 text-[#D72638]" : ""}`} />
            <span className="text-[8px] font-race uppercase tracking-wider mt-0.5">Drivers</span>
          </button>

          {/* Tab 4: History */}
          <button 
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
              activeTab === "history" 
                ? "bg-gradient-to-b from-[#D72638]/30 to-[#98111E]/50 text-white font-extrabold shadow-inner border border-[#D72638]/40" 
                : "text-white/45 hover:text-white/80"
            }`}
          >
            <History className={`w-4 h-4 transition-transform ${activeTab === "history" ? "scale-110 text-[#D72638]" : ""}`} />
            <span className="text-[8px] font-race uppercase tracking-wider mt-0.5">History</span>
          </button>

        </div>
      </nav>

      {/* Modals & Slide-ups */}
      <DuelLogger
        drivers={drivers}
        tracks={tracks}
        matches={matches}
        isOpen={isLoggerOpen}
        onClose={() => {
          setIsLoggerOpen(false);
          setLoggerInitialMatchId("");
        }}
        onSuccess={handleLogSuccess}
        apiUrl={API_URL}
        activeChampionshipId={activeChampId}
        initialMatchId={loggerInitialMatchId}
      />

      <DriverProfileCard
        driverId={selectedProfileId}
        isOpen={!!selectedProfileId}
        onClose={() => setSelectedProfileId("")}
        apiUrl={API_URL}
        matches={matches}
      />

      <DriverCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        drivers={drivers}
        apiUrl={API_URL}
      />

      <GroupDrawReveal
        isOpen={isDrawRevealOpen}
        onClose={() => setIsDrawRevealOpen(false)}
        assignments={drawRevealAssignments}
        drivers={drivers}
      />

      <ModalAlert
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        message={alertMsg}
        type={alertType}
      />

      <CreateChampionshipModal
        isOpen={isCreateChampOpen}
        onClose={() => setIsCreateChampOpen(false)}
        apiUrl={API_URL}
        onSuccess={(newId) => {
          setActiveChampId(newId);
          triggerAlert("New championship started successfully! You can now register drivers.", "success");
        }}
      />
    </div>
  );
}
