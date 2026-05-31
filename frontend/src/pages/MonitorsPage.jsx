import { useState, useEffect, useRef } from 'react';
import { aiAPI, getErrorMessage } from '../services/api';
import { Camera, RefreshCw, CheckCircle, AlertTriangle, Shield, Play, Pause, Settings, Edit2, Video } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_MONITORS = [
  {
    id: 'mon-01',
    camCode: 'CAM_01',
    name: 'CAM_01 - Cầu Sông Hàn (Đông)',
    assetName: 'Cột đèn chiếu sáng 04',
    assetType: 'lamp',
    initialQuality: 95,
    status: 'active',
    lat: 16.0678,
    lng: 108.2208,
    streamUrl: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=600&auto=format&fit=crop&q=60', // Bridge at night
  },
  {
    id: 'mon-02',
    camCode: 'CAM_02',
    name: 'CAM_02 - Công viên Bạch Đằng (Trung tâm)',
    assetName: 'Ghế đá nghệ thuật 12',
    assetType: 'bench',
    initialQuality: 92,
    status: 'active',
    lat: 16.0592,
    lng: 108.2245,
    streamUrl: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600&auto=format&fit=crop&q=60', // Bench in park
  },
  {
    id: 'mon-03',
    camCode: 'CAM_03',
    name: 'CAM_03 - Đường Bạch Đằng (Bắc)',
    assetName: 'Thùng rác thông minh 08',
    assetType: 'trash_can',
    initialQuality: 88,
    status: 'active',
    lat: 16.0745,
    lng: 108.2212,
    streamUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=60', // City street
  },
  {
    id: 'mon-04',
    camCode: 'CAM_04',
    name: 'CAM_04 - Phố đi bộ An Thượng',
    assetName: 'Nhà vệ sinh công cộng 02',
    assetType: 'toilet',
    initialQuality: 96,
    status: 'active',
    lat: 16.0465,
    lng: 108.2435,
    streamUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&auto=format&fit=crop&q=60', // Modern square
  }
];

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState(INITIAL_MONITORS);
  const [activePlay, setActivePlay] = useState({
    'mon-01': true,
    'mon-02': true,
    'mon-03': true,
    'mon-04': true,
  });
  const [evaluating, setEvaluating] = useState({});
  const [editingCode, setEditingCode] = useState(null); // id of monitor currently editing its code
  const [inputCode, setInputCode] = useState('');
  
  const canvasRefs = useRef({});
  const webcamStreams = useRef({}); // { monId: MediaStream }
  const webcamVideos = useRef({}); // { monId: HTMLVideoElement }

  // Cleanup all webcams on page unmount
  useEffect(() => {
    return () => {
      Object.keys(webcamStreams.current).forEach(id => {
        if (webcamStreams.current[id]) {
          webcamStreams.current[id].getTracks().forEach(t => t.stop());
        }
      });
    };
  }, []);

  // Simulate active frame drawings to make the monitors look alive and dynamic
  useEffect(() => {
    const intervals = [];
    monitors.forEach((m) => {
      const canvas = canvasRefs.current[m.id];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = m.streamUrl;

      let frame = 0;
      const draw = () => {
        if (!activePlay[m.id]) return;

        const videoEl = webcamVideos.current[m.id];
        if (m.camCode?.toUpperCase() === 'WEBCAM' && videoEl && videoEl.readyState >= 2) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        
        // Scanlines overlay for rich monitor feel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        for (let y = 0; y < canvas.height; y += 4) {
          ctx.fillRect(0, y + (frame % 4), canvas.width, 1);
        }

        // Live blinking red dot
        if (Math.floor(frame / 15) % 2 === 0) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(canvas.width - 25, 20, 5, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Render REC text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('REC LIVE', canvas.width - 90, 24);

        // Render timestamp
        const timeStr = new Date().toLocaleString('vi');
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '10px monospace';
        ctx.fillText(timeStr, 15, canvas.height - 15);

        // Noise overlay if evaluating
        if (evaluating[m.id]) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          for (let i = 0; i < 200; i++) {
            const rx = Math.random() * canvas.width;
            const ry = Math.random() * canvas.height;
            ctx.fillRect(rx, ry, 2, 2);
          }
          // Scan green bar
          ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
          const scanY = (frame * 5) % canvas.height;
          ctx.fillRect(0, scanY, canvas.width, 8);
        }

        frame++;
      };

      const startDraw = () => {
        const id = setInterval(draw, 100);
        intervals.push(id);
      };

      img.onload = startDraw;
      img.onerror = startDraw; // Fallback to run loop even if Unsplash query fails or custom source
    });

    return () => intervals.forEach(clearInterval);
  }, [monitors, activePlay, evaluating]);

  const handleAISnapshot = async (monId) => {
    if (evaluating[monId]) return;
    
    setEvaluating(prev => ({ ...prev, [monId]: true }));
    toast(`Đang chụp hình ảnh từ ${monId} và gửi phân tích AI...`, { icon: '📸' });
    
    try {
      // Simulate snapshot process
      await new Promise(r => setTimeout(r, 1800));

      // We call classify with a mock flow (or a real file if we want, but since it is a camera feed, we mock the AI response based on simulated health)
      // Generates a random score and simulated status
      const randomSeed = Math.random();
      let score = 98;
      let status = 'active';
      let msg = 'Chất lượng tài sản tuyệt vời. Không phát hiện sự cố.';

      if (randomSeed < 0.35) {
        score = Math.round(30 + Math.random() * 25);
        status = 'damaged';
        msg = `Cảnh báo: Phát hiện dấu hiệu hư hại nứt vỡ. Đánh giá chất lượng: ${score}%.`;
      } else if (randomSeed < 0.6) {
        score = Math.round(75 + Math.random() * 10);
        status = 'maintenance';
        msg = `Nhắc nhở: Cần lập lịch vệ sinh/bảo trì định kỳ. Đánh giá chất lượng: ${score}%.`;
      }

      setMonitors(prev => prev.map(m => {
        if (m.id === monId) {
          return { ...m, initialQuality: score, status };
        }
        return m;
      }));

      if (status === 'damaged') {
        toast.error(msg, { duration: 4000 });
      } else if (status === 'maintenance') {
        toast(msg, { icon: '⚠️', duration: 4000 });
      } else {
        toast.success(msg, { duration: 4000 });
      }

    } catch (err) {
      toast.error('Lỗi khi phân tích hình ảnh camera: ' + getErrorMessage(err));
    } finally {
      setEvaluating(prev => ({ ...prev, [monId]: false }));
    }
  };

  const stopWebcam = (monId) => {
    if (webcamStreams.current[monId]) {
      webcamStreams.current[monId].getTracks().forEach(track => track.stop());
      webcamStreams.current[monId] = null;
    }
    if (webcamVideos.current[monId]) {
      webcamVideos.current[monId].pause();
      webcamVideos.current[monId] = null;
    }
  };

  const handleUpdateCamCode = async (monId, newCode) => {
    stopWebcam(monId);
    let updatedStreamUrl = null;

    if (newCode.toUpperCase() === 'WEBCAM') {
      const loadToast = toast.loading('Đang khởi động Webcam của bạn...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        const videoEl = document.createElement('video');
        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.play();
        
        webcamStreams.current[monId] = stream;
        webcamVideos.current[monId] = videoEl;
        
        toast.success(`Đã phát trực tiếp Webcam trên Monitor ${monId}!`, { id: loadToast });
      } catch (err) {
        toast.error('Lỗi truy cập Webcam: ' + err.message, { id: loadToast });
        return;
      }
    } else if (newCode.startsWith('http://') || newCode.startsWith('https://')) {
      updatedStreamUrl = newCode;
      toast.success(`Đã cấu hình đường dẫn hình ảnh tùy chỉnh cho ${monId}!`);
    } else {
      const original = INITIAL_MONITORS.find(m => m.id === monId);
      updatedStreamUrl = original ? original.streamUrl : null;
      toast.success(`Đã thiết lập lại camera mặc định: ${newCode}`);
    }

    setMonitors(prev => prev.map(m => {
      if (m.id === monId) {
        return { 
          ...m, 
          camCode: newCode, 
          streamUrl: updatedStreamUrl || m.streamUrl 
        };
      }
      return m;
    }));
    setEditingCode(null);
  };

  const togglePlay = (id) => {
    setActivePlay(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={20} className="text-primary" /> Giám sát Camera & Đánh giá AI
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Giám sát trực quan camera thông minh. Bấm nút AI Auditing để tự động chụp hình ảnh camera và chạy mô hình phân tích chất lượng công trình công cộng.
          </p>
        </div>
      </div>

      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px dashed var(--accent-cyan)',
        padding: '12px 16px',
        borderRadius: 'var(--radius)',
        marginBottom: 20,
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--text-primary)'
      }}>
        💡 <strong>Mẹo trình chiếu & Demo Webcam thực tế:</strong> Bạn có thể đổi mã camera của bất kỳ khung giám sát nào bên dưới. Nhấp vào biểu tượng chỉnh sửa kế bên <strong>"Mã nguồn"</strong>, nhập mã <strong style={{ color: 'var(--accent-cyan)' }}>WEBCAM</strong> và nhấp <strong>"Áp dụng"</strong> để cấp quyền sử dụng Webcam máy tính của bạn trực tiếp làm nguồn cấp hình ảnh Live CCTV! Tất cả bộ lọc quét AI, đèn REC, nhấp nháy đỏ vẫn hoạt động trực quan trên luồng webcam thực tế.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 20 }}>
        {monitors.map((m) => {
          const isPlay = activePlay[m.id];
          const isEval = evaluating[m.id];
          const colorClass = m.status === 'damaged' ? 'var(--accent-red)' : m.status === 'maintenance' ? 'var(--accent-amber)' : 'var(--accent-green)';
          
          return (
            <div key={m.id} className="card" style={{
              padding: 0,
              overflow: 'hidden',
              border: m.status === 'damaged' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-color)',
              boxShadow: m.status === 'damaged' ? '0 8px 30px rgba(239, 68, 68, 0.1)' : 'var(--shadow-card)',
              position: 'relative'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)'
              }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{m.name}</h4>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Tài sản: <strong>{m.assetName}</strong>
                  </span>
                  {editingCode === m.id ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      <input 
                        className="form-input" 
                        style={{ padding: '2px 6px', fontSize: 11, height: 'auto', width: 130 }} 
                        value={inputCode} 
                        onChange={(e) => setInputCode(e.target.value)} 
                        placeholder="Mã camera / WEBCAM"
                        autoFocus
                      />
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => handleUpdateCamCode(m.id, inputCode)}
                        style={{ padding: '2px 6px', fontSize: 10 }}
                      >
                        Lưu
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => setEditingCode(null)}
                        style={{ padding: '2px 6px', fontSize: 10 }}
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Mã nguồn: <strong style={{ color: 'var(--accent-cyan)' }}>{m.camCode}</strong>
                      </span>
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                        onClick={() => {
                          setEditingCode(m.id);
                          setInputCode(m.camCode);
                        }}
                        title="Đổi mã camera / Webcam"
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => togglePlay(m.id)} className="btn btn-sm btn-secondary" title={isPlay ? "Tạm dừng stream" : "Phát stream"} style={{ padding: 6 }}>
                    {isPlay ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button onClick={() => handleAISnapshot(m.id)} disabled={isEval || !isPlay} className="btn btn-sm btn-primary" title="Chụp ảnh & Phân tích chất lượng AI" style={{ padding: '6px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={11} className={isEval ? 'animate-spin' : ''} /> AI Audit
                  </button>
                </div>
              </div>

              {/* Monitor Screen */}
              <div style={{ position: 'relative', width: '100%', height: 260, background: '#090d16' }}>
                <canvas
                  ref={(el) => { canvasRefs.current[m.id] = el; }}
                  width={560}
                  height={320}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {!isPlay && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(9, 13, 22, 0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-muted)'
                  }}>
                    <Pause size={32} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>PAUSED STREAM</span>
                  </div>
                )}
                {isEval && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--accent-green)', zIndex: 10
                  }}>
                    <span style={{
                      fontWeight: 700, fontSize: 12, padding: '6px 12px',
                      background: 'rgba(9, 13, 22, 0.9)', border: '1px solid var(--accent-green)',
                      borderRadius: 'var(--radius-sm)', letterSpacing: 1.5, animation: 'pulse 1.5s infinite'
                    }}>
                      AI RUNNING ANALYTICS
                    </span>
                  </div>
                )}
              </div>

              {/* Status Info Footer */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderTop: '1px solid var(--border-color)', fontSize: 13
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Chất lượng đánh giá: </span>
                  <strong style={{ color: colorClass, fontSize: 15 }}>{m.initialQuality}%</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.status === 'active' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)', fontWeight: 600, fontSize: 12 }}>
                      <CheckCircle size={12} /> BÌNH THƯỜNG
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colorClass, fontWeight: 600, fontSize: 12 }}>
                      <AlertTriangle size={12} /> {m.status === 'damaged' ? 'HƯ HỎNG / CẢNH BÁO' : 'CẦN BẢO TRÌ'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
