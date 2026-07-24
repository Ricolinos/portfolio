"use client";

import { useEffect, useRef, useState } from "react";

interface BoomerangVideoBackgroundProps {
  src: string;
}

const MAX_CAPTURE_WIDTH = 960;
const FRAME_RATE = 30;
// Atenúa el clip para que el texto encima sea legible sin depender de un
// scrim de color (los tokens de tema no sirven aquí: cambian con light/dark).
const VIDEO_FILTER = "brightness(0.55) saturate(0.9)";

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
};

// Captura los frames del clip una vez y los reproduce adelante/atrás en loop:
// un <video> con loop nativo reinicia de golpe, esto da el efecto "boomerang".
export function BoomerangVideoBackground({ src }: BoomerangVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const [framesReady, setFramesReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const frames: HTMLCanvasElement[] = [];
    let capturing = true;
    let lastTime = -1;

    const captureFrame = () => {
      if (!capturing || video.readyState < 2) return;
      if (video.currentTime === lastTime) return;
      lastTime = video.currentTime;

      const { videoWidth: vw, videoHeight: vh } = video;
      if (!vw || !vh) return;

      const scale = Math.min(1, MAX_CAPTURE_WIDTH / vw);
      const width = Math.round(vw * scale);
      const height = Math.round(vh * scale);

      const frame = document.createElement("canvas");
      frame.width = width;
      frame.height = height;
      const ctx = frame.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);
      frames.push(frame);
    };

    const vfcVideo = video as VideoWithFrameCallback;
    const hasFrameCallback = typeof vfcVideo.requestVideoFrameCallback === "function";

    let rafId = 0;
    const rafLoop = () => {
      captureFrame();
      if (capturing) rafId = requestAnimationFrame(rafLoop);
    };
    const frameCallbackLoop = () => {
      captureFrame();
      if (capturing) vfcVideo.requestVideoFrameCallback?.(frameCallbackLoop);
    };

    const handleEnded = () => {
      capturing = false;
      if (frames.length > 0) {
        framesRef.current = frames;
        setFramesReady(true);
      }
    };

    const handleLoaded = () => {
      video.play().catch(() => {});
      if (hasFrameCallback) {
        vfcVideo.requestVideoFrameCallback?.(frameCallbackLoop);
      } else {
        rafId = requestAnimationFrame(rafLoop);
      }
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("ended", handleEnded);
    if (video.readyState >= 1) handleLoaded();

    return () => {
      capturing = false;
      cancelAnimationFrame(rafId);
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  useEffect(() => {
    if (!framesReady) return;
    const canvas = canvasRef.current;
    const frames = framesRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = frames[0].width;
    canvas.height = frames[0].height;

    let index = 0;
    let direction = 1;
    let last = performance.now();
    const interval = 1000 / FRAME_RATE;
    let rafId = 0;

    const render = (now: number) => {
      if (now - last >= interval) {
        last = now;
        ctx.drawImage(frames[index], 0, 0);
        index += direction;
        if (index >= frames.length - 1) {
          index = frames.length - 1;
          direction = -1;
        } else if (index <= 0) {
          index = 0;
          direction = 1;
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [framesReady]);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: VIDEO_FILTER,
          display: framesReady ? "none" : "block",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: VIDEO_FILTER,
          display: framesReady ? "block" : "none",
        }}
      />
    </>
  );
}
