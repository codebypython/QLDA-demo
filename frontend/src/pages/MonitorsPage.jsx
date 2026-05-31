import { useState, useEffect, useRef } from 'react';
import { aiAPI, getErrorMessage, assetsAPI } from '../services/api';
import { useAssetsStore } from '../store';
import { Camera, RefreshCw, CheckCircle, AlertTriangle, Shield, Play, Pause, Edit2, Video, Download, Trash2, Check, FileCheck, ArrowUpRight, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_MONITORS = [
  {
    id: 'mon-01',
    camCode: 'CAM_01',
    name: 'CAM_01 - Cầu Sông Hàn (Đông)',
    assetName: 'Cột đèn chiếu sáng 04',
    assetType: 'lamp',
    streamUrl: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=600&auto=format&fit=crop&q=60', // Bridge at night
  },
  {
    id: 'mon-02',
    camCode: 'CAM_02',
    name: 'CAM_02 - Công viên Bạch Đằng (Trung tâm)',
    assetName: 'Ghế đá nghệ thuật 12',
    assetType: 'bench',
    streamUrl: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600&auto=format&fit=crop&q=60', // Bench in park
  },
  {
    id: 'mon-03',
    camCode: 'CAM_03',
    name: 'CAM_03 - Đường Bạch Đằng (Bắc)',
    assetName: 'Thùng rác thông minh 08',
    assetType: 'trash_can',
    streamUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=60', // City street
  },
  {
    id: 'mon-04',
    camCode: 'CAM_04',
    name: 'CAM_04 - Phố đi bộ An Thượng',
    assetName: 'Nhà vệ sinh công cộng 02',
    assetType: 'toilet',
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
  
  const [editingCode, setEditingCode] = useState(null); // id of monitor currently editing its code
  const [inputCode, setInputCode] = useState('');
  const [snapshots, setSnapshots] = useState({}); // { [monId]: base64DataUrl }
  const [shutter, setShutter] = useState({}); // { [monId]: boolean } (camera shutter flash effect)
  
  // Ref managers
  const canvasRefs = useRef({});
  const webcamStreams = useRef({}); // { monId: MediaStream }
  const webcamVideos = useRef({}); // { monId: HTMLVideoElement }
  const activeImages = useRef({}); // { monId: HTMLImageElement } (persist to prevent flickering)

  // AI Evaluation Center states
  const { assets, fetchAssets, loading: assetsLoading } = useAssetsStore();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadBase64, setUploadBase64] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestedStatus, setSuggestedStatus] = useState('active');
  const [qualityScore, setQualityScore] = useState(100);
  const [saving, setSaving] = useState(false);

  // Fetch all assets on page mount to list in selector dropdown
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Cleanup all active webcams on page unmount
  useEffect(() => {
    return () => {
      Object.keys(webcamStreams.current).forEach(id => {
        if (webcamStreams.current[id]) {
          webcamStreams.current[id].getTracks().forEach(t => t.stop());
        }
      });
    };
  }, []);

  // Flicker-free canvas drawing loop
  useEffect(() => {
    const intervals = [];
    monitors.forEach((m) => {
      const canvas = canvasRefs.current[m.id];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      // Check if image object already exists in the ref, if not create it
      let img = activeImages.current[m.id];
      if (!img) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = m.streamUrl;
        activeImages.current[m.id] = img;
      } else if (img.src !== m.streamUrl) {
        // Only update source if the streamUrl actually changes, avoiding continuous reloading
        img.src = m.streamUrl;
      }

      let frame = 0;
      const draw = () => {
        if (!activePlay[m.id]) return;

        const videoEl = webcamVideos.current[m.id];
        if (m.camCode?.toUpperCase() === 'WEBCAM' && videoEl && videoEl.readyState >= 2) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        } else {
          if (img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          } else {
            // Draw slate connecting background (no flashes or blank screens)
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '12px monospace';
            ctx.fillText('CONNECTING CCTV SOURCE...', canvas.width / 2 - 90, canvas.height / 2);
          }
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

        // Shutter flash visual effect
        if (shutter[m.id]) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        frame++;
      };

      const startDraw = () => {
        const id = setInterval(draw, 100);
        intervals.push(id);
      };

      // Run drawing loop immediately
      startDraw();
    });

    return () => intervals.forEach(clearInterval);
  }, [monitors, activePlay, shutter]);

  // Capture canvas current frame (base64)
  const captureSnapshot = (monId) => {
    const canvas = canvasRefs.current[monId];
    if (!canvas) return;

    // Trigger visual flash
    setShutter(prev => ({ ...prev, [monId]: true }));
    setTimeout(() => {
      setShutter(prev => ({ ...prev, [monId]: false }));
    }, 150);

    try {
      const dataUrl = canvas.toDataURL('image/jpeg');
      setSnapshots(prev => ({ ...prev, [monId]: dataUrl }));
      toast.success('Đã chụp ảnh màn hình camera!', { icon: '📸' });
    } catch (err) {
      toast.error('Không thể chụp ảnh: ' + err.message);
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

  const handleUpdateCamCode = (monId, newCode) => {
    let updatedStreamUrl = null;

    if (newCode.toUpperCase() === 'WEBCAM') {
      toast.success('Đã cấu hình mã nguồn Webcam. Nhấn nút tam giác (▶) để bắt đầu truyền hình ảnh.');
    } else if (newCode.startsWith('http://') || newCode.startsWith('https://')) {
      updatedStreamUrl = newCode;
      toast.success('Đã lưu địa chỉ hình ảnh tùy chỉnh.');
    } else {
      const original = INITIAL_MONITORS.find(m => m.id === monId);
      updatedStreamUrl = original ? original.streamUrl : null;
      toast.success(`Đã lưu mã camera nguồn.`);
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

  const togglePlay = async (id) => {
    const nextPlayState = !activePlay[id];
    
    if (nextPlayState) {
      const m = monitors.find(x => x.id === id);
      if (m.camCode?.toUpperCase() === 'WEBCAM') {
        const loadToast = toast.loading('Đang khởi động camera của bạn...');
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Trình duyệt của bạn không hỗ trợ hoặc kết nối không bảo mật (HTTP).');
          }
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const videoEl = document.createElement('video');
          videoEl.srcObject = stream;
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.play();
          
          webcamStreams.current[id] = stream;
          webcamVideos.current[id] = videoEl;
          
          toast.success('Đã phát trực tiếp luồng Webcam!', { id: loadToast });
        } catch (err) {
          const cleanErr = err.message || '';
          const isSecurity = !navigator.mediaDevices || cleanErr.includes('getUserMedia') || cleanErr.includes('Origin') || cleanErr.includes('undefined');
          const friendlyMsg = isSecurity
            ? 'Không thể khởi động thiết bị camera. Đảm bảo bạn đang truy cập qua kết nối bảo mật (localhost hoặc HTTPS) và đã cấp quyền.'
            : 'Không thể truy cập camera. Vui lòng kiểm tra lại thiết bị kết nối.';
          
          toast.error(friendlyMsg, { id: loadToast, duration: 5000 });
          return;
        }
      }
    } else {
      stopWebcam(id);
    }
    
    setActivePlay(prev => ({ ...prev, [id]: nextPlayState }));
  };

  // Convert uploaded image to Base64 preview
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadFile(file);
    setAiResult(null);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Dedicated AI Center Evaluation
  const handleAICenterAudit = async () => {
    if (!uploadFile) {
      toast.error('Vui lòng tải ảnh hiện trạng lên trước!');
      return;
    }
    
    setAiLoading(true);
    setAiResult(null);
    const loadToast = toast.loading('Đang chạy phân tích YOLOv8...');
    
    try {
      const { data } = await aiAPI.classify(uploadFile);
      setAiResult(data);
      
      let score = 95;
      let status = 'active';
      
      const isDefect = data.primary_class && data.primary_class !== 'unknown' && data.primary_class !== 'none';
      if (isDefect) {
        const confidence = data.confidence || 0.8;
        score = Math.round(100 - (confidence * 60) - (Math.random() * 5));
        score = Math.max(10, Math.min(65, score)); // Clamp between 10% and 65%
        
        if (score < 60) {
          status = 'damaged';
        } else {
          status = 'maintenance';
        }
      } else {
        score = Math.round(90 + Math.random() * 9);
        status = 'active';
      }
      
      setQualityScore(score);
      setSuggestedStatus(status);
      toast.success('Kiểm định chất lượng AI hoàn tất!', { id: loadToast });
    } catch (err) {
      toast.error('Lỗi kết nối model, vui lòng thử lại sau', { id: loadToast });
      setAiResult(null);
    } finally {
      setAiLoading(false);
    }
  };

  // Save base64 image and status to backend
  const handleUpdateAssetStatus = async () => {
    if (!selectedAssetId) {
      toast.error('Vui lòng chọn tài sản cần cập nhật!');
      return;
    }
    
    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) {
      toast.error('Không tìm thấy tài sản công cộng.');
      return;
    }
    
    setSaving(true);
    const loadToast = toast.loading('Đang cập nhật trạng thái tài sản...');
    
    try {
      const updatedMetadata = {
        ...(asset.metadata || {}),
        status_image: uploadBase64
      };
      
      await assetsAPI.update(selectedAssetId, {
        status: suggestedStatus,
        metadata: updatedMetadata
      });
      
      toast.success(`Đã cập nhật trạng thái tài sản "${asset.name}" thành công!`, { id: loadToast });
      
      // Re-fetch assets in store to instantly sync 2D and 3D maps
      await fetchAssets();
      
      // Clean reset form state
      setSelectedAssetId('');
      setUploadFile(null);
      setUploadBase64(null);
      setAiResult(null);
      setQualityScore(100);
      setSuggestedStatus('active');
    } catch (err) {
      toast.error('Không thể cập nhật tài sản: ' + getErrorMessage(err), { id: loadToast });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={20} className="text-primary" /> Giám sát Camera & Đánh giá AI
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Giám sát trực quan camera thông minh. Bấm nút Chụp ảnh để chụp tĩnh luồng stream và tải hình ảnh chất lượng cao về máy tính.
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

      {/* Camera Monitors Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 20 }}>
        {monitors.map((m) => {
          const isPlay = activePlay[m.id];
          
          return (
            <div key={m.id} className="card" style={{
              padding: 0,
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
              position: 'relative'
            }}>
              {/* Card Header */}
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
                      {isPlay ? (
                        <button 
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'not-allowed', padding: 0, display: 'inline-flex', alignItems: 'center', opacity: 0.35 }}
                          onClick={() => toast.error('Vui lòng tạm dừng luồng phát camera (Pause Stream) trước khi cấu hình mã nguồn.')}
                          title="Vui lòng tạm dừng phát để đổi mã"
                        >
                          <Edit2 size={10} />
                        </button>
                      ) : (
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
                      )}
                    </div>
                  )}
                </div>
                
                {/* Control Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => togglePlay(m.id)} className="btn btn-sm btn-secondary" title={isPlay ? "Tạm dừng stream" : "Phát stream"} style={{ padding: 6 }}>
                    {isPlay ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button 
                    onClick={() => captureSnapshot(m.id)} 
                    disabled={!isPlay} 
                    className="btn btn-sm btn-primary" 
                    title="Chụp ảnh tức thời từ Monitor" 
                    style={{ padding: '6px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Camera size={11} /> Chụp ảnh
                  </button>
                </div>
              </div>

              {/* Monitor Screen Container */}
              <div style={{ position: 'relative', width: '100%', height: 260, background: '#090d16' }}>
                <canvas
                  ref={(el) => { canvasRefs.current[m.id] = el; }}
                  width={560}
                  height={320}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* Paused Stream Overlay */}
                {!isPlay && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(9, 13, 22, 0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-muted)'
                  }}>
                    <Pause size={32} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>PAUSED STREAM</span>
                  </div>
                )}

                {/* Shutter Snapshot Preview Overlay */}
                {snapshots[m.id] && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(9, 13, 22, 0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                    zIndex: 20,
                    backdropFilter: 'blur(8px)'
                  }}>
                    <h5 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Camera size={14} /> Ảnh chụp từ {m.camCode}
                    </h5>
                    <img 
                      src={snapshots[m.id]} 
                      alt="Snapshot preview" 
                      style={{ width: '100%', maxHeight: 130, objectFit: 'contain', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', marginBottom: 12 }} 
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a 
                        href={snapshots[m.id]} 
                        download={`CCTV_${m.camCode}_${new Date().toISOString().slice(0,10)}.jpg`}
                        className="btn btn-sm btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', padding: '6px 10px', fontSize: 11 }}
                      >
                        <Download size={11} /> Lưu ảnh
                      </a>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: 11 }}
                        onClick={() => setSnapshots(prev => {
                          const next = { ...prev };
                          delete next[m.id];
                          return next;
                        })}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Info Footer */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderTop: '1px solid var(--border-color)', fontSize: 12
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Độ phân giải: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>1080p (FHD)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: isPlay ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: isPlay ? 'var(--accent-green)' : 'var(--text-muted)',
                      display: 'inline-block',
                      animation: isPlay ? 'pulse 1.5s infinite' : 'none'
                    }} />
                    {isPlay ? 'ONLINE FEED' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '40px 0' }} />

      {/* Trung tâm Đánh giá & Kiểm định chất lượng AI */}
      <div className="card" style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius)',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '40px'
      }}>
        {/* Header Block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid var(--accent-cyan)',
            padding: 8,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)'
          }}>
            <Shield size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              🔍 Trung tâm Đánh giá & Kiểm định chất lượng AI
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Kiểm định và đánh giá chất lượng tài sản thông qua ảnh hiện trạng thực tế. Nhận diện lỗi bằng AI YOLOv8 và đồng bộ hóa trạng thái tài sản thời gian thực lên hệ thống bản đồ GIS.
            </p>
          </div>
        </div>

        {/* Section Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 12 }}>
          
          {/* Left Column: Input Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Dropdown: Select Asset */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>1. Chọn tài sản cần kiểm định</label>
              {assetsLoading ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang tải danh sách tài sản...</div>
              ) : (
                <select
                  className="form-input"
                  value={selectedAssetId}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value);
                    // Clear previous state when asset selection changes
                    setUploadFile(null);
                    setUploadBase64(null);
                    setAiResult(null);
                  }}
                  style={{ width: '100%', height: 40 }}
                >
                  <option value="">-- Chọn tài sản công cộng --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.asset_type_display}) - [{a.status_display}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Area: Drag & Drop Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>2. Tải ảnh hiện trạng tài sản</label>
              
              <div style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius)',
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--bg-elevated)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                  setUploadFile(file);
                  setAiResult(null);
                  const reader = new FileReader();
                  reader.onloadend = () => setUploadBase64(reader.result);
                  reader.readAsDataURL(file);
                }
              }}
              onClick={() => document.getElementById('asset-file-uploader').click()}
              >
                <input
                  id="asset-file-uploader"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                
                {uploadBase64 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <img 
                      src={uploadBase64} 
                      alt="Uploaded preview" 
                      style={{ maxHeight: 150, maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {uploadFile?.name} ({(uploadFile?.size / 1024).toFixed(1)} KB)
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--accent-cyan)' }}>Nhấp để chọn ảnh khác</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                    <Upload size={32} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Kéo thả hoặc nhấp để tải ảnh lên</span>
                    <span style={{ fontSize: 11 }}>Chấp nhận định dạng PNG, JPG, JPEG</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action: Run Audit */}
            <button
              onClick={handleAICenterAudit}
              disabled={aiLoading || !uploadFile}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 600
              }}
            >
              <RefreshCw size={16} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'Đang phân tích...' : 'Chạy AI kiểm định'}
            </button>

          </div>

          {/* Right Column: AI Results */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: 280
          }}>
            
            {aiLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <RefreshCw size={36} className="text-primary animate-spin" />
                <div>
                  <h5 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Đang chạy phân tích chất lượng...</h5>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Mô hình YOLOv8 đang quét hình ảnh bất thường.</p>
                </div>
              </div>
            )}

            {!aiLoading && !aiResult && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileCheck size={40} style={{ opacity: 0.5 }} />
                <div>
                  <h5 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Chưa có dữ liệu kiểm định</h5>
                  <p style={{ fontSize: 12, margin: '4px 0 0 0' }}>Vui lòng chọn tài sản, tải ảnh hiện trạng và bấm "Chạy AI kiểm định".</p>
                </div>
              </div>
            )}

            {!aiLoading && aiResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-color)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={16} /> Kết quả nhận diện AI
                </h4>
                
                {/* Information Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sự cố phát hiện:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {aiResult.primary_class === 'broken_lamp' && 'Đèn chiếu sáng bị hỏng / vỡ'}
                      {aiResult.primary_class === 'pothole' && 'Mặt đường nứt vỡ / ổ gà'}
                      {aiResult.primary_class === 'vandalism' && 'Hành vi phá hoại / vẽ bậy'}
                      {aiResult.primary_class === 'littering' && 'Rác thải không đúng nơi quy định'}
                      {aiResult.primary_class === 'flooding' && 'Ngập nước cục bộ'}
                      {aiResult.primary_class === 'crowd' && 'Tập trung đông người trái phép'}
                      {aiResult.primary_class === 'unknown' && 'Bình thường (Không phát hiện lỗi)'}
                      {aiResult.primary_class === 'none' && 'Bình thường (Không phát hiện lỗi)'}
                      {!['broken_lamp', 'pothole', 'vandalism', 'littering', 'flooding', 'crowd', 'unknown', 'none'].includes(aiResult.primary_class) && `Sự cố khác (${aiResult.primary_class})`}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Độ tự tin của AI:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {(aiResult.confidence * 100).toFixed(1)}%
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Chất lượng đánh giá:</span>
                      <strong style={{
                        color: qualityScore >= 85 ? 'var(--accent-green)' : qualityScore >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)',
                        fontSize: 14
                      }}>
                        {qualityScore}%
                      </strong>
                    </div>
                    {/* Quality progress bar */}
                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${qualityScore}%`,
                        height: '100%',
                        borderRadius: 3,
                        transition: 'width 0.4s ease',
                        background: qualityScore >= 85 ? 'var(--accent-green)' : qualityScore >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Confirm & Save block */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Trạng thái tài sản đề xuất</label>
                    <select
                      className="form-input"
                      value={suggestedStatus}
                      onChange={(e) => setSuggestedStatus(e.target.value)}
                      style={{ width: '100%', height: 36, fontSize: 13 }}
                    >
                      <option value="active">🟢 Hoạt động (Bình thường)</option>
                      <option value="maintenance">🟡 Đang bảo trì</option>
                      <option value="damaged">🔴 Hư hỏng</option>
                    </select>
                  </div>

                  <button
                    onClick={handleUpdateAssetStatus}
                    disabled={saving || !selectedAssetId}
                    className="btn btn-success"
                    style={{
                      width: '100%',
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontWeight: 600,
                      background: 'var(--accent-green)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowUpRight size={16} />
                    Xác nhận & Cập nhật Trạng thái Tài sản
                  </button>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
