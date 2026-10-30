import React from 'react';
import { CourseContentItem, StudentProfile } from '../types';
import { tokens, apiRequest } from '../services/api';
import { Download, X, AlertTriangle, Play, Pause, Volume2, VolumeX, Maximize, Minimize, ShieldCheck, RotateCcw, RotateCw, ChevronDown } from 'lucide-react';
import { AntiCheatGuard } from './AntiCheatGuard';

interface MediaViewerProps {
  content: CourseContentItem;
  role: 'student' | 'teacher';
  profile?: StudentProfile | null;
  onClose: () => void;
}

function cleanUrlOrEmbed(value?: string): string {
  if (!value) return '';
  let str = value.trim();

  // If teacher pasted full <iframe> embed code snippet, extract src URL
  if (str.includes('<iframe') && str.includes('src=')) {
    const match = str.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      str = match[1].trim();
    }
  }

  if (str.startsWith('//')) {
    str = 'https:' + str;
  } else if (!/^https?:\/\//i.test(str) && (str.includes('youtube.com') || str.includes('youtu.be') || str.includes('vimeo.com') || str.startsWith('www.'))) {
    str = 'https://' + str;
  }

  return str;
}

function safeHttpUrl(value?: string): string {
  const cleaned = cleanUrlOrEmbed(value);
  if (!cleaned) return '';
  try {
    const url = new URL(cleaned);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (e) {
    return '';
  }
}

function getEmbeddedVideoUrl(value?: string): string {
  const raw = cleanUrlOrEmbed(value);
  if (!raw) return '';

  // Universal YouTube ID extractor regex (covers watch?v=, youtu.be/, embed/, shorts/, live/, v/, or any YouTube URL format)
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/i;
  const match = raw.match(ytRegex);
  if (match && match[1]) {
    const id = match[1];
    const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&autohide=1&enablejsapi=1${origin ? `&origin=${origin}&widget_referrer=${origin}` : ''}`;
  }

  // If raw string itself is an 11-char YouTube ID
  if (/^[\w-]{11}$/.test(raw.trim())) {
    const id = raw.trim();
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&autohide=1&enablejsapi=1`;
  }

  try {
    const url = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    // 2. Vimeo
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const vimeoId = url.pathname.match(/(?:video\/|videos\/|)(\d+)/)?.[1];
      if (vimeoId) {
        return `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`;
      }
    }

    // 3. Google Drive preview embed
    if (host === 'drive.google.com') {
      const driveId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get('id');
      if (driveId) {
        return `https://drive.google.com/file/d/${driveId}/preview`;
      }
    }

    // 4. Any direct embed URL
    if (url.pathname.includes('/embed/') || url.pathname.includes('/player/')) {
      return url.href;
    }
  } catch (e) {
    return '';
  }
  return '';
}

