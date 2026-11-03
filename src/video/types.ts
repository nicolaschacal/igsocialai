export type ReelScene = {
  kicker?: string;
  headline: string;
  body?: string;
  emphasis?: string;
  layout?: "center" | "left" | "stat" | "quote" | "cta";
};

export type DailyReelProps = {
  title: string;
  handle: string;
  accentColor: string;
  backgroundColor: string;
  audioSrc?: string;
  durationInFrames: number;
  scenes: ReelScene[];
};
