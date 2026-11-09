import type { ModelEntry } from "./types";

/* Genjutsu edits a source video. Motion Transfer moves the reference
   characters the way the video moves; Object Swap replaces things in it with
   the references. Both take one video and 1-8 reference images, and output
   length follows the source (Genjutsu uses up to 30s, Light up to 15s).
   Restyle applies a style preset from the platform's list, with up to 5
   optional character references. */

const resolution = {
  type: "enum",
  values: ["480p", "720p", "1080p"],
  default: "720p",
} as const satisfies ModelEntry["settings"][string];

function genjutsuModel(id: string, label: string): ModelEntry {
  return { id, surface: "video", label, roles: { video: 1, reference: 8 }, settings: { resolution } };
}

export const genjutsuMotion = genjutsuModel("genjutsu-motion", "Genjutsu Motion Transfer");
export const genjutsuSwap = genjutsuModel("genjutsu-swap", "Genjutsu Object Swap");
export const genjutsuLightMotion = genjutsuModel("genjutsu-light-motion", "Genjutsu Light Motion Transfer");
export const genjutsuLightSwap = genjutsuModel("genjutsu-light-swap", "Genjutsu Light Object Swap");

export const genjutsuRestyle: ModelEntry = {
  id: "genjutsu-restyle",
  surface: "video",
  label: "Genjutsu Restyle",
  roles: { video: 1, reference: 5 },
  settings: {
    style: { type: "preset", source: "genjutsu-restyle", default: "" },
    resolution,
  },
};
