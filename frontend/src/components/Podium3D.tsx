"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface PodiumDriver {
  name: string;
  team_name: string;
  color: string;
}

interface Podium3DProps {
  first?: PodiumDriver;
  second?: PodiumDriver;
  third?: PodiumDriver;
}

export default function Podium3D({ first, second, third }: Podium3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Atmosphere Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a0305, 0.08); // Dark luxury atmosphere fog

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 6.2);
    camera.lookAt(0, 1.1, 0);

    // 3. WebGL Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 4. Lighting System (F1 Night Race / Podium Ceremony Stage Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Main Stage Key Light
    const mainLight = new THREE.DirectionalLight(0xfffaed, 1.8);
    mainLight.position.set(4, 9, 6);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    // Blue/Red Rim Lights for F1 Tech aesthetic
    const rimLight1 = new THREE.DirectionalLight(0xd72638, 1.5);
    rimLight1.position.set(-6, 3, -4);
    scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(0x1e41ff, 1.0);
    rimLight2.position.set(6, 3, -4);
    scene.add(rimLight2);

    // Champion Golden Spotlight
    const goldSpotlight = new THREE.SpotLight(0xffd700, 6, 8, Math.PI / 5, 0.4, 1);
    goldSpotlight.position.set(0, 6, 0.5);
    goldSpotlight.target.position.set(0, 1.2, 0);
    goldSpotlight.castShadow = true;
    scene.add(goldSpotlight);
    scene.add(goldSpotlight.target);

    // Silver Spotlight P2
    const silverSpotlight = new THREE.SpotLight(0xe0e0e0, 3, 7, Math.PI / 6, 0.5, 1);
    silverSpotlight.position.set(-1.6, 5, 0.5);
    silverSpotlight.target.position.set(-1.6, 0.8, 0);
    scene.add(silverSpotlight);
    scene.add(silverSpotlight.target);

    // Bronze Spotlight P3
    const bronzeSpotlight = new THREE.SpotLight(0xcd7f32, 3, 7, Math.PI / 6, 0.5, 1);
    bronzeSpotlight.position.set(1.6, 5, 0.5);
    bronzeSpotlight.target.position.set(1.6, 0.6, 0);
    scene.add(bronzeSpotlight);
    scene.add(bronzeSpotlight.target);

    // Helper: Canvas Texture Generator for Rank Numbers ("1", "2", "3")
    const createRankTexture = (rankStr: string, colorHexStr: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#110204";
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = colorHexStr;
        ctx.lineWidth = 12;
        ctx.strokeRect(10, 10, 236, 236);

        ctx.font = "black 140px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = colorHexStr;
        ctx.fillText(rankStr, 128, 128);
      }
      return new THREE.CanvasTexture(canvas);
    };

    // 5. Create F1 Podium Pedestals
    const createF1Pedestal = (x: number, width: number, heightVal: number, depth: number, mainColorHex: number, rankStr: string, rankColorStr: string) => {
      const group = new THREE.Group();

      // Main Block
      const geo = new THREE.BoxGeometry(width, heightVal, depth);
      const rankTex = createRankTexture(rankStr, rankColorStr);
      
      const matDark = new THREE.MeshStandardMaterial({
        color: 0x161616,
        roughness: 0.3,
        metalness: 0.8,
      });

      const matFront = new THREE.MeshStandardMaterial({
        map: rankTex,
        roughness: 0.2,
        metalness: 0.7,
      });

      // Materials array: Right, Left, Top, Bottom, Front, Back
      const materials = [matDark, matDark, matDark, matDark, matFront, matDark];
      const mesh = new THREE.Mesh(geo, materials);
      mesh.position.set(0, heightVal / 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Top Trim Metallic Bezel
      const bezelGeo = new THREE.BoxGeometry(width + 0.04, 0.04, depth + 0.04);
      const bezelMat = new THREE.MeshStandardMaterial({
        color: mainColorHex,
        metalness: 0.95,
        roughness: 0.1,
      });
      const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
      bezelMesh.position.set(0, heightVal, 0);
      group.add(bezelMesh);

      // Underglow Neon Strip
      const neonGeo = new THREE.BoxGeometry(width + 0.02, 0.03, depth + 0.02);
      const neonMat = new THREE.MeshBasicMaterial({
        color: mainColorHex,
      });
      const neonMesh = new THREE.Mesh(neonGeo, neonMat);
      neonMesh.position.set(0, 0.015, 0);
      group.add(neonMesh);

      group.position.set(x, 0, 0);
      scene.add(group);
      return group;
    };

    // Create 3 Tiered Steps (P2 Left, P1 Center, P3 Right)
    createF1Pedestal(-1.6, 1.1, 0.75, 1.1, 0xc0c0c0, "2", "#C0C0C0"); // P2 Silver
    createF1Pedestal(0, 1.25, 1.15, 1.2, 0xffd700, "1", "#FFD700");   // P1 Gold
    createF1Pedestal(1.6, 1.1, 0.5, 1.1, 0xcd7f32, "3", "#CD7F32");  // P3 Bronze

    // 6. Create Authentic F1 Grand Prix Trophy Models
    const createF1Trophy = (goldHex: number, heightScale: number = 1.0) => {
      const trophyGroup = new THREE.Group();

      const metalMat = new THREE.MeshStandardMaterial({
        color: goldHex,
        metalness: 0.95,
        roughness: 0.15,
        envMapIntensity: 1.5,
      });

      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.4,
        metalness: 0.6,
      });

      // Octagonal Base
      const baseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.1, 8);
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.05;
      trophyGroup.add(baseMesh);

      // Stem
      const stemGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.15, 16);
      const stemMesh = new THREE.Mesh(stemGeo, metalMat);
      stemMesh.position.y = 0.175;
      trophyGroup.add(stemMesh);

      // Main Cup Bowl Body
      const cupGeo = new THREE.CylinderGeometry(0.2, 0.08, 0.35, 24);
      const cupMesh = new THREE.Mesh(cupGeo, metalMat);
      cupMesh.position.y = 0.425;
      trophyGroup.add(cupMesh);

      // Crown / Crest Top Lid
      const lidGeo = new THREE.ConeGeometry(0.18, 0.15, 16);
      const lidMesh = new THREE.Mesh(lidGeo, metalMat);
      lidMesh.position.y = 0.675;
      trophyGroup.add(lidMesh);

      // Handles (Left & Right Curved Tori)
      const handleGeo = new THREE.TorusGeometry(0.12, 0.025, 12, 24, Math.PI * 0.9);
      
      const handleLeft = new THREE.Mesh(handleGeo, metalMat);
      handleLeft.rotation.z = Math.PI / 2;
      handleLeft.position.set(-0.2, 0.425, 0);
      trophyGroup.add(handleLeft);

      const handleRight = new THREE.Mesh(handleGeo, metalMat);
      handleRight.rotation.z = -Math.PI / 2;
      handleRight.position.set(0.2, 0.425, 0);
      trophyGroup.add(handleRight);

      trophyGroup.scale.set(heightScale, heightScale, heightScale);
      scene.add(trophyGroup);
      return trophyGroup;
    };

    // Render Trophies on Pedestals
    const p1Trophy = createF1Trophy(0xffd700, 1.1); // P1 Gold Cup
    p1Trophy.position.set(0, 1.2, 0);

    const p2Trophy = createF1Trophy(0xe0e0e0, 0.9); // P2 Silver Cup
    p2Trophy.position.set(-1.6, 0.8, 0);

    const p3Trophy = createF1Trophy(0xcd7f32, 0.8); // P3 Bronze Cup
    p3Trophy.position.set(1.6, 0.55, 0);

    // 7. Checkered Stage Floor Grid
    const stageFloorGeo = new THREE.PlaneGeometry(12, 6);
    const stageFloorMat = new THREE.MeshStandardMaterial({
      color: 0x220508,
      roughness: 0.4,
      metalness: 0.5,
    });
    const stageFloor = new THREE.Mesh(stageFloorGeo, stageFloorMat);
    stageFloor.rotation.x = -Math.PI / 2;
    stageFloor.receiveShadow = true;
    scene.add(stageFloor);

    // Grid Helper overlay
    const gridHelper = new THREE.GridHelper(10, 20, 0xd72638, 0x4a0a10);
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);

    // 8. F1 Particle Systems (Champagne Spray & Metallic Confetti)
    
    // Champagne Spray Particles
    const sprayCount = 120;
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPositions = new Float32Array(sprayCount * 3);
    const sprayVelocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < sprayCount; i++) {
      sprayPositions[i * 3] = 0;
      sprayPositions[i * 3 + 1] = 1.25;
      sprayPositions[i * 3 + 2] = 0;

      sprayVelocities.push({
        x: (Math.random() - 0.5) * 0.08,
        y: 0.06 + Math.random() * 0.07,
        z: (Math.random() - 0.5) * 0.08,
      });
    }

    sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPositions, 3));
    const sprayMat = new THREE.PointsMaterial({
      color: 0xfff4d0,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const sprayParticles = new THREE.Points(sprayGeo, sprayMat);
    scene.add(sprayParticles);

    // Confetti Particles
    const confettiCount = 100;
    const confettiGeo = new THREE.BufferGeometry();
    const confettiPositions = new Float32Array(confettiCount * 3);
    const confettiColors = new Float32Array(confettiCount * 3);
    const confettiSpeeds: number[] = [];

    const palette = [
      new THREE.Color(0xffd700), // Gold
      new THREE.Color(0xd72638), // Crimson
      new THREE.Color(0xffffff), // White
      new THREE.Color(0xc0c0c0), // Silver
    ];

    for (let i = 0; i < confettiCount; i++) {
      confettiPositions[i * 3] = (Math.random() - 0.5) * 6;
      confettiPositions[i * 3 + 1] = 2.5 + Math.random() * 3;
      confettiPositions[i * 3 + 2] = (Math.random() - 0.5) * 4;

      const col = palette[Math.floor(Math.random() * palette.length)];
      confettiColors[i * 3] = col.r;
      confettiColors[i * 3 + 1] = col.g;
      confettiColors[i * 3 + 2] = col.b;

      confettiSpeeds.push(0.01 + Math.random() * 0.02);
    }

    confettiGeo.setAttribute("position", new THREE.BufferAttribute(confettiPositions, 3));
    confettiGeo.setAttribute("color", new THREE.BufferAttribute(confettiColors, 3));

    const confettiMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const confettiParticles = new THREE.Points(confettiGeo, confettiMat);
    scene.add(confettiParticles);

    // 9. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Rotate Trophies gently
      if (p1Trophy) p1Trophy.rotation.y = elapsedTime * 0.8;
      if (p2Trophy) p2Trophy.rotation.y = -elapsedTime * 0.6;
      if (p3Trophy) p3Trophy.rotation.y = elapsedTime * 0.7;

      // Animate Champagne Spray Particles
      const sprayPosAttr = sprayGeo.attributes.position as THREE.BufferAttribute;
      const sprayArray = sprayPosAttr.array as Float32Array;

      for (let i = 0; i < sprayCount; i++) {
        sprayArray[i * 3] += sprayVelocities[i].x;
        sprayArray[i * 3 + 1] += sprayVelocities[i].y;
        sprayArray[i * 3 + 2] += sprayVelocities[i].z;

        // Apply gravity
        sprayVelocities[i].y -= 0.0018;

        // Reset particle if it hits the ground or fades
        if (sprayArray[i * 3 + 1] <= 0.0) {
          sprayArray[i * 3] = 0;
          sprayArray[i * 3 + 1] = 1.25;
          sprayArray[i * 3 + 2] = 0;
          sprayVelocities[i].x = (Math.random() - 0.5) * 0.08;
          sprayVelocities[i].y = 0.06 + Math.random() * 0.07;
          sprayVelocities[i].z = (Math.random() - 0.5) * 0.08;
        }
      }
      sprayPosAttr.needsUpdate = true;

      // Animate Confetti Fluttering Down
      const confettiPosAttr = confettiGeo.attributes.position as THREE.BufferAttribute;
      const confettiArray = confettiPosAttr.array as Float32Array;

      for (let i = 0; i < confettiCount; i++) {
        confettiArray[i * 3 + 1] -= confettiSpeeds[i];
        confettiArray[i * 3] += Math.sin(elapsedTime * 3 + i) * 0.005;

        // Loop confetti back to top
        if (confettiArray[i * 3 + 1] < 0) {
          confettiArray[i * 3 + 1] = 5.0;
          confettiArray[i * 3] = (Math.random() - 0.5) * 6;
        }
      }
      confettiPosAttr.needsUpdate = true;

      // Subtle dynamic camera orbit
      camera.position.x = Math.sin(elapsedTime * 0.25) * 0.7;
      camera.lookAt(0, 0.9, 0);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 10. Handle Window Resizing
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [first, second, third]);

  return (
    <div className="relative w-full h-[230px] bg-gradient-to-b from-[#180305] via-[#2A0508] to-[#3F0D12] overflow-hidden rounded-b-2xl border-b border-[#98111E]/40 shadow-2xl">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* F1 Driver Information Overlay Cards */}
      <div className="absolute inset-0 flex justify-between px-3 pointer-events-none select-none z-10">
        
        {/* P2 (Silver / 2nd Place - Left) */}
        <div className="w-[31%] flex flex-col justify-end items-center pb-2 text-center">
          <div className="bg-[#1C1C1C]/85 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-300/40 shadow-xl translate-y-[-8px] transition-all">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="text-[7.5px] font-race text-slate-300 font-extrabold uppercase tracking-wider bg-slate-400/20 px-1 py-0.5 rounded border border-slate-400/30">
                🥈 P2
              </span>
            </div>
            <span className="block text-[11px] font-race font-black text-white truncate max-w-[90px]" style={{ color: second?.color || "#e0e0e0" }}>
              {second?.name ? second.name.split(' ')[0] : "VACANT"}
            </span>
            <span className="block text-[7px] font-race text-slate-300/70 truncate max-w-[90px] uppercase tracking-tighter">
              {second?.team_name || "Independent"}
            </span>
          </div>
        </div>

        {/* P1 (Gold Champion / 1st Place - Center) */}
        <div className="w-[35%] flex flex-col justify-end items-center pb-4 text-center">
          <div className="bg-gradient-to-b from-[#3F0D12]/95 to-[#2C0509]/95 backdrop-blur-md px-2.5 py-2 rounded-2xl border-2 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.35)] translate-y-[-16px] transition-all scale-105">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="text-[8px] font-race text-[#FFD700] font-black uppercase tracking-widest bg-[#FFD700]/20 px-1.5 py-0.5 rounded-md border border-[#FFD700]/40 flex items-center gap-0.5">
                🏆 CHAMPION
              </span>
            </div>
            <span className="block text-[13px] font-race font-black text-white truncate max-w-[105px] glow-text-crimson drop-shadow-md" style={{ color: first?.color || "#ffffff" }}>
              {first?.name ? first.name.split(' ')[0] : "VACANT"}
            </span>
            <span className="block text-[7.5px] font-race text-[#FBE4E3]/80 truncate max-w-[105px] uppercase tracking-tight font-bold">
              {first?.team_name || "Independent"}
            </span>
          </div>
        </div>

        {/* P3 (Bronze / 3rd Place - Right) */}
        <div className="w-[31%] flex flex-col justify-end items-center pb-2 text-center">
          <div className="bg-[#1C1C1C]/85 backdrop-blur-md px-2 py-1.5 rounded-xl border border-amber-700/40 shadow-xl translate-y-[-4px] transition-all">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="text-[7.5px] font-race text-amber-500 font-extrabold uppercase tracking-wider bg-amber-600/20 px-1 py-0.5 rounded border border-amber-600/30">
                🥉 P3
              </span>
            </div>
            <span className="block text-[11px] font-race font-black text-white truncate max-w-[90px]" style={{ color: third?.color || "#cd7f32" }}>
              {third?.name ? third.name.split(' ')[0] : "VACANT"}
            </span>
            <span className="block text-[7px] font-race text-amber-500/70 truncate max-w-[90px] uppercase tracking-tighter">
              {third?.team_name || "Independent"}
            </span>
          </div>
        </div>

      </div>

      {/* F1 Finish Line Checkered Watermark Accent */}
      <div className="absolute top-2.5 right-3 flex flex-col gap-1 items-end opacity-30 pointer-events-none select-none">
        <div className="h-[2.5px] w-7 bg-gradient-to-r from-transparent to-[#FFD700]"></div>
        <div className="h-[2.5px] w-14 bg-gradient-to-r from-transparent to-[#D72638]"></div>
        <div className="h-[2.5px] w-9 bg-gradient-to-r from-transparent to-[#FFD700]"></div>
      </div>
    </div>
  );
}
