import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Button, Space, Spin, message, Alert, Switch } from 'antd';
import { CameraOutlined, CheckOutlined, CloseOutlined, RotateRightOutlined, SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';
import Webcam from 'react-webcam';

/**
 * Модальное окно для сканирования документов
 * Использует OpenCV.js напрямую для автоматического поиска границ
 */
export const DocumentScannerModal = ({ visible, onCapture, onCancel }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const lastContourRef = useRef(null);
  const stableCounterRef = useRef(0);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cvReady, setCvReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [error, setError] = useState(null);
  const [autoCapture, setAutoCapture] = useState(false);
  const [isStable, setIsStable] = useState(false);
  
  // Константы для анализа видеопотока
  const ANALYSIS_WIDTH = 480;

  useEffect(() => {
    if (visible && !window.cv) {
      setLoading(true);
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      script.onload = () => {
        if (window.cv.getBuildInformation) {
            setCvReady(true);
            setLoading(false);
        } else {
            window.cv.onRuntimeInitialized = () => {
                setCvReady(true);
                setLoading(false);
            };
        }
      };
      script.onerror = () => {
        setError('Не удалось загрузить библиотеку обработки изображений (OpenCV). Проверьте подключение к интернету.');
        setLoading(false);
      };
      document.body.appendChild(script);
    } else if (visible && window.cv) {
      setCvReady(true);
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setCapturedImage(null);
      setProcessedImage(null);
      setError(null);
      lastContourRef.current = null;
      stableCounterRef.current = 0;
      setIsStable(false);
    }
  }, [visible]);

  const takePhoto = useCallback(async () => {
    if (!webcamRef.current) return;
    
    try {
      setProcessing(true);
      const videoEl = webcamRef.current.video;
      const videoWidth = videoEl.videoWidth;
      const videoHeight = videoEl.videoHeight;
      
      let savedContourData = null;
      if (lastContourRef.current) {
          const data32S = lastContourRef.current.data32S;
          if (data32S) {
             // Нормализуем координаты (0..1) относительно ширины/высоты анализа
             // Высота превью рассчитывалась как videoHeight * (ANALYSIS_WIDTH / videoWidth)
             const previewHeight = Math.floor(videoHeight * (ANALYSIS_WIDTH / videoWidth));
             
             savedContourData = [];
             for(let i = 0; i < data32S.length; i += 2) {
                 savedContourData.push(data32S[i] / ANALYSIS_WIDTH); // x нормализованный
                 savedContourData.push(data32S[i+1] / previewHeight); // y нормализованный
             }
          }
      }

      const imageSrc = webcamRef.current.getScreenshot({
        width: videoWidth,
        height: videoHeight
      });
      
      setCapturedImage(imageSrc);

      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        try {
            const resultDataUrl = cropDocumentWithNormalizedContour(img, savedContourData, videoWidth, videoHeight);
            setProcessedImage(resultDataUrl);
            setProcessing(false);
        } catch (e) {
          console.error('Ошибка обработки с сохраненным контуром:', e);
          try {
             const retryResult = findAndCropDocument(img);
             setProcessedImage(retryResult);
          } catch (retryError) {
             console.warn('Повторный поиск не дал результатов:', retryError);
             message.warning('Не удалось найти границы документа. Сохранено как есть.');
             setProcessedImage(imageSrc);
          }
          setProcessing(false);
        }
      };
    } catch (err) {
      console.error(err);
      message.error('Ошибка при захвате изображения');
      setProcessing(false);
    }
  }, [webcamRef]); 

  // Новая функция обрезки через нормализованные координаты
  const cropDocumentWithNormalizedContour = (imgElement, normalizedContour, originalWidth, originalHeight) => {
      const cv = window.cv;
      const src = cv.imread(imgElement);
      
      if (!normalizedContour || normalizedContour.length !== 8) {
          src.delete();
          throw new Error("Нет сохраненного контура");
      }

      try {
          const corners = [];
          for (let i = 0; i < 4; i++) {
              corners.push({ 
                  x: normalizedContour[i * 2] * originalWidth, 
                  y: normalizedContour[i * 2 + 1] * originalHeight 
              });
          }

          // Надежная сортировка углов
          const center = corners.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
          center.x /= 4;
          center.y /= 4;

          const topPoints = corners.filter(p => p.y < center.y).sort((a, b) => a.x - b.x);
          const bottomPoints = corners.filter(p => p.y >= center.y).sort((a, b) => a.x - b.x);

          let tl, tr, br, bl;

          if (topPoints.length === 2 && bottomPoints.length === 2) {
              tl = topPoints[0];
              tr = topPoints[1];
              bl = bottomPoints[0];
              br = bottomPoints[1];
          } else {
              const sum = corners.map(p => p.x + p.y);
              const diff = corners.map(p => p.y - p.x);
              tl = corners[sum.indexOf(Math.min(...sum))];
              br = corners[sum.indexOf(Math.max(...sum))];
              tr = corners[diff.indexOf(Math.min(...diff))];
              bl = corners[diff.indexOf(Math.max(...diff))];
          }

          const widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
          const widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
          const maxWidth = Math.max(widthA, widthB);

          const heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2));
          const heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2));
          const maxHeight = Math.max(heightA, heightB);
          
          const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
          const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight]);
          
          const M = cv.getPerspectiveTransform(srcTri, dstTri);
          const dst = new cv.Mat();
          
          cv.warpPerspective(src, dst, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
          
          const outputCanvas = document.createElement('canvas');
          cv.imshow(outputCanvas, dst);
          
          src.delete(); dst.delete(); M.delete(); srcTri.delete(); dstTri.delete();
          
          return outputCanvas.toDataURL('image/jpeg', 0.9);

      } catch (e) {
          src.delete();
          throw e;
      }
  };

  useEffect(() => {
    let intervalId;
    
    const detectDocument = () => {
      if (!webcamRef.current || !webcamRef.current.video || !cvReady || capturedImage || processing) return;

      try {
        const video = webcamRef.current.video;
        if (video.readyState !== 4) return;

        const cv = window.cv;
        const width = ANALYSIS_WIDTH; 
        const height = Math.floor(video.videoHeight * (width / video.videoWidth));
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(video, 0, 0, width, height);
        
        const src = cv.imread(tempCanvas);
        const gray = new cv.Mat();
        const blur = new cv.Mat();
        const edged = new cv.Mat();
        
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        // Уменьшаем размытие для сохранения деталей (5x5)
        cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        
        // Усиливаем морфологию (5x5) для лучшего закрытия разрывов
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
        cv.morphologyEx(blur, blur, cv.MORPH_CLOSE, kernel);
        
        // Экстремально низкие пороги Canny для Low Contrast
        cv.Canny(blur, edged, 30, 100);
        
        // Увеличенная дилатация для толстых линий
        const dilateKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
        cv.dilate(edged, edged, dilateKernel);
        
        kernel.delete();
        dilateKernel.delete();
        
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
        
        let maxArea = 0;
        let bestContour = null;
        
        for (let i = 0; i < contours.size(); ++i) {
          const contour = contours.get(i);
          const area = cv.contourArea(contour);
          
          if (area < (width * height) / 20) continue; 
          
          const peri = cv.arcLength(contour, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(contour, approx, 0.03 * peri, true);
          
          if (area > maxArea && approx.rows >= 4 && approx.rows <= 6 && cv.isContourConvex(approx)) {
             if (approx.rows === 4) {
                 maxArea = area;
                 if (bestContour) bestContour.delete();
                 bestContour = approx;
             } else {
                 const roughApprox = new cv.Mat();
                 cv.approxPolyDP(contour, roughApprox, 0.05 * peri, true);
                 if (roughApprox.rows === 4) {
                     maxArea = area;
                     if (bestContour) bestContour.delete();
                     bestContour = roughApprox;
                 } else {
                     roughApprox.delete();
                     approx.delete();
                 }
             }
          } else {
             approx.delete();
          }
        }

        let contourToDraw = null;
        
        if (bestContour) {
            if (lastContourRef.current) lastContourRef.current.delete();
            lastContourRef.current = bestContour.clone(); 
            contourToDraw = bestContour;
            stableCounterRef.current += 1;
        } else {
            if (stableCounterRef.current > 0) {
                stableCounterRef.current -= 1; 
                if (stableCounterRef.current > 0 && lastContourRef.current) {
                    contourToDraw = lastContourRef.current;
                }
            }
        }

        const isVeryStable = stableCounterRef.current > 8; 
        setIsStable(isVeryStable);

        if (autoCapture && isVeryStable && !processing && !capturedImage) {
            takePhoto();
        }

        const overlayCanvas = canvasRef.current;
        if (overlayCanvas) {
            overlayCanvas.width = video.clientWidth;
            overlayCanvas.height = video.clientHeight;
            const ctxOverlay = overlayCanvas.getContext('2d');
            ctxOverlay.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

            if (contourToDraw) {
                const scaleX = overlayCanvas.width / width;
                const scaleY = overlayCanvas.height / height;

                ctxOverlay.beginPath();
                ctxOverlay.strokeStyle = isVeryStable ? '#00ff00' : '#faad14'; 
                ctxOverlay.lineWidth = 3;

                const data = contourToDraw.data32S;
                ctxOverlay.moveTo(data[0] * scaleX, data[1] * scaleY);
                for (let i = 2; i < data.length; i += 2) {
                    ctxOverlay.lineTo(data[i] * scaleX, data[i + 1] * scaleY);
                }
                ctxOverlay.closePath();
                ctxOverlay.stroke();

                ctxOverlay.fillStyle = isVeryStable ? 'rgba(0, 255, 0, 0.2)' : 'rgba(250, 173, 20, 0.1)';
                ctxOverlay.fill();
            }
        }
        
        src.delete(); gray.delete(); blur.delete(); edged.delete();
        contours.delete(); hierarchy.delete();
        if (bestContour) bestContour.delete();
        
      } catch (e) {
          console.error(e);
      }
    };

    if (cvReady && !capturedImage) {
        intervalId = setInterval(detectDocument, 200);
    }

    return () => {
        if (intervalId) clearInterval(intervalId);
        if (lastContourRef.current) {
             lastContourRef.current.delete();
             lastContourRef.current = null;
        }
    };
  }, [cvReady, capturedImage, autoCapture, processing, takePhoto]);

  const findAndCropDocument = (imgElement) => {
    try {
      const cv = window.cv;
      const src = cv.imread(imgElement);
      const gray = new cv.Mat();
      const blur = new cv.Mat();
      const edged = new cv.Mat();
      
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      cv.morphologyEx(blur, blur, cv.MORPH_CLOSE, kernel);
      
      cv.Canny(blur, edged, 30, 100);
      const dilateKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      cv.dilate(edged, edged, dilateKernel);
      
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      
      let maxArea = 0;
      let docContour = null;
      
      for (let i = 0; i < contours.size(); ++i) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        
        if (area < 50000) continue;
        
        const peri = cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.03 * peri, true);
        
        if (approx.rows === 4 && area > maxArea) {
          maxArea = area;
          if (docContour) docContour.delete();
          docContour = approx;
        } else {
            const roughApprox = new cv.Mat();
            cv.approxPolyDP(contour, roughApprox, 0.05 * peri, true);
            if (roughApprox.rows === 4 && area > maxArea) {
                 maxArea = area;
                 if (docContour) docContour.delete();
                 docContour = roughApprox;
            } else {
                roughApprox.delete();
                approx.delete();
            }
        }
      }
      
      gray.delete(); blur.delete(); edged.delete(); contours.delete(); hierarchy.delete();
      kernel.delete(); dilateKernel.delete();

      if (!docContour) {
        src.delete();
        throw new Error("Документ не найден");
      }
      
      const corners = [];
      for (let i = 0; i < 4; i++) {
         corners.push({ x: docContour.data32S[i * 2], y: docContour.data32S[i * 2 + 1] });
      }
      docContour.delete();
      
      const sum = corners.map(p => p.x + p.y);
      const diff = corners.map(p => p.y - p.x);
      
      const tl = corners[sum.indexOf(Math.min(...sum))];
      const br = corners[sum.indexOf(Math.max(...sum))];
      const tr = corners[diff.indexOf(Math.min(...diff))];
      const bl = corners[diff.indexOf(Math.max(...diff))];
      
      const widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
      const widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
      const maxWidth = Math.max(widthA, widthB);

      const heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2));
      const heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2));
      const maxHeight = Math.max(heightA, heightB);
      
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight]);
      
      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      const dst = new cv.Mat();
      
      cv.warpPerspective(src, dst, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
      
      const outputCanvas = document.createElement('canvas');
      cv.imshow(outputCanvas, dst);
      
      src.delete(); dst.delete(); M.delete(); srcTri.delete(); dstTri.delete();
      
      return outputCanvas.toDataURL('image/jpeg', 0.9);
      
    } catch (e) {
      console.error("OpenCV error: ", e);
      throw e;
    }
  };

  const handleCapture = useCallback(() => {
      takePhoto();
  }, [takePhoto]);

  const handleSave = () => {
    if (processedImage) {
      fetch(processedImage)
        .then(res => res.blob())
        .then(blob => {
          onCapture(blob);
          onCancel();
        });
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    lastContourRef.current = null;
    stableCounterRef.current = 0;
    setIsStable(false);
  };

  return (
    <Modal
      title="Сканирование документа"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
      styles={{ body: { padding: 0 } }}
      destroyOnClose
    >
      <div style={{ minHeight: 400, background: '#000', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        
        {loading && !cvReady && (
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Загрузка модулей компьютерного зрения...</div>
          </div>
        )}

        {error && (
          <div style={{ padding: 20, width: '100%' }}>
             <Alert message="Ошибка" description={error} type="error" showIcon />
          </div>
        )}

        {!capturedImage && !loading && !error && (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: 'environment',
                width: { ideal: 3840 }, 
                height: { ideal: 2160 }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '70vh' }}
            />
            
            <canvas 
                ref={canvasRef}
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    pointerEvents: 'none' 
                }}
            />
            
            <div style={{ 
                position: 'absolute', 
                top: 16, 
                right: 16, 
                background: 'rgba(0,0,0,0.6)', 
                padding: '4px 12px', 
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <span style={{ color: '#fff', fontSize: 12 }}>Авто-съемка</span>
                <Switch 
                    size="small" 
                    checked={autoCapture} 
                    onChange={setAutoCapture} 
                    checkedChildren={<ThunderboltOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                />
            </div>

            {autoCapture && (
                <div style={{
                    position: 'absolute',
                    top: '15%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '6px 16px',
                    borderRadius: 20,
                    background: isStable ? 'rgba(82, 196, 26, 0.8)' : 'rgba(0, 0, 0, 0.5)',
                    color: '#fff',
                    fontSize: 14,
                    transition: 'all 0.3s'
                }}>
                    {isStable ? 'Не двигайте камеру...' : 'Поиск документа...'}
                </div>
            )}

            <div style={{ position: 'absolute', bottom: 20, width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Button 
                type="primary" 
                shape="circle" 
                size="large" 
                icon={<CameraOutlined style={{ fontSize: 32 }} />} 
                style={{ 
                    width: 80, 
                    height: 80, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    border: isStable ? '4px solid #52c41a' : 'none'
                }}
                onClick={handleCapture}
                loading={processing}
              />
            </div>
          </>
        )}

        {processedImage && (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img 
              src={processedImage} 
              alt="Result" 
              style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', margin: 'auto' }} 
            />
            
            <div style={{ padding: 16, width: '100%', background: '#fff', display: 'flex', justifyContent: 'center', gap: 16 }}>
              <Button icon={<RotateRightOutlined />} onClick={handleRetake}>
                Переснять
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                Сохранить
              </Button>
            </div>
          </div>
        )}
        
        {processing && (
           <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
             <Spin size="large" />
             <div style={{ color: '#fff', marginTop: 16 }}>Обработка и поиск границ...</div>
           </div>
        )}
      </div>
    </Modal>
  );
};
