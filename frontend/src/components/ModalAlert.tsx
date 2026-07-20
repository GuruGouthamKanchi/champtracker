"use client";

import { X, CheckCircle2, AlertCircle, Bell } from "lucide-react";

interface ModalAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: "success" | "error" | "info";
}

export default function ModalAlert({ isOpen, onClose, title, message, type = "info" }: ModalAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm select-none">
      <div className="bg-[#2C0509] border border-[#98111E]/40 rounded-2xl p-4 w-full max-w-[280px] shadow-2xl flex flex-col gap-3">
        
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[#98111E]/10 pb-2">
          {type === "success" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {type === "error" && <AlertCircle className="w-4 h-4 text-[#D72638]" />}
          {type === "info" && <Bell className="w-4 h-4 text-indigo-400" />}
          <span className="font-race text-[9px] font-black uppercase tracking-widest text-[#FBE4E3]">
            {title || (type === "success" ? "SUCCESS" : type === "error" ? "ALERT" : "INFO")}
          </span>
        </div>

        {/* Message */}
        <p className="text-[10px] font-sans text-white/80 leading-normal py-1">
          {message}
        </p>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full bg-[#3F0D12] hover:bg-[#98111E] text-white border border-[#98111E]/30 font-race font-bold uppercase text-[7.5px] py-2 rounded-lg transition-all active:scale-[0.97]"
        >
          Acknowledge
        </button>

      </div>
    </div>
  );
}
