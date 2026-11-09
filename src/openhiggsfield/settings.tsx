"use client";

import { useEffect, useState } from "react";

import { getPresets } from "@/generation/actions";
import type { ModelEntry, Preset, PresetSource } from "@/generation/catalog";
import { useSettings } from "@/generation/stores/settings";

import {
  ratioBox,
  settingLabel,
  settingPillLabel,
  settingValueLabel,
} from "./data";
import { AudioIcon, ClockIcon, FormatIcon, GemIcon } from "./icons";
import { Field, OptionList, Slider } from "./ui";

/* A preset's display name rides beside its id in the settings store, so the
   pill can name the pick without refetching the list. parseSettings drops it
   before anything is submitted. */
function presetNameKey(settingKey: string) {
  return `${settingKey}Name`;
}

type PresetLoad = { presets: Preset[] } | { error: string };

/* One fetch per list per page load; a failed fetch is forgotten so reopening
   the picker tries again. */
const presetLoads = new Map<PresetSource, Promise<PresetLoad>>();

function loadPresets(source: PresetSource): Promise<PresetLoad> {
  let load = presetLoads.get(source);
  if (!load) {
    load = getPresets(source).catch(() => ({ error: "Could not load styles." }));
    presetLoads.set(source, load);
    void load.then((result) => {
      if ("error" in result) presetLoads.delete(source);
    });
  }
  return load;
}

function PresetList({
  source,
  value,
  onChange,
}: {
  source: PresetSource;
  value: string;
  onChange: (preset: Preset) => void;
}) {
  const [load, setLoad] = useState<PresetLoad | null>(null);
  useEffect(() => {
    let live = true;
    void loadPresets(source).then((result) => {
      if (live) setLoad(result);
    });
    return () => {
      live = false;
    };
  }, [source]);

  if (!load) return <p className="ohf-preset-note">Loading styles…</p>;
  if ("error" in load) return <p className="ohf-preset-note">{load.error}</p>;
  if (!load.presets.length) return <p className="ohf-preset-note">No styles available.</p>;
  return (
    <OptionList
      options={load.presets.map((preset) => ({ value: preset.id, label: preset.name }))}
      value={value}
      onChange={(id) => {
        const preset = load.presets.find((entry) => entry.id === id);
        if (preset) onChange(preset);
      }}
    />
  );
}

/* One drawn mark per setting the catalog is known to declare. Anything new
   arrives as its value alone rather than under a borrowed glyph — a wrong icon
   reads as a wrong control. */
function glyphFor(key: string, value: unknown) {
  if (key === "aspectRatio") {
    /* The mark is the ratio: the pill draws the frame it is about to make, in a
       fixed optical box so 21:9 and 1:1 leave their labels on the same rail. */
    const box = typeof value === "string" ? ratioBox(value) : null;
    return (
      <span className="ohf-ctl-ratio">
        <span
          className={`ohf-ctl-ratio-box${box ? "" : " ohf-ctl-ratio-box--auto"}`}
          style={box ?? undefined}
        />
      </span>
    );
  }
  if (key === "resolution") return <GemIcon size={13} />;
  if (key === "duration") return <ClockIcon size={13} />;
  if (key === "outputFormat") return <FormatIcon size={13} />;
  if (key === "generateAudio" || key === "sound" || key === "keepOriginalSound") {
    return <AudioIcon size={13} />;
  }
  return null;
}

/** One catalog setting, standing on the composer's control rail. Booleans are
    the control themselves; everything else opens its values in a popover. */
export function SettingPill({
  model,
  settingKey,
  values,
  open,
  onOpen,
}: {
  model: ModelEntry;
  settingKey: string;
  values: Record<string, unknown>;
  open: boolean;
  onOpen: (trigger: HTMLElement) => void;
}) {
  const settings = useSettings();
  const field = model.settings[settingKey];
  if (!field) return null;

  const label = settingLabel(settingKey);
  const value = values[settingKey];
  const glyph = glyphFor(settingKey, value);

  if (field.type === "preset") {
    const name = settings.byModel[model.id]?.[presetNameKey(settingKey)];
    const shown = typeof value === "string" && value && typeof name === "string" ? name : "Pick style";
    return (
      <button
        type="button"
        className="ohf-ctl ohf-tip"
        data-tip={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${label} — ${shown}`}
        onClick={(event) => onOpen(event.currentTarget)}
      >
        <span className="ohf-ctl-value">{shown}</span>
      </button>
    );
  }

  if (field.type === "boolean") {
    const on = value === true;
    return (
      <button
        type="button"
        className="ohf-ctl ohf-ctl--flag"
        aria-pressed={on}
        aria-label={`${label} — ${on ? "on" : "off"}`}
        onClick={() => settings.set(model.id, { [settingKey]: !on })}
      >
        {glyph && (
          <span className="ohf-ctl-glyph" aria-hidden>
            {glyph}
          </span>
        )}
        <span className="ohf-ctl-value">{settingPillLabel(settingKey)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="ohf-ctl ohf-tip"
      data-tip={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={`${label} — ${settingValueLabel(settingKey, value)}`}
      onClick={(event) => onOpen(event.currentTarget)}
    >
      {glyph && (
        <span className="ohf-ctl-glyph" aria-hidden>
          {glyph}
        </span>
      )}
      <span className="ohf-ctl-value">{settingValueLabel(settingKey, value)}</span>
    </button>
  );
}

/** The values behind one pill — a list of the enum's values, or the slider of
    a range, scoped to the single setting the visitor reached for. */
export function SettingPopover({
  model,
  settingKey,
  values,
}: {
  model: ModelEntry;
  settingKey: string;
  values: Record<string, unknown>;
}) {
  const settings = useSettings();
  const field = model.settings[settingKey];
  if (!field || field.type === "boolean") return null;

  const label = settingLabel(settingKey);

  if (field.type === "preset") {
    return (
      <div
        className="ohf-popover ohf-popover--setting ohf-popover--list"
        role="dialog"
        aria-label={label}
      >
        <Field label={label}>
          <PresetList
            source={field.source}
            value={typeof values[settingKey] === "string" ? (values[settingKey] as string) : ""}
            onChange={(preset) =>
              settings.set(model.id, { [settingKey]: preset.id, [presetNameKey(settingKey)]: preset.name })
            }
          />
        </Field>
      </div>
    );
  }

  if (field.type === "enum") {
    const value = typeof values[settingKey] === "string" ? (values[settingKey] as string) : field.default;
    return (
      <div
        className="ohf-popover ohf-popover--setting ohf-popover--list"
        role="dialog"
        aria-label={label}
      >
        <Field label={label}>
          <OptionList
            options={field.values.map((option) => ({
              value: option,
              label: settingValueLabel(settingKey, option),
            }))}
            value={value}
            ratio={settingKey === "aspectRatio"}
            onChange={(next) => settings.set(model.id, { [settingKey]: next })}
          />
        </Field>
      </div>
    );
  }

  const value = typeof values[settingKey] === "number" ? (values[settingKey] as number) : field.default;
  return (
    <div className="ohf-popover ohf-popover--setting ohf-scroll" role="dialog" aria-label={label}>
      <Field label={label} value={settingValueLabel(settingKey, value)}>
        <Slider
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={value}
          label={label}
          onChange={(next) => settings.set(model.id, { [settingKey]: next })}
        />
      </Field>
    </div>
  );
}
