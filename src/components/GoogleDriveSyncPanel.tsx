import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Clock, 
  Sparkles, 
  LogOut, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink 
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, googleLogout, initAuth } from '../services/googleAuth';
import { fetchCurrentPriceFromCoreSheet, DEFAULT_CORE_SPREADSHEET_ID, CoreSheetFetchResult } from '../services/sheetsService';
import { Holding } from '../types/portfolio';
import { usePrivacy } from '../context/PrivacyContext';

interface GoogleDriveSyncPanelProps {
  holding: Holding;
  onUpdatePrice: (newPrice: number, updatedDate: string) => void;
  onNotifyToast: (msg: string) => void;
}

export const GoogleDriveSyncPanel: React.FC<GoogleDriveSyncPanelProps> = ({
  holding,
  onUpdatePrice,
  onNotifyToast,
}) => {
  const { isPrivacyMaskActive, maskEmail } = usePrivacy();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('inv_last_drive_sync') || null;
  });
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(() => {
    return Number(localStorage.getItem('inv_auto_sync_interval') || 0);
  });
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('inv_core_sheet_id') || DEFAULT_CORE_SPREADSHEET_ID;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setErrorMessage(null);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('inv_auto_sync_interval', autoSyncInterval.toString());
  }, [autoSyncInterval]);

  useEffect(() => {
    localStorage.setItem('inv_core_sheet_id', spreadsheetId);
  }, [spreadsheetId]);

  // Periodic Auto-Sync Timer
  useEffect(() => {
    if (!user || !token || autoSyncInterval <= 0) return;

    const intervalMs = autoSyncInterval * 60 * 1000;
    const timer = setInterval(() => {
      handleFetchPriceFromCore(true);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [user, token, autoSyncInterval, spreadsheetId]);

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        onNotifyToast(`Google 帳號已連接（${result.user.email}），已具備 Investment_Tracker_Core 唯讀讀取權限！`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Google 授權登入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await googleLogout();
    setUser(null);
    setToken(null);
    onNotifyToast('已中斷 Google Drive 連線');
  };

  const handleFetchPriceFromCore = async (isBackground: boolean = false) => {
    if (!token && !user) {
      try {
        await handleLogin();
      } catch {
        return;
      }
    }

    setIsFetchingPrice(true);
    setErrorMessage(null);
    try {
      const result: CoreSheetFetchResult = await fetchCurrentPriceFromCoreSheet(
        spreadsheetId,
        holding.ticker
      );

      onUpdatePrice(result.currentPrice, result.lastUpdated);
      const nowStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(nowStr);
      localStorage.setItem('inv_last_drive_sync', nowStr);

      const msg = `已自 Investment_Tracker_Core (Portfolio!Current_Price) 抓取最新股價：${result.currentPrice.toFixed(2)} TWD（記錄日期：${result.lastUpdated}）！`;
      if (!isBackground) {
        onNotifyToast(msg);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (err.message === 'NEEDS_AUTH' || err.message === 'AUTH_EXPIRED') {
        setErrorMessage('授權已過期，請點擊「以 Google 帳號登入」重新授權');
      } else {
        setErrorMessage(err.message || '從 Google Sheets 抓取失敗');
      }
    } finally {
      setIsFetchingPrice(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-100">Google Drive / Sheets 雲端連線同步</h3>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Lock className="w-2.5 h-2.5" />
                <span>唯讀安全保護 (Read-Only)</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              連線 <code className="text-slate-300 font-mono text-[11px]">Investment_Tracker_Core</code> 直接讀取 Portfolio 的 Current_Price
            </p>
          </div>
        </div>

        {/* Auth status & buttons */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-5 h-5 rounded-full" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-slate-300 font-medium max-w-[120px] truncate" title={isPrivacyMaskActive ? '••••••' : (user.email || '')}>
                {isPrivacyMaskActive ? maskEmail(user.email) : (user.displayName || user.email)}
              </span>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-slate-300 ml-1 p-0.5"
                title="登出 Google 帳號"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>{isLoading ? '登入中...' : '連接 Google 帳號'}</span>
            </button>
          )}

          <button
            onClick={() => handleFetchPriceFromCore(false)}
            disabled={isFetchingPrice}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingPrice ? 'animate-spin' : ''}`} />
            <span>{isFetchingPrice ? '讀取中...' : '從 Core 抓取最新股價'}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 pt-1">
        <div className="flex items-center space-x-2 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          <span>最後從 Core 同步：</span>
          <span className="font-mono text-slate-200 font-medium">
            {lastSyncTime ? `今日 ${lastSyncTime}` : '尚未自雲端同步'}
          </span>
          <span className="text-slate-600">｜</span>
          <span className="text-slate-400">目前持股報價：</span>
          <span className="font-mono text-emerald-400 font-bold">
            {holding.currentPrice.toFixed(2)} TWD
          </span>
        </div>

        {/* Auto Sync Interval Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">背景自動定時抓取：</span>
          <select
            value={autoSyncInterval}
            onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
            className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="0">關閉 (手動按鈕更新)</option>
            <option value="15">每 15 分鐘</option>
            <option value="30">每 30 分鐘 (推薦)</option>
            <option value="60">每 1 小時</option>
          </select>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300"
            title="進階試算表 ID 設定"
          >
            {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {!user && (
            <button
              onClick={handleLogin}
              className="text-xs font-bold text-rose-200 underline ml-2"
            >
              立即登入授權
            </button>
          )}
        </div>
      )}

      {/* Advanced Settings Drawer */}
      {showSettings && (
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3 text-xs animate-fade-in">
          <div className="font-semibold text-slate-300">進階：Investment_Tracker_Core 試算表設定</div>
          <div className="space-y-1">
            <label className="text-slate-400 block">Google Spreadsheet ID：</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200"
                placeholder={DEFAULT_CORE_SPREADSHEET_ID}
              />
              <button
                type="button"
                onClick={() => setSpreadsheetId(DEFAULT_CORE_SPREADSHEET_ID)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                還原預設 ID
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              預設為 Hachi 的後台試算表 (ID: <code className="text-slate-400">{DEFAULT_CORE_SPREADSHEET_ID}</code>)，僅讀取 <code className="text-slate-400">Portfolio!A1:G10</code> 範圍。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
