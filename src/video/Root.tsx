import React from "react";
import { Composition } from "remotion";
import { DailyReel } from "./DailyReel";
import type { DailyReelProps } from "./types";

const defaultProps: DailyReelProps = {
  title: "Your first motion graphics Reel",
  handle: "@nickdhq",
  accentColor: "#9b8cff",
  backgroundColor: "#10131b",
  audioSrc: "",
  durationInFrames: 900,
  scenes: [
    { kicker: "LA IDEA", headline: "La nube no es una nube", body: "Tu información sigue dependiendo de infraestructura física." },
    { kicker: "REALIDAD", layout: "left", headline: "Miles de kilómetros de fibra óptica", body: "Cables submarinos, centros de datos y redes eléctricas sostienen cada respuesta." },
    { layout: "stat", emphasis: "99%", headline: "de la información viaja por cables", body: "La nube tiene una dirección física." },
    { kicker: "EN RESUMEN", headline: "La IA parece magia. La infraestructura no.", body: "Y esa dependencia importa más de lo que creemos." },
    { layout: "cta", kicker: "¿QUERÉS LA GUÍA?", headline: "Comentá INFRA y te la mando por DM", body: "Seguime para más tecnología explicada sin vueltas." },
  ],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DailyReel"
    component={DailyReel}
    durationInFrames={defaultProps.durationInFrames}
    calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames })}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultProps}
  />
);