function youtubeEmbedUrl(value?: string): string {
  return getEmbeddedVideoUrl(value);
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  content,
  role,
  profile,
  onClose,
}) => {
  // Dynamic floating watermark position
  const [watermarkPos, setWatermarkPos] = React.useState({
    top: 35,
    left: 45,
    rotate: -8,
  });

  // Periodically move watermark smoothly across the view
  React.useEffect(() => {
    if (role !== 'student') return;
    const interval = setInterval(() => {
      const top = Math.floor(Math.random() * 65) + 18;
      const left = Math.floor(Math.random() * 65) + 18;
      const rotate = Math.floor(Math.random() * 20) - 10;
      setWatermarkPos({ top, left, rotate });
    }, 4200);

    return () => clearInterval(interval);
  }, [role]);

  // Anti-Cheat: Video Skipping Prevention Logic
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [maxTimeWatched, setMaxTimeWatched] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const syncInterval = React.useRef<NodeJS.Timeout | null>(null);

  // Load saved progress
  React.useEffect(() => {
    if (role !== 'student' || !content.id) return;
    
    const loadProgress = async () => {
      try {
        const progress = await apiRequest('student', `/api/student/video-progress/${content.id}`);
        if (progress?.maxTime) {
          setMaxTimeWatched(progress.maxTime);
        }
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    };
    loadProgress();
  }, [role, content.id]);

  const handleTimeUpdate = () => {
    if (role !== 'student' || !videoRef.current) return;
    const current = videoRef.current.currentTime;
    
    // If student tries to skip forward more than 2 seconds beyond what they already watched
    if (current > maxTimeWatched + 2) {
      videoRef.current.currentTime = maxTimeWatched;
      // Show a small warning or toast here if needed
    } else if (current > maxTimeWatched) {
      setMaxTimeWatched(current);
    }
  };

  const saveProgress = React.useCallback(async (time: number, isCompleted: boolean) => {
    if (role !== 'student' || !content.id || isSyncing) return;
    setIsSyncing(true);
    try {
      await apiRequest('student', '/api/student/video-progress', {
        contentId: content.id,
        maxTime: time,
        completed: isCompleted
      });
    } catch (e) {
      console.error('Failed to sync progress', e);
    } finally {
      setIsSyncing(false);
    }
  }, [role, content.id, isSyncing]);

  // Periodic sync
  React.useEffect(() => {
    if (role !== 'student') return;
    syncInterval.current = setInterval(() => {
      if (maxTimeWatched > 0) {
        saveProgress(maxTimeWatched, false);
      }
    }, 30000); // Every 30 seconds

    return () => {
      if (syncInterval.current) clearInterval(syncInterval.current);
    };
  }, [role, maxTimeWatched, saveProgress]);

  const handleEnded = () => {
    saveProgress(maxTimeWatched, true);
  };

  const external = !!content.link;
  const original = external ? safeHttpUrl(content.link) : '';
  const youtube = external ? youtubeEmbedUrl(original) : '';
  const directVideo = external && /\.(?:mp4|webm|ogg|m3u8)(?:$|[?#])/i.test(original);
  const directImage = external && /\.(?:png|jpe?g|gif|webp)(?:$|[?#])/i.test(original);
  const directPdf = external && /\.pdf(?:$|[?#])/i.test(original);

  const token = role === 'student' ? tokens.student : tokens.teacher;
  const fileUrl = content.fileId
    ? `/files/${encodeURIComponent(content.fileId)}?t=${encodeURIComponent(token)}`
    : '';
  const mediaUrl = external ? youtube || original : fileUrl;
  const mime = content.mime || '';

  const canDownload =
    !external &&
    !(role === 'student' && mime.startsWith('video/')) &&
    content.fileId;

  const handleSeeking = () => {
    if (role !== 'student' || !videoRef.current) return;
    if (videoRef.current.currentTime > maxTimeWatched + 1) {
      videoRef.current.currentTime = maxTimeWatched;
    }
  };

  const handleRateChange = () => {
    if (role !== 'student' || !videoRef.current) return;
    if (videoRef.current.playbackRate > 1.25) {
      videoRef.current.playbackRate = 1.0;
    }
  };

  // Custom YouTube Player Controls & Fullscreen State
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const playerContainerRef = React.useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [playbackRate, setPlaybackRate] = React.useState('1x');
  const [showSpeedMenu, setShowSpeedMenu] = React.useState(false);
  const [currentTimeSec, setCurrentTimeSec] = React.useState(122);
  const [durationSec, setDurationSec] = React.useState(203);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const sendYTCommand = (func: string, args: any = '') => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (e) {}
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const next = !isPlaying;
    setIsPlaying(next);
    sendYTCommand(next ? 'playVideo' : 'pauseVideo');
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const next = !isMuted;
    setIsMuted(next);
    sendYTCommand(next ? 'mute' : 'unMute');
  };

  const skipSeconds = (delta: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const next = Math.max(0, Math.min(durationSec, currentTimeSec + delta));
    setCurrentTimeSec(next);
    sendYTCommand('seekTo', [next, true]);
  };

  const changeSpeed = (rateStr: string, rateNum: number) => {
    setPlaybackRate(rateStr);
    setShowSpeedMenu(false);
    sendYTCommand('setPlaybackRate', [rateNum]);
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeSec((prev) => (prev >= durationSec ? durationSec : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, durationSec]);

  return (
    <AntiCheatGuard
      enabled={role === 'student'}
      type="video"
      studentName={profile?.name}
      studentCode={profile?.code}
      studentPhone={profile?.phone}
    >
      <div
        role="dialog"
      aria-modal="true"
      onContextMenu={(e) => {
        if (role === 'student') e.preventDefault();
      }}
      onBlur={(e) => {
        if (role === 'student') {
          e.currentTarget.style.filter = 'blur(20px)';
        }
      }}
      onFocus={(e) => {
        if (role === 'student') {
          e.currentTarget.style.filter = 'none';
        }
      }}
      className="fixed inset-0 z-50 flex flex-col items-center gap-4 overflow-y-auto p-4 sm:p-6 select-none"
      style={{ background: 'rgba(7, 13, 25, 0.95)', backdropFilter: 'blur(8px)', transition: 'filter 0.3s' }}
    >
      {/* Top Bar: Close button & Download (if permitted), NO sharing or external YouTube buttons */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-5xl px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white truncate max-w-md">
            {content.title || 'عرض المحتوى'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canDownload && (
            <a
              className="btn-gold btn-sm flex items-center gap-1.5"
              href={mediaUrl}
              download={content.fileName || 'file'}
            >
              <Download className="w-4 h-4" />
              <span>تنزيل الملف</span>
            </a>
          )}

          <button
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs"
            onClick={onClose}
            type="button"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </button>
        </div>
      </div>

      {/* Main Player Display */}
      <div className="relative my-auto flex max-h-[82vh] w-full max-w-5xl items-center justify-center overflow-hidden">
        {youtube ? (
          <div ref={playerContainerRef} className="relative w-full aspect-video max-h-[640px] group rounded-2xl overflow-hidden bg-black border border-blue-500/25 shadow-2xl">
            <iframe
              ref={iframeRef}
              src={youtube}
              title={content.title || 'فيديو المنصة'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="origin"
              className="w-full h-full rounded-2xl bg-black pointer-events-none select-none"
            />

            {/* Top Bar: Title & Instructor Profile Avatar (Matching Screenshot 1 & 2) */}
            <div 
              className="absolute top-0 right-0 left-0 h-16 z-40 bg-gradient-to-b from-black/95 via-black/75 to-transparent flex items-center justify-between px-5 select-none pointer-events-auto"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
            >
              {/* Title Text */}
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-base font-black text-white truncate max-w-xl drop-shadow">
                  {content.title || 'كورس المحتوى | المحاضرة التفاعلية'}
                </h3>
              </div>

              {/* Instructor Avatar & Name */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="block text-xs font-black text-white">أستاذ محمد عبد المقصود</span>
                  <span className="block text-[10px] text-cyan-300 font-bold">معلم المنصة</span>
                </div>
                <div className="w-9 h-9 rounded-full border-2 border-cyan-400 shadow-md bg-slate-900 overflow-hidden flex items-center justify-center font-bold text-xs text-white">
                  <span>🎓</span>
                </div>
              </div>
            </div>

            {/* Center 3 Controls Overlay: [ ⏮ Skip 10s ] [ ▶ Center Play Circle ] [ ⏭ Skip 10s ] */}
            <div 
              className="absolute inset-x-0 top-16 bottom-20 z-30 flex items-center justify-center gap-6 sm:gap-10 pointer-events-auto select-none cursor-pointer"
              onClick={togglePlay}
            >
              {/* Skip Back 10s Button */}
              <button
                type="button"
                onClick={(e) => skipSeconds(-10, e)}
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-white/20 text-white backdrop-blur-md flex items-center justify-center shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                title="إرجاع 10 ثواني"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>

              {/* Center Play/Pause Large Circle */}
              <button
                type="button"
                onClick={togglePlay}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/25 hover:bg-white/35 border-2 border-white/40 text-white backdrop-blur-md flex items-center justify-center shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current text-white" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current text-white ml-1" />
                )}
              </button>

              {/* Skip Forward 10s Button */}
              <button
                type="button"
                onClick={(e) => skipSeconds(10, e)}
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-white/20 text-white backdrop-blur-md flex items-center justify-center shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                title="تقديم 10 ثواني"
              >
                <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>

            {/* Bottom Controls Bar (Exact Replica of Screenshots 1 & 2) */}
            <div 
              className="absolute bottom-0 right-0 left-0 z-40 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-3 sm:p-4 flex flex-col gap-2 border-t border-blue-500/20 select-none pointer-events-auto backdrop-blur-md"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
            >
              {/* Subtitle Caption Transcript Box */}
              <div className="self-start sm:self-center bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-xl text-xs font-semibold text-slate-200 text-center max-w-lg shadow-lg truncate">
                <span>{content.title || 'شرح تفاعلي مبسط للمحاضرة داخل منصة ليرن ويب'}</span>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-3">
                {/* Left Controls: Orange Play/Pause + Time Display */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black flex items-center justify-center shadow-lg cursor-pointer shrink-0 transition-transform active:scale-95"
                    title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <span className="text-xs font-extrabold text-white font-mono shrink-0">
                    {formatTime(currentTimeSec)} / {formatTime(durationSec)}
                  </span>
                </div>

                {/* Center Progress Slider (Purple/Cyan Gradient) */}
                <div 
                  className="relative flex-1 h-2 rounded-full bg-slate-800 overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                    const nextTime = Math.floor(ratio * durationSec);
                    setCurrentTimeSec(nextTime);
                    sendYTCommand('seekTo', [nextTime, true]);
                  }}
                >
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTimeSec / durationSec) * 100}%` }}
                  />
                </div>

                {/* Right Controls: Speed Selector Dropdown + Mute + Fullscreen */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Speed Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-white/10 cursor-pointer"
                    >
                      <span>{playbackRate}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-10 left-0 bg-slate-900 border border-blue-500/30 rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-1 min-w-[70px]">
                        {['0.5x', '0.75x', '1x', '1.25x', '1.5x', '2x'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => changeSpeed(s, parseFloat(s))}
                            className={`text-xs font-bold py-1 px-2.5 rounded-lg text-right hover:bg-blue-600 hover:text-white cursor-pointer ${
                              playbackRate === s ? 'bg-blue-600 text-white' : 'text-slate-300'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mute Button */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 sm:p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
                    title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-1.5 sm:p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
                    title="ملء الشاشة"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4 text-cyan-400" />}
                  </button>
                </div>
              </div>
            </div>
            {/* Enhanced Dynamic Anti-Piracy Watermark & Protection System (Ultra Transparent - Barely Visible) */}
            {role === 'student' && (
              <>
                {/* 1. Repeating Semi-transparent Watermark Grid */}
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 flex flex-col justify-around opacity-[0.025]">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex justify-around transform -rotate-12 whitespace-nowrap text-[11px] font-bold text-white/30">
                      <span>{profile?.name || 'طالب المنصة'} • {profile?.phone || ''} • كود: {profile?.code || ''}</span>
                      <span className="hidden sm:inline">{profile?.name || 'طالب المنصة'} • {profile?.phone || ''}</span>
                      <span>{profile?.phone || ''} • {profile?.code || ''}</span>
                    </div>
                  ))}
                </div>

                {/* 2. Dynamic Wandering Watermark - ultra soft & transparent badge */}
                <div
                  className="absolute pointer-events-none select-none z-30 transition-all duration-1000 ease-in-out font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    top: `${watermarkPos.top}%`,
                    left: `${watermarkPos.left}%`,
                    transform: `translate(-50%, -50%) rotate(${watermarkPos.rotate}deg)`,
                    backgroundColor: 'rgba(15, 23, 42, 0.06)',
                    color: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    textShadow: 'none'
                  }}
                >
                  <span className="w-1 h-1 rounded-full bg-cyan-400/30 animate-pulse"></span>
                  <span>{profile?.name || 'الطالب'}</span>
                  <span className="text-white/10">|</span>
                  <span dir="ltr">{profile?.phone || '***'}</span>
                </div>
              </>
            )}
          </div>
        ) : directVideo || mime.startsWith('video/') ? (
          <div className="relative inline-block max-w-full">
            <video
              ref={videoRef}
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              controlsList={role === 'student' ? 'nodownload noplaybackrate' : undefined}
              disablePictureInPicture={role === 'student'}
              onContextMenu={(e) => e.preventDefault()}
              onTimeUpdate={handleTimeUpdate}
              onSeeking={handleSeeking}
              onRateChange={handleRateChange}
              onEnded={handleEnded}
              className="max-h-[75vh] max-w-full rounded-2xl bg-black shadow-2xl border border-blue-500/20 select-none"
            />
            {/* Enhanced Dynamic Anti-Piracy Watermark & Protection System (Ultra Transparent) */}
            {role === 'student' && (
              <>
                {/* 1. Repeating Watermark Grid */}
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 flex flex-col justify-around opacity-[0.025]">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex justify-around transform -rotate-12 whitespace-nowrap text-[11px] font-bold text-white/30">
                      <span>{profile?.name || 'طالب المنصة'} • {profile?.phone || ''} • كود: {profile?.code || ''}</span>
                      <span className="hidden sm:inline">{profile?.name || 'طالب المنصة'} • {profile?.phone || ''}</span>
                    </div>
                  ))}
                </div>

                {/* 2. Dynamic Wandering Watermark */}
                <div
                  className="absolute pointer-events-none select-none z-30 transition-all duration-1000 ease-in-out font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    top: `${watermarkPos.top}%`,
                    left: `${watermarkPos.left}%`,
                    transform: `translate(-50%, -50%) rotate(${watermarkPos.rotate}deg)`,
                    backgroundColor: 'rgba(15, 23, 42, 0.06)',
                    color: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    textShadow: 'none'
                  }}
                >
                  <span className="w-1 h-1 rounded-full bg-cyan-400/30 animate-pulse"></span>
                  <span>{profile?.name || 'الطالب'}</span>
                  <span className="text-white/10">|</span>
                  <span dir="ltr">{profile?.phone || '***'}</span>
                </div>
              </>
            )}
          </div>
        ) : directImage || mime.startsWith('image/') ? (
          <img
            src={mediaUrl}
            alt={content.title || 'صورة'}
            className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-blue-500/20"
          />
        ) : directPdf || mime === 'application/pdf' ? (
          <iframe
            src={mediaUrl}
            title={content.title || 'ملف PDF'}
            referrerPolicy="origin"
            className="h-[80vh] w-full rounded-2xl bg-white border-0 shadow-2xl"
          />
        ) : external ? (
          <iframe
            src={mediaUrl}
            title={content.title || 'محتوى المنصة'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="origin"
            className="h-[75vh] w-full rounded-2xl bg-black border border-blue-500/20 shadow-2xl"
          />
        ) : (
          <div className="panel p-8 text-center text-white bg-[#0f1b2d] rounded-2xl border border-blue-500/20">
            <p className="font-bold">
              لا يمكن عرض هذا الملف مباشرة داخل المتصفح. استخدم زر التنزيل أعلاه.
            </p>
          </div>
        )}
      </div>
    </div>
  </AntiCheatGuard>
  );
};
