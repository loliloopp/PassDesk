import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Space, App, Spin, message as antMessage } from 'antd';
import { CameraOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';

/**
 * Компонент камеры с режимом документа
 * Использует OpenCV.js для детектирования границ документа в реальном времени
 * 
 * @param {boolean} visible - Видимость модального окна
 * @param {function} onCapture - Callback при захвате фото (передает Blob)
 * @param {function} onCancel - Callback при отмене
 */
const DocumentCamera = ({ visible, onCapture, onCancel }) => {
  const { message } = App.useApp();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const stream = useRef(null);
  const [loading, setLoading] = useState(false);
  const [cvReady, setCvReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // Загрузка OpenCV.js
  useEffect(() => {
    if (!window.cv) {
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.5.2/opencv.js';
      script.async = true;
      script.onload = () => {
        setCvReady(true);
      };
      script.onerror = () => {
        message.error('Ошибка загрузки OpenCV.js');
      };
      document.body.appendChild(script);
    } else {
      setCvReady(true);
    }

    return () => {
      // Очистка при размонтировании
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Инициализация камеры
  useEffect(() => {
    if (visible && cvReady && !stream.current) {
      initializeCamera();
    }

    return () => {
      // Остановка камеры при закрытии
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
        stream.current = null;
      }
    };
  }, [visible, cvReady]);

  // Запуск камеры
  const initializeCamera = async () => {
    try {
      setLoading(true);

      // Проверяем поддержку API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        message.error('Ваш браузер не поддерживает работу с камерой');
        onCancel();
        return;
      }

      // Запрашиваем доступ к камере (браузер покажет стандартное окно запроса)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Задняя камера на мобильных
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      stream.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          // Запуск обработки видеопотока
          processVideoFrame();
        };
      }
    } catch (error) {
      console.error('Ошибка доступа к камере:', error);
      
      // Определяем тип ошибки и показываем соответствующее сообщение
      let errorMessage = 'Ошибка доступа к камере';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Доступ к камере запрещён. Разрешите доступ в настройках браузера.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Камера не найдена на устройстве';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Камера уже используется другим приложением';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Камера не соответствует требованиям';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Доступ к камере заблокирован из соображений безопасности';
      }
      
      message.error(errorMessage);
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  // Обработка видеопотока с детектированием документа
  const processVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cvReady || !window.cv) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const processFrame = () => {
      if (!stream.current) return;

      // Устанавливаем размер canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Рисуем видеопоток на canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Получаем данные изображения
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const src = window.cv.matFromImageData(imageData);

      // Конвертируем в серый
      const gray = new window.cv.Mat();
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGB2GRAY);

      // Применяем Gaussian Blur для сглаживания
      const blurred = new window.cv.Mat();
      window.cv.GaussianBlur(gray, blurred, new window.cv.Size(5, 5), 0);

      // Обнаружение контуров через Canny
      const edges = new window.cv.Mat();
      window.cv.Canny(blurred, edges, 50, 150);

      // Дилятация для усиления контуров
      const kernel = window.cv.getStructuringElement(
        window.cv.MORPH_RECT,
        new window.cv.Size(5, 5)
      );
      window.cv.dilate(edges, edges, kernel, new window.cv.Point(-1, -1), 2);

      // Поиск контуров
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();
      window.cv.findContours(edges, contours, hierarchy, window.cv.RETR_TREE, window.cv.CHAIN_APPROX_SIMPLE);

      // Нарисуем исходное видео снова
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Ищем самый большой прямоугольный контур
      let maxArea = 0;
      let documentContour = null;

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = window.cv.contourArea(contour);

        // Фильтруем контуры по размеру
        if (area > maxArea && area > (canvas.width * canvas.height) * 0.1) {
          const peri = window.cv.arcLength(contour, true);
          const approx = window.cv.approxPolyDP(contour, 0.02 * peri, true);

          // Проверяем, что это четырехугольник
          if (approx.rows === 4) {
            maxArea = area;
            documentContour = approx;
          }
        }
      }

      // Рисуем найденный документ зеленым прямоугольником
      if (documentContour) {
        const color = new window.cv.Scalar(0, 255, 0, 255);
        window.cv.polylines(
          src,
          new window.cv.MatVector(documentContour),
          true,
          color,
          3
        );
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Рисуем контур на canvas
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const points = [];
        for (let j = 0; j < documentContour.rows; j++) {
          const x = documentContour.data32F[j * 2];
          const y = documentContour.data32F[j * 2 + 1];
          points.push([x, y]);
          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        if (points.length > 0) {
          ctx.lineTo(points[0][0], points[0][1]);
        }
        ctx.stroke();
      } else {
        // Если документ не найден, рисуем красный контур
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(50, 50, canvas.width - 100, canvas.height - 100);
        ctx.stroke();

        // Добавляем подсказку
        ctx.fillStyle = '#ff0000';
        ctx.font = '16px Arial';
        ctx.fillText('Наведите на документ', 20, 30);
      }

      // Очистка памяти
      src.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      kernel.delete();
      contours.delete();
      hierarchy.delete();

      requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  // Захват фото
  const handleCapture = () => {
    if (!canvasRef.current) return;

    setCapturing(true);
    try {
      canvasRef.current.toBlob((blob) => {
        onCapture(blob);
        setCapturing(false);
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Ошибка захвата фото:', error);
      message.error('Ошибка захвата фото');
      setCapturing(false);
    }
  };

  return (
    <Modal
      title="📸 Фотографирование документа"
      open={visible}
      onCancel={onCancel}
      width="100%"
      style={{ maxWidth: 600, margin: '0 auto' }}
      bodyStyle={{ padding: 0, position: 'relative', background: '#000' }}
      footer={null}
      centered
    >
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          textAlign: 'center',
          padding: 20,
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 8
        }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
            Инициализация камеры...
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            Если появится запрос доступа к камере - разрешите
          </div>
        </div>
      )}

      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '100%', // Соотношение 1:1 для мобильного
        background: '#000'
      }}>
        <video
          ref={videoRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: loading ? 'none' : 'block'
          }}
          playsInline
        />

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cvReady && !loading ? 'block' : 'none'
          }}
        />
      </div>

      <div style={{
        padding: 16,
        background: '#fff',
        display: 'flex',
        justifyContent: 'center',
        gap: 12
      }}>
        <Button
          icon={<CheckOutlined />}
          type="primary"
          size="large"
          loading={capturing}
          onClick={handleCapture}
          disabled={loading || !cvReady}
        >
          Снять фото
        </Button>
        <Button
          icon={<CloseOutlined />}
          size="large"
          onClick={onCancel}
          disabled={loading}
        >
          Отмена
        </Button>
      </div>
    </Modal>
  );
};

export default DocumentCamera;

