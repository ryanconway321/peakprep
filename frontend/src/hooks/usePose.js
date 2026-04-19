import { useEffect, useRef, useState } from 'react';

const POSE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js';
const POSE_FILES = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * Loads MediaPipe Pose, starts the camera, and calls onResults each frame.
 * Returns { poseDetected, camError, videoRef, status }
 *
 * status: 'loading' | 'ready' | 'error'
 */
export function usePose(onResults) {
  const videoRef = useRef(null);
  const [poseDetected, setPoseDetected] = useState(false);
  const [camError, setCamError]         = useState(false);
  const [status, setStatus]             = useState('loading');

  useEffect(() => {
    let stream  = null;
    let running = true;

    async function init() {
      try {
        await loadScript(POSE_CDN);

        const pose = new window.Pose({
          locateFile: f => `${POSE_FILES}${f}`,
        });
        pose.setOptions({
          modelComplexity:    0,   // 0 = lite — fastest, good enough
          smoothLandmarks:    true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence:  0.5,
        });

        pose.onResults(results => {
          const detected = !!(results.poseLandmarks?.length);
          setPoseDetected(detected);
          onResults(results);
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 320, height: 240 },
          audio: false,
        });
        const video = videoRef.current;
        video.srcObject = stream;
        await new Promise(resolve => { video.onloadedmetadata = resolve; });
        await video.play();

        setStatus('ready');

        async function processFrames() {
          while (running) {
            if (!video.paused && !video.ended) {
              await pose.send({ image: video });
            }
            await new Promise(r => setTimeout(r, 100)); // ~10fps
          }
        }
        processFrames();
      } catch {
        setCamError(true);
        setStatus('error');
      }
    }

    init();

    return () => {
      running = false;
      stream?.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { poseDetected, camError, status, videoRef };
}
