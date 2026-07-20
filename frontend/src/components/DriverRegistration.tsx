"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus, Trophy, Sparkles } from "lucide-react";
import ModalAlert from "./ModalAlert";

interface Driver {
  driver_id: string;
  name: string;
  avatar_color: string;
}

interface Registration {
  championship_id: string;
  driver_id: string;
}

interface DriverRegistrationProps {
  championshipId: string;
  drivers: Driver[];
  registrations: Registration[];
  apiUrl: string;
}

export default function DriverRegistration({ championshipId, drivers, registrations, apiUrl }: DriverRegistrationProps) {
  const queryClient = useQueryClient();
  
  // Registration Form
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Driver Form
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [newDriverId, setNewDriverId] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverColor, setNewDriverColor] = useState("#D72638");

  // Alert modal states
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "info">("info");

  const triggerAlert = (msg: string, type: "success" | "error" | "info" = "info") => {
    setAlertMsg(msg);
    setAlertType(type);
    setAlertOpen(true);
  };

  // Filter out drivers already registered for this championship
  const registeredDriverIds = registrations
    .filter(r => r.championship_id === championshipId)
    .map(r => r.driver_id);
    
  const availableDrivers = drivers.filter(d => !registeredDriverIds.includes(d.driver_id));

  // Mutations
  const registerMutation = useMutation({
    mutationFn: async (payload: { championship_id: string; driver_id: string; team_name_for_gp: string; registered_at: string }) => {
      const res = await fetch(`${apiUrl}/api/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        let errMsg = "Failed to register driver.";
        if (typeof err.detail === "string") {
          errMsg = err.detail;
        } else if (Array.isArray(err.detail)) {
          errMsg = err.detail.map((d: any) => `${d.loc.join(".")}: ${d.msg}`).join(", ");
        }
        throw new Error(errMsg);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      queryClient.invalidateQueries({ queryKey: ["standings"] });
      setSuccess("Driver registered successfully!");
      setSelectedDriverId("");
      setTeamName("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: any) => {
      setError(err.message);
      setTimeout(() => setError(""), 4000);
    }
  });

  const createDriverMutation = useMutation({
    mutationFn: async (payload: { driver_id: string; name: string; avatar_color: string; first_registered: string; total_championships_won: number; career_race_wins: number }) => {
      const res = await fetch(`${apiUrl}/api/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        let errMsg = "Failed to create driver profile.";
        if (typeof err.detail === "string") {
          errMsg = err.detail;
        } else if (Array.isArray(err.detail)) {
          errMsg = err.detail.map((d: any) => `${d.loc.join(".")}: ${d.msg}`).join(", ");
        }
        throw new Error(errMsg);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setNewDriverId("");
      setNewDriverName("");
      setShowCreateDriver(false);
      triggerAlert("New esports driver profile created successfully!", "success");
    },
    onError: (err: any) => {
      triggerAlert(err.message, "error");
    }
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) return;
    registerMutation.mutate({
      championship_id: championshipId,
      driver_id: selectedDriverId,
      team_name_for_gp: teamName || "Independent",
      registered_at: new Date().toISOString()
    });
  };

  const handleCreateDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverId || !newDriverName) return;
    createDriverMutation.mutate({
      driver_id: newDriverId.toLowerCase().trim(),
      name: newDriverName.trim(),
      avatar_color: newDriverColor,
      first_registered: new Date().toISOString(),
      total_championships_won: 0,
      career_race_wins: 0
    });
  };

  return (
    <div className="mx-4 mt-3 bg-gradient-to-b from-[#2C0509] to-[#3F0D12] rounded-xl border border-[#98111E]/20 p-3.5 shadow-md flex flex-col gap-3">
      <div className="flex items-center justify-between pb-1 border-b border-[#98111E]/15">
        <span className="text-[7.5px] font-race text-[#D72638] uppercase font-bold tracking-widest flex items-center gap-1">
          <Trophy className="w-3 h-3 text-amber-500" /> Driver Registration
        </span>
        <button
          onClick={() => setShowCreateDriver(!showCreateDriver)}
          className="text-[6.5px] font-race text-white/50 hover:text-white uppercase flex items-center gap-0.5 border border-[#98111E]/30 rounded px-1.5 py-0.5"
        >
          <UserPlus className="w-2.5 h-2.5" /> {showCreateDriver ? "Join Form" : "Create Profile"}
        </button>
      </div>

      {error && <div className="text-[7.5px] text-red-500 font-race font-bold">⚠️ {error}</div>}
      {success && <div className="text-[7.5px] text-green-500 font-race font-bold">✨ {success}</div>}

      {showCreateDriver ? (
        /* Create Driver Form */
        <form onSubmit={handleCreateDriverSubmit} className="flex flex-col gap-2.5">
          <span className="text-[6.5px] font-race uppercase text-white/40">Create New Esports Racer Profile</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Racer ID (e.g. max_v)"
              value={newDriverId}
              onChange={(e) => setNewDriverId(e.target.value)}
              className="bg-[#2C0509] text-[9.5px] font-race border border-[#98111E]/20 rounded p-1.5 text-white placeholder-white/30"
              required
            />
            <input
              type="text"
              placeholder="Full Name (e.g. Max V)"
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
              className="bg-[#2C0509] text-[9.5px] font-race border border-[#98111E]/20 rounded p-1.5 text-white placeholder-white/30"
              required
            />
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[7px] font-race text-[#FBE4E3]/40 uppercase">Avatar Color:</span>
            <div className="flex items-center gap-1.5">
              {["#D72638", "#2563EB", "#059669", "#D97706", "#7C3AED", "#EC4899"].map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setNewDriverColor(color)}
                  className={`w-4.5 h-4.5 rounded-full border transition-all ${newDriverColor === color ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={createDriverMutation.isPending}
            className="w-full bg-[#98111E] text-white font-race font-bold uppercase text-[7.5px] py-2 rounded transition-all"
          >
            Create Esports Profile
          </button>
        </form>
      ) : (
        /* Driver Registration Form */
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="bg-[#2C0509] text-[9.5px] font-race font-bold border border-[#98111E]/20 rounded p-1.5 text-white cursor-pointer"
              required
            >
              <option value="" className="text-white/40">Select Driver...</option>
              {availableDrivers.map((d) => (
                <option key={d.driver_id} value={d.driver_id}>
                  🏎️ {d.name} ({d.driver_id})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Team Name (e.g. Red Bull)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="bg-[#2C0509] text-[9.5px] font-race border border-[#98111E]/20 rounded p-1.5 text-white placeholder-white/30"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedDriverId || registerMutation.isPending}
            className="w-full bg-gradient-to-r from-[#98111E] to-[#D72638] text-white font-race font-extrabold uppercase text-[7.5px] py-2 rounded flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-3 h-3" /> Register to Championship
          </button>
        </form>
      )}

      <ModalAlert
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        message={alertMsg}
        type={alertType}
      />
    </div>
  );
}
