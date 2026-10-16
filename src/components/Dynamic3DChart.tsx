import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Rotate3d, Target, Activity } from 'lucide-react';
import { formatTWD } from '../utils/calculations';
import { usePrivacy } from '../context/PrivacyContext';
import {
  PlanParams,
  simulatePlan,
  priceRange,
  divRange,
  MAX_YEARS,
  round2,
} from '../utils/dividendPlan';

interface Dynamic3DChartProps {
  params: PlanParams;
  // 曲面的價格／配息範圍以這組中心值決定，避免點選後整張圖跟著位移
  centerPrice: number;
  centerDiv: number;
  onPick: (price: number, divPerShare: number) => void;
}

type ViewMode = 'years' | 'compound';

interface HoverInfo {
  x: number;
  y: number;
  lines: string[];
}

// 3D 座標：X、Z 映射到 -10～10，Y 映射到 -7～7
const SPAN = 20;
const yOfYears = (years: number | null) => -7 + (1 - (years ?? MAX_YEARS) / MAX_YEARS) * 14;

export const Dynamic3DChart: React.FC<Dynamic3DChartProps> = ({ params, centerPrice, centerDiv, onPick }) => {
  const { maskTWD } = usePrivacy();
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('years');
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const surfaceRef = useRef<THREE.Mesh | null>(null);
  const autoRotateRef = useRef(false);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const prevPosRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.5, y: -0.7 });
  const zoomRef = useRef(36);

  const [pMin, pMax] = priceRange(centerPrice);
  const [dMin, dMax] = divRange(centerDiv);
  const mapX = (p: number) => ((p - pMin) / (pMax - pMin)) * SPAN - SPAN / 2;
  const mapZ = (d: number) => ((d - dMin) / (dMax - dMin)) * SPAN - SPAN / 2;
  const unmapX = (x: number) => pMin + ((x + SPAN / 2) / SPAN) * (pMax - pMin);
  const unmapZ = (z: number) => dMin + ((z + SPAN / 2) / SPAN) * (dMax - dMin);

  useEffect(() => {
    autoRotateRef.current = isAutoRotating;
  }, [isAutoRotating]);

  // 場景只建一次
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const width = container.clientWidth || 700;
    const height = 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(15, 30, 20);
    scene.add(light);

    const group = new THREE.Group();
    group.rotation.set(rotationRef.current.x, rotationRef.current.y, 0);
    groupRef.current = group;
    scene.add(group);

    const handleResize = () => {
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (autoRotateRef.current && !draggingRef.current) {
        group.rotation.y += 0.003;
        rotationRef.current.y = group.rotation.y;
      }
      camera.position.set(0, 14, zoomRef.current);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frame);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // 參數或模式改變時重建幾何
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      const obj = group.children[0] as THREE.Mesh;
      group.remove(obj);
      obj.geometry?.dispose();
      const m = obj.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    }
    surfaceRef.current = null;

    const grid = new THREE.GridHelper(SPAN + 2, 20, 0x10b981, 0x1e293b);
    grid.position.y = -7;
    group.add(grid);

    const addMarker = (x: number, y: number, z: number) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706 }),
      );
      sphere.position.set(x, y, z);
      group.add(sphere);
      const drop = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -7, z), new THREE.Vector3(x, y, z)]),
        new THREE.LineDashedMaterial({ color: 0xfbbf24, dashSize: 0.4, gapSize: 0.2 }),
      );
      drop.computeLineDistances();
      group.add(drop);
    };

    if (viewMode === 'years') {
      const seg = 30;
      const geometry = new THREE.PlaneGeometry(SPAN, SPAN, seg, seg);
      geometry.rotateX(-Math.PI / 2);
      const pos = geometry.attributes.position;
      const colors: number[] = [];
      for (let i = 0; i < pos.count; i++) {
        const price = unmapX(pos.getX(i));
        const div = unmapZ(pos.getZ(i));
        const { yearsToTarget } = simulatePlan({ ...params, price, divPerShare: div });
        pos.setY(i, yOfYears(yearsToTarget));
        const c = new THREE.Color();
        if (yearsToTarget === null) c.setHSL(0.0, 0.7, 0.45); // 30 年內無法達標
        else c.setHSL(0.33 * (1 - yearsToTarget / MAX_YEARS), 0.85, 0.5); // 越快越綠
        colors.push(c.r, c.g, c.b);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      const surface = new THREE.Mesh(
        geometry,
        new THREE.MeshPhongMaterial({ vertexColors: true, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
      );
      surfaceRef.current = surface;
      group.add(surface);
      group.add(
        new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.25 }),
        ),
      );

      const cur = simulatePlan(params);
      addMarker(mapX(params.price), yOfYears(cur.yearsToTarget), mapZ(params.divPerShare));
    } else {
      // 複利軌跡：X 年份、Y 年實收、Z 持股張數
      const { trajectory } = simulatePlan(params);
      const maxNet = Math.max(params.target * 1.4, ...trajectory.map((t) => t.annualNet));
      const minShares = trajectory[0].shares;
      const maxShares = Math.max(minShares * 1.01, trajectory[trajectory.length - 1].shares);
      const toVec = (t: (typeof trajectory)[number]) =>
        new THREE.Vector3(
          (t.year / MAX_YEARS) * SPAN - SPAN / 2,
          -7 + (t.annualNet / maxNet) * 14,
          ((t.shares - minShares) / (maxShares - minShares)) * SPAN - SPAN / 2,
        );
      const pts = trajectory.map(toVec);
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.2, 10, false),
          new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669 }),
        ),
      );
      trajectory.forEach((t, i) => {
        if (t.year % 5 !== 0) return;
        const reached = t.annualNet >= params.target;
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 16, 16),
          new THREE.MeshStandardMaterial({ color: reached ? 0x10b981 : 0x06b6d4 }),
        );
        s.position.copy(pts[i]);
        group.add(s);
      });
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(SPAN + 1, SPAN + 1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
      );
      plane.position.y = -7 + (params.target / maxNet) * 14;
      group.add(plane);
      addMarker(pts[0].x, pts[0].y, pts[0].z);
      // 加碼時點：紫色環標在軌跡上
      const { lumpOffsetMonths } = simulatePlan(params);
      if (lumpOffsetMonths !== null) {
        const idx = Math.min(trajectory.length - 1, Math.ceil(lumpOffsetMonths / 12));
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.7, 0.12, 12, 32),
          new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce }),
        );
        ring.position.copy(pts[idx]);
        group.add(ring);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, params, pMin, pMax, dMin, dMax]);

  // 滑鼠位置對到曲面上的股價、配息
  const pickAt = (clientX: number, clientY: number) => {
    const container = mountRef.current;
    const camera = cameraRef.current;
    const surface = surfaceRef.current;
    const group = groupRef.current;
    if (!container || !camera || !surface || !group) return null;
    const rect = container.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(surface)[0];
    if (!hit) return null;
    const local = group.worldToLocal(hit.point.clone());
    return { price: round2(unmapX(local.x)), div: round2(unmapZ(local.z)), rect };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    movedRef.current = false;
    prevPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const group = groupRef.current;
    if (draggingRef.current && group) {
      const dx = e.clientX - prevPosRef.current.x;
      const dy = e.clientY - prevPosRef.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) movedRef.current = true;
      rotationRef.current.y += dx * 0.008;
      rotationRef.current.x = Math.max(-0.2, Math.min(1.4, rotationRef.current.x + dy * 0.008));
      group.rotation.set(rotationRef.current.x, rotationRef.current.y, 0);
      prevPosRef.current = { x: e.clientX, y: e.clientY };
      setHover(null);
      return;
    }
    if (viewMode !== 'years') return;
    const hit = pickAt(e.clientX, e.clientY);
    if (!hit) {
      setHover(null);
      return;
    }
    const r = simulatePlan({ ...params, price: hit.price, divPerShare: hit.div });
    setHover({
      x: e.clientX - hit.rect.left,
      y: e.clientY - hit.rect.top,
      lines: [
        `股價 ${hit.price.toFixed(2)}｜配息 ${hit.div.toFixed(2)}`,
        `殖利率 ${r.yieldPct.toFixed(2)}%`,
        r.yearsToTarget === null ? `${MAX_YEARS} 年內無法達標` : `達標約 ${r.yearsToTarget} 年`,
        `現在年實收 ${maskTWD(r.annualNetNow)}`,
        '點一下套用',
      ],
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasDrag = movedRef.current;
    draggingRef.current = false;
    if (wasDrag || viewMode !== 'years') return;
    const hit = pickAt(e.clientX, e.clientY);
    if (hit) onPick(hit.price, hit.div);
  };

  const handleWheel = (e: React.WheelEvent) => {
    zoomRef.current = Math.max(22, Math.min(60, zoomRef.current + e.deltaY * 0.025));
  };

  const cur = simulatePlan(params);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800 flex gap-1">
          <button
            onClick={() => setViewMode('years')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'years' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>達標年數曲面</span>
          </button>
          <button
            onClick={() => setViewMode('compound')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'compound' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{MAX_YEARS} 年複利軌跡</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${
              isAutoRotating ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            自動旋轉
          </button>
          <button
            onClick={() => {
              rotationRef.current = { x: 0.5, y: -0.7 };
              groupRef.current?.rotation.set(0.5, -0.7, 0);
              zoomRef.current = 36;
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title="重設視角"
          >
            <Rotate3d className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden select-none">
        <div
          ref={mountRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            draggingRef.current = false;
            setHover(null);
          }}
          onWheel={handleWheel}
          className="w-full h-[420px] cursor-crosshair touch-none"
        />

        <div className="absolute top-3 left-3 pointer-events-none bg-slate-950/85 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-0.5 max-w-xs">
          {viewMode === 'years' ? (
            <>
              <div className="text-slate-200 font-semibold">高度越高、越綠 = 越快達標</div>
              <div>X 軸：股價 {pMin.toFixed(2)}～{pMax.toFixed(2)}</div>
              <div>Z 軸：每股年配息 {dMin.toFixed(2)}～{dMax.toFixed(2)}</div>
              <div>紅色：{MAX_YEARS} 年內無法達標</div>
            </>
          ) : (
            <>
              <div className="text-slate-200 font-semibold">年實收隨時間的複利成長</div>
              <div>X 軸：第 0～{MAX_YEARS} 年；Z 軸：持股張數</div>
              <div>綠色平面：年股利目標；紫環：一次加碼之後的第一年</div>
            </>
          )}
        </div>

        <div className="absolute bottom-3 right-3 pointer-events-none bg-slate-950/90 p-3 rounded-xl border border-amber-500/30 text-[11px] text-slate-300 font-mono space-y-0.5">
          <div className="text-amber-400 font-semibold font-sans">黃點：目前設定</div>
          <div>股價 {params.price.toFixed(2)}｜配息 {params.divPerShare.toFixed(2)}</div>
          <div>殖利率 {cur.yieldPct.toFixed(2)}%</div>
          <div>{cur.yearsToTarget === null ? `${MAX_YEARS} 年內無法達標` : `達標約 ${cur.yearsToTarget} 年（${cur.reachMonth}）`}</div>
          {params.lumpSumTwd > 0 && <div>加碼 {maskTWD(params.lumpSumTwd)}（{params.lumpSumMonth}）</div>}
          <div>現在年實收 {maskTWD(cur.annualNetNow)}</div>
        </div>

        {hover && (
          <div
            className="absolute pointer-events-none bg-slate-900/95 px-3 py-2 rounded-lg border border-emerald-500/40 text-[11px] text-slate-200 font-mono space-y-0.5 shadow-xl"
            style={{ left: Math.min(hover.x + 14, 520), top: Math.max(hover.y - 90, 8) }}
          >
            {hover.lines.map((l) => (
              <div key={l} className={l === '點一下套用' ? 'text-emerald-400 font-sans' : ''}>
                {l}
              </div>
            ))}
          </div>
        )}

        <div className="absolute bottom-3 left-3 pointer-events-none text-[11px] text-slate-500 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
          拖曳旋轉｜滾輪縮放{viewMode === 'years' ? '｜點曲面套用' : ''}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">目標 {formatTWD(params.target)} TWD／年（實收）</p>
    </div>
  );
};
