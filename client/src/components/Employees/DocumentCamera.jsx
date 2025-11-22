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
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const logsRef = useRef([]);

  // Функция логирования
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(logEntry);
    logsRef.current = [...logsRef.current, { message: logEntry, type }];
    
    // Сохраняем последние 50 логов
    if (logsRef.current.length > 50) {
      logsRef.current = logsRef.current.slice(-50);
    }
    
    setLogs([...logsRef.current]);
  };

  // Инициализация (без внешних библиотек)
  useEffect(() => {
    addLog('✅ Инициализация завершена');
    setCvReady(true);

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
      addLog('🎥 Инициализация камеры...');

      // Проверяем поддержку API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const msg = 'Ваш браузер не поддерживает работу с камерой';
        addLog('❌ ' + msg, 'error');
        message.error(msg);
        onCancel();
        return;
      }

      // Запрашиваем доступ к камере (браузер покажет стандартное окно запроса)
      addLog('📱 Запрос доступа к камере...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Задняя камера на мобильных
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      stream.current = mediaStream;
      addLog('✅ Доступ к камере получен');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        addLog('🎬 Видео элемент инициализирован');
        
        // На мобильных устройствах добавляем небольшую задержку перед запуском обработки
        const startProcessing = () => {
          // Проверяем, что видео готово к воспроизведению
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            addLog(`📐 Размер видео: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
            addLog('🎯 Запуск обработки видеопотока');
            processVideoFrame();
          } else {
            setTimeout(startProcessing, 100);
          }
        };
        
        startProcessing();
      }
    } catch (error) {
      addLog(`❌ Ошибка: ${error.name} - ${error.message}`, 'error');
      
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

  // Обработка видеопотока - рисуем рамку подсказки
  const processVideoFrame = () => {
    if (!canvasRef.current) {
      addLog('❌ Canvas отсутствует', 'error');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let frameCount = 0;

    const processFrame = () => {
      // Проверяем, что поток активен
      if (!stream.current) return;

      // Проверяем размеры контейнера
      const containerHeight = canvas.parentElement?.offsetHeight || 0;
      const containerWidth = canvas.parentElement?.offsetWidth || 0;

      if (containerWidth <= 0 || containerHeight <= 0) {
        requestAnimationFrame(processFrame);
        return;
      }

      // Устанавливаем размер canvas по размеру контейнера
      if (canvas.width !== containerWidth || canvas.height !== containerHeight) {
        canvas.width = containerWidth;
        canvas.height = containerHeight;
      }

      try {
        // Очищаем canvas (прозрачный)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Рисуем зелёный контур в центре как подсказка
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        
        const margin = 30;
        const x = margin;
        const y = margin;
        const w = canvas.width - 2 * margin;
        const h = canvas.height - 2 * margin;
        
        ctx.rect(x, y, w, h);
        ctx.stroke();

        // Добавляем углы (особо выделены)
        ctx.fillStyle = '#00ff00';
        const cornerSize = 10;
        
        // Верхний левый угол
        ctx.fillRect(x, y, cornerSize, cornerSize);
        
        // Верхний правый угол
        ctx.fillRect(x + w - cornerSize, y, cornerSize, cornerSize);
        
        // Нижний левый угол
        ctx.fillRect(x, y + h - cornerSize, cornerSize, cornerSize);
        
        // Нижний правый угол
        ctx.fillRect(x + w - cornerSize, y + h - cornerSize, cornerSize, cornerSize);

        // Добавляем текст подсказки с чёрным контуром для лучшей видимости
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Рисуем чёрный текст с контуром
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            if (i !== 0 || j !== 0) {
              ctx.fillText('Поместите документ в рамку', canvas.width / 2 + i, y - 15 + j);
            }
          }
        }
        
        // Рисуем зелёный текст сверху
        ctx.fillStyle = '#00ff00';
        ctx.fillText('Поместите документ в рамку', canvas.width / 2, y - 15);

        if (frameCount === 0) {
          addLog(`📹 Рамка отображается: ${canvas.width}x${canvas.height}`);
        }
      } catch (error) {
        addLog(`❌ Ошибка отрисовки: ${error.message}`, 'error');
      }

      frameCount++;
      requestAnimationFrame(processFrame);
    };

    addLog('🎯 Запуск отображения рамки');
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
        height: '70vh', // Высота 70% от viewport
        background: '#000'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: loading ? 'none' : 'block',
            zIndex: 1
          }}
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
            display: loading ? 'none' : 'block',
            zIndex: 2
          }}
        />
      </div>

      <div style={{
        padding: 16,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{
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

        {/* Кнопки управления логами */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Button
            type="dashed"
            size="small"
            onClick={() => setShowLogs(!showLogs)}
            style={{ fontSize: 12 }}
          >
            {showLogs ? '🔽 Скрыть логи' : '▶ Показать логи'}
          </Button>
          <Button
            type="dashed"
            size="small"
            onClick={() => {
              const logsText = logs.map(log => log.message).join('\n');
              navigator.clipboard.writeText(logsText).then(() => {
                message.success('Логи скопированы в буфер обмена');
              }).catch(() => {
                message.error('Ошибка копирования логов');
              });
            }}
            disabled={logs.length === 0}
            style={{ fontSize: 12 }}
          >
            📋 Скопировать логи
          </Button>
        </div>

        {/* Панель с логами */}
        {showLogs && (
          <div style={{
            background: '#1f1f1f',
            color: '#00ff00',
            padding: 12,
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'monospace',
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid #444'
          }}>
            {logs.length === 0 ? (
              <div>Логи отсутствуют</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} style={{
                  color: log.type === 'error' ? '#ff6b6b' : '#00ff00',
                  marginBottom: 4,
                  lineHeight: '1.4'
                }}>
                  {log.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DocumentCamera;

