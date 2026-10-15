import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { 
  Rotate3d, 
  Eye, 
  Maximize2, 
  Sparkles, 
  TrendingUp, 
  Target, 
  Activity, 
  Layers, 
  HelpCircle 
} from 'lucide-react';
import { formatTWD } from '../utils/calculations';

interface Dynamic3DChartProps {
  targetAnnualDividend: number;
  currentShares: number;
  currentPrice: number;
  currentDivPerShare: number;
  monthlyCapital: number;
  reinvestRatioPct: number;
  taxRatePct: number;
}

export const Dynamic3DChart: React.FC<Dynamic3DChartProps> = ({
  targetAnnualDividend,
  currentShares,
  currentPrice,
  currentDivPerShare,
  monthlyCapital,
  reinvestRatioPct,
  taxRatePct,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'yield' | 'cashflow' | 'compound'>('cashflow');
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{
    xLabel: string;
    yLabel: string;
    zLabel: string;
  } | null>(null);

  // References for three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mouse orbit interaction state
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.45, y: -0.65 });
  const zoomRef = useRef(38);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const width = container.clientWidth || 700;
    const height = 440;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(0, 15, zoomRef.current);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x10b981, 1.8);
    dirLight1.position.set(20, 40, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 1.2);
    dirLight2.position.set(-20, -10, -20);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x34d399, 2, 50);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // 3. Central group for rotation
    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    // Initial orientation
    group.rotation.x = rotationRef.current.x;
    group.rotation.y = rotationRef.current.y;

    // 4. Resize listener
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener('resize', handleResize);

    // 5. Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (isAutoRotating && !isDraggingRef.current && groupRef.current) {
        groupRef.current.rotation.y += 0.0035;
        rotationRef.current.y = groupRef.current.rotation.y;
      }

      if (cameraRef.current) {
        cameraRef.current.position.set(
          0,
          16,
          zoomRef.current
        );
        cameraRef.current.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Update 3D Geometry and Curves when parameters or viewMode change
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear previous elements in group
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    }

    // --- Grid Base (Floor) ---
    const gridHelper = new THREE.GridHelper(26, 20, 0x10b981, 0x1e293b);
    gridHelper.position.y = -7;
    group.add(gridHelper);

    // --- Coordinates & Axis Helpers ---
    // X-axis: Stock Price (10 ~ 20 TWD) -> mapped to -10 to +10 in 3D
    // Z-axis: Dividend per Share (0.50 ~ 2.00 TWD) -> mapped to -10 to +10 in 3D
    // Y-axis: Dependent value (Height) -> mapped to -6 to +8 in 3D

    const priceMin = 11.0;
    const priceMax = 20.0;
    const divMin = 0.50;
    const divMax = 1.80;

    const mapX = (price: number) => ((price - priceMin) / (priceMax - priceMin)) * 20 - 10;
    const mapZ = (div: number) => ((div - divMin) / (divMax - divMin)) * 20 - 10;

    if (viewMode === 'cashflow' || viewMode === 'yield') {
      // Build 3D Parametric Mesh & Iso-curves
      const xSegments = 28;
      const zSegments = 28;

      const geometry = new THREE.PlaneGeometry(20, 20, xSegments, zSegments);
      geometry.rotateX(-Math.PI / 2);

      const pos = geometry.attributes.position;
      const colors: number[] = [];

      let maxVal = 1;
      if (viewMode === 'cashflow') {
        maxVal = currentShares * divMax; // max gross annual dividend
      } else {
        maxVal = (divMax / priceMin) * 100; // max yield %
      }

      for (let i = 0; i < pos.count; i++) {
        const x3d = pos.getX(i);
        const z3d = pos.getZ(i);

        // Normalized back to real financial parameters
        const p = priceMin + ((x3d + 10) / 20) * (priceMax - priceMin);
        const d = divMin + ((z3d + 10) / 20) * (divMax - divMin);

        let val = 0;
        let y3d = -7;

        if (viewMode === 'cashflow') {
          val = currentShares * d * (1 - taxRatePct / 100);
          // Map to height: 0 to 800,000 TWD mapped to -7 to +7
          y3d = -7 + (val / 750000) * 14;
        } else {
          val = p > 0 ? (d / p) * 100 : 0;
          // Map to height: 3% to 12% mapped to -7 to +7
          y3d = -7 + ((val - 3) / 10) * 14;
        }

        pos.setY(i, Math.min(8.5, Math.max(-7.5, y3d)));

        // Color gradient along height
        const norm = Math.min(1, Math.max(0, (y3d + 7) / 14));
        const color = new THREE.Color();
        if (viewMode === 'cashflow') {
          // If above target, radiant emerald/gold; if below, teal/cyan
          if (val >= targetAnnualDividend) {
            color.setHSL(0.38 + norm * 0.08, 0.95, 0.55);
          } else {
            color.setHSL(0.5 + norm * 0.15, 0.85, 0.45);
          }
        } else {
          color.setHSL(0.48 - norm * 0.35, 0.9, 0.5); // cyan to emerald to gold
        }

        colors.push(color.r, color.g, color.b);
      }

      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      // Translucent illuminated surface
      const surfaceMat = new THREE.MeshPhongMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        wireframe: false,
        side: THREE.DoubleSide,
        shininess: 90,
      });

      const surfaceMesh = new THREE.Mesh(geometry, surfaceMat);
      group.add(surfaceMesh);

      // Glowing Iso-Contour Grid Lines overlay (wireframe curves)
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const wireMesh = new THREE.Mesh(geometry, wireframeMat);
      group.add(wireMesh);

      // Longitudinal & Latitudinal Ribbons/Curves (Highlighted Contours)
      for (let d = divMin; d <= divMax; d += 0.25) {
        const curvePoints: THREE.Vector3[] = [];
        for (let p = priceMin; p <= priceMax; p += 0.2) {
          const x3d = mapX(p);
          const z3d = mapZ(d);
          let val = 0;
          if (viewMode === 'cashflow') {
            val = currentShares * d * (1 - taxRatePct / 100);
            curvePoints.push(new THREE.Vector3(x3d, -7 + (val / 750000) * 14 + 0.05, z3d));
          } else {
            val = (d / p) * 100;
            curvePoints.push(new THREE.Vector3(x3d, -7 + ((val - 3) / 10) * 14 + 0.05, z3d));
          }
        }
        const curveGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const curveMat = new THREE.LineBasicMaterial({
          color: 0x5eead4,
          linewidth: 2,
          transparent: true,
          opacity: 0.85,
        });
        const line = new THREE.Line(curveGeom, curveMat);
        group.add(line);
      }

      // If Cashflow mode, add Target Threshold Plane (500,000 TWD horizontal plane)
      if (viewMode === 'cashflow') {
        const targetY = -7 + (targetAnnualDividend / 750000) * 14;
        const targetPlaneGeom = new THREE.PlaneGeometry(21, 21);
        targetPlaneGeom.rotateX(-Math.PI / 2);
        const targetPlaneMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
        });
        const targetPlaneMesh = new THREE.Mesh(targetPlaneGeom, targetPlaneMat);
        targetPlaneMesh.position.y = targetY;
        group.add(targetPlaneMesh);

        // Target Plane Border Box
        const edges = new THREE.EdgesGeometry(targetPlaneGeom);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 });
        const targetBorder = new THREE.LineSegments(edges, lineMat);
        targetBorder.position.y = targetY;
        group.add(targetBorder);
      }

      // Current Operating Point Marker (Glowing 3D Sphere & Drop Pin)
      const curX = mapX(currentPrice);
      const curZ = mapZ(currentDivPerShare);
      let curVal = 0;
      let curY = -7;
      if (viewMode === 'cashflow') {
        curVal = currentShares * currentDivPerShare * (1 - taxRatePct / 100);
        curY = -7 + (curVal / 750000) * 14;
      } else {
        curVal = (currentDivPerShare / currentPrice) * 100;
        curY = -7 + ((curVal - 3) / 10) * 14;
      }

      // Marker sphere
      const sphereGeom = new THREE.SphereGeometry(0.55, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        roughness: 0.2,
        metalness: 0.8,
      });
      const markerSphere = new THREE.Mesh(sphereGeom, sphereMat);
      markerSphere.position.set(curX, curY, curZ);
      group.add(markerSphere);

      // Marker Ring (Pulsing Halo)
      const ringGeom = new THREE.RingGeometry(0.7, 1.0, 32);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.set(curX, curY + 0.1, curZ);
      group.add(ringMesh);

      // Drop Line to floor
      const dropLineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(curX, -7, curZ),
        new THREE.Vector3(curX, curY, curZ),
      ]);
      const dropLineMat = new THREE.LineDashedMaterial({
        color: 0xfbbf24,
        dashSize: 0.4,
        gapSize: 0.2,
      });
      const dropLine = new THREE.Line(dropLineGeom, dropLineMat);
      dropLine.computeLineDistances();
      group.add(dropLine);

      // Floor Shadow Target Ring
      const floorRingGeom = new THREE.RingGeometry(0.3, 0.6, 24);
      floorRingGeom.rotateX(-Math.PI / 2);
      const floorRingMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });
      const floorRing = new THREE.Mesh(floorRingGeom, floorRingMat);
      floorRing.position.set(curX, -6.95, curZ);
      group.add(floorRing);

    } else if (viewMode === 'compound') {
      // 10-Year 3D Compounding Trajectory Spiral & Ribbons
      // X: Year (0 to 10) mapped to -10 to +10
      // Z: Total Shares (300k to 900k) mapped to -10 to +10
      // Y: Annual Dividend (300k to 1M) mapped to -7 to +7

      let simShares = currentShares;
      const trajectoryPoints: THREE.Vector3[] = [];
      const basePoints: THREE.Vector3[] = [];

      for (let y = 0; y <= 10; y++) {
        const x3d = -10 + (y / 10) * 20;
        const grossDiv = simShares * currentDivPerShare;
        const netDiv = grossDiv * (1 - taxRatePct / 100);

        // Height (Y)
        const y3d = -7 + (netDiv / 800000) * 14;

        // Depth (Z) - shares
        const z3d = -10 + ((simShares - 300000) / 600000) * 20;

        const pt = new THREE.Vector3(x3d, Math.min(8.5, y3d), Math.min(10, z3d));
        trajectoryPoints.push(pt);
        basePoints.push(new THREE.Vector3(x3d, -7, Math.min(10, z3d)));

        // Spheres at yearly milestones
        const sphereGeom = new THREE.SphereGeometry(0.4, 16, 16);
        const reached = netDiv >= targetAnnualDividend;
        const sphereMat = new THREE.MeshStandardMaterial({
          color: reached ? 0x10b981 : (y === 0 ? 0xf59e0b : 0x06b6d4),
          emissive: reached ? 0x059669 : (y === 0 ? 0xd97706 : 0x0891b2),
        });
        const nodeMesh = new THREE.Mesh(sphereGeom, sphereMat);
        nodeMesh.position.copy(pt);
        group.add(nodeMesh);

        // Next year step
        const annualAddition = monthlyCapital * 12;
        const fromCash = currentPrice > 0 ? annualAddition / currentPrice : 0;
        const fromReinvest = currentPrice > 0 ? (netDiv * (reinvestRatioPct / 100)) / currentPrice : 0;
        simShares += fromCash + fromReinvest;
      }

      // Smooth Curve using CatmullRomCurve3
      const curve = new THREE.CatmullRomCurve3(trajectoryPoints);
      const tubeGeom = new THREE.TubeGeometry(curve, 64, 0.22, 12, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        roughness: 0.3,
        metalness: 0.7,
      });
      const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
      group.add(tubeMesh);

      // Target threshold line in compound mode
      const targetY = -7 + (targetAnnualDividend / 800000) * 14;
      const targetPlaneGeom = new THREE.PlaneGeometry(21, 21);
      targetPlaneGeom.rotateX(-Math.PI / 2);
      const targetPlaneMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      });
      const targetPlane = new THREE.Mesh(targetPlaneGeom, targetPlaneMat);
      targetPlane.position.y = targetY;
      group.add(targetPlane);
    }

  }, [
    viewMode,
    targetAnnualDividend,
    currentShares,
    currentPrice,
    currentDivPerShare,
    monthlyCapital,
    reinvestRatioPct,
    taxRatePct,
  ]);

  // Mouse & Touch Orbit Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !groupRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;

    rotationRef.current.y += deltaX * 0.008;
    rotationRef.current.x += deltaY * 0.008;

    // Limit elevation
    rotationRef.current.x = Math.max(-0.2, Math.min(1.4, rotationRef.current.x));

    groupRef.current.rotation.y = rotationRef.current.y;
    groupRef.current.rotation.x = rotationRef.current.x;

    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    zoomRef.current = Math.max(22, Math.min(60, zoomRef.current + e.deltaY * 0.025));
  };

  const handleResetCamera = () => {
    if (groupRef.current) {
      rotationRef.current = { x: 0.45, y: -0.65 };
      groupRef.current.rotation.x = 0.45;
      groupRef.current.rotation.y = -0.65;
      zoomRef.current = 38;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl relative overflow-hidden">
      {/* Top Header & View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <Rotate3d className="w-3.5 h-3.5" />
            <span>3D 動態立體曲面投影引擎</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>股利目標立體動態曲面圖</span>
            <span className="text-xs font-normal px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
              即時三維立體響應
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            可按住滑鼠左鍵 360° 旋轉視角、滾輪縮放；立體曲線即時隨上方參數動態形變。
          </p>
        </div>

        {/* View mode selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800 flex gap-1">
            <button
              onClick={() => setViewMode('cashflow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cashflow'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>年股利現金流曲面</span>
            </button>

            <button
              onClick={() => setViewMode('yield')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'yield'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>殖利率等高曲面</span>
            </button>

            <button
              onClick={() => setViewMode('compound')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'compound'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>10年複利立體螺旋線</span>
            </button>
          </div>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              isAutoRotating
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="開關自動旋轉"
          >
            <span>旋轉</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isAutoRotating ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>

          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="重設視角"
          >
            <Rotate3d className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 border border-slate-800/90 overflow-hidden select-none">
        <div
          ref={mountRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-[440px] cursor-grab active:cursor-grabbing"
        />

        {/* 3D HUD Overlay - Axis & Marker Legend */}
        <div className="absolute top-4 left-4 pointer-events-none bg-slate-950/80 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 text-xs space-y-2 max-w-xs shadow-lg">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400/50" />
            <span>
              {viewMode === 'cashflow'
                ? '股利現金流曲面與 50 萬基準平面'
                : viewMode === 'yield'
                ? '殖利率響應立體曲面'
                : '10 年複利累積成長軌跡'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
            <div>
              <span className="text-slate-500 font-sans">X 軸：</span>
              <span>股價 (11 ~ 20)</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Z 軸：</span>
              <span>{viewMode === 'compound' ? '累積總張數' : '配息 (0.5 ~ 1.8)'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Y 軸高度：</span>
              <span>{viewMode === 'yield' ? '殖利率 %' : '年股利現金流'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-300">黃點：當前配置</span>
            </div>
          </div>
        </div>

        {/* Current Operating Point Floating Card */}
        <div className="absolute bottom-4 right-4 pointer-events-none bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-amber-500/30 text-xs space-y-1 shadow-xl">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>當前點位座標 (Current Node)</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
            <div>股價：<strong className="text-slate-100">{currentPrice.toFixed(2)} TWD</strong></div>
            <div>年配息：<strong className="text-amber-300">{currentDivPerShare.toFixed(2)} TWD/股</strong></div>
            <div>殖利率：<strong className="text-teal-300">{((currentDivPerShare / currentPrice) * 100).toFixed(2)}%</strong></div>
            <div>年實收推估：<strong className="text-emerald-400">{formatTWD(currentShares * currentDivPerShare * (1 - taxRatePct / 100))} TWD</strong></div>
          </div>
        </div>

        {/* Interactive Gesture Hint */}
        <div className="absolute bottom-4 left-4 pointer-events-none text-[11px] text-slate-500 flex items-center gap-1 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
          <span>拖曳旋轉 ｜ 滾輪縮放 ｜ 隨參數動態形變</span>
        </div>
      </div>
    </div>
  );
};
