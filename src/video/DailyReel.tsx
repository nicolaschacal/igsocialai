import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { DailyReelProps, ReelScene } from "./types";

const SceneCard: React.FC<{
  scene: ReelScene;
  index: number;
  accentColor: string;
  backgroundColor: string;
  handle: string;
}> = ({ scene, index, accentColor, backgroundColor, handle }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 18, stiffness: 110, mass: 0.8 } });
  const fade = interpolate(frame, [0, 12, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const isCenter = scene.layout !== "left";
  const isCta = scene.layout === "cta";
  const isStat = scene.layout === "stat";

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 92, opacity: fade }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 80% 20%, ${accentColor}25 0, transparent 42%), linear-gradient(155deg, ${backgroundColor}, #0b1020)`,
      }}/>
      <div style={{
        position: "absolute", left: 70, right: 70, top: 105, display: "flex",
        justifyContent: "space-between", alignItems: "center", color: "#ffffff80",
        fontSize: 22, letterSpacing: 4, fontWeight: 700,
      }}>
        <span>IDEA {String(index + 1).padStart(2, "0")}</span><span>{handle}</span>
      </div>
      <div style={{
        position: "relative", transform: `translateY(${(1 - entrance) * 55}px) scale(${0.96 + entrance * 0.04})`,
        textAlign: isCenter ? "center" : "left", maxWidth: 900, alignSelf: isCenter ? "center" : "flex-start",
      }}>
        {scene.kicker && <div style={{
          display: "inline-block", marginBottom: 34, padding: "13px 22px", borderRadius: 999,
          border: `1px solid ${accentColor}88`, color: accentColor, fontSize: 25,
          fontWeight: 800, letterSpacing: 5, textTransform: "uppercase",
        }}>{scene.kicker}</div>}
        {isStat && <div style={{ color: accentColor, fontSize: 190, lineHeight: 1, fontWeight: 900, letterSpacing: -12 }}>{scene.emphasis}</div>}
        <div style={{
          color: "white", fontSize: isCta ? 78 : 84, fontWeight: 900, lineHeight: 1.02,
          letterSpacing: -4,
        }}>{scene.headline}</div>
        {scene.body && <div style={{
          color: "#d6d9e5", fontSize: 34, lineHeight: 1.35, marginTop: 30,
          maxWidth: 800, marginLeft: isCenter ? "auto" : 0, marginRight: isCenter ? "auto" : 0,
        }}>{scene.body}</div>}
        {isCta && <div style={{
          marginTop: 46, display: "inline-block", padding: "20px 30px", borderRadius: 18,
          background: accentColor, color: "#10121a", fontSize: 32, fontWeight: 900,
          letterSpacing: 2,
        }}>COMENTÁ Y TE LO ENVÍO</div>}
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 105, height: 5, background: "#ffffff20", borderRadius: 10 }}>
        <div style={{ width: `${Math.min(100, (frame / durationInFrames) * 100)}%`, height: "100%", background: accentColor, borderRadius: 10 }}/>
      </div>
    </AbsoluteFill>
  );
};

export const DailyReel: React.FC<DailyReelProps> = ({
  handle,
  accentColor,
  backgroundColor,
  audioSrc,
  durationInFrames,
  scenes,
}) => {
  let nextStart = 0;
  const sequences = scenes.map((scene, index) => {
    const duration = scene.durationFrames ?? Math.floor(durationInFrames / Math.max(scenes.length, 1));
    const start = nextStart;
    nextStart += duration;
    return { scene, index, start, duration };
  });
  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: "Arial, Helvetica, sans-serif" }}>
      {sequences.map(({ scene, index, start, duration }) => (
        <Sequence key={`${index}-${scene.headline}`} from={start} durationInFrames={duration}>
          <SceneCard scene={scene} index={index} accentColor={accentColor} backgroundColor={backgroundColor} handle={handle}/>
        </Sequence>
      ))}
      {audioSrc ? <Audio src={staticFile(audioSrc)} volume={1}/> : null}
    </AbsoluteFill>
  );
};
