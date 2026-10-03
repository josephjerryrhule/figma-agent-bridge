/**
 * Effects Engine for Figma Agent Bridge.
 * Translates shadows and blurs between declarative JSON specs and Figma native Effect objects.
 */

import { EffectSpec } from '../types';
import { parseColor, figmaRgbToHex } from './colors';

/**
 * Converts an array of declarative EffectSpec objects into Figma Effect objects.
 */
export function parseEffects(specs?: EffectSpec[]): Effect[] {
  if (!specs || !Array.isArray(specs)) return [];

  const effects: Effect[] = [];

  for (const spec of specs) {
    if (!spec || !spec.type) continue;

    const visible = spec.visible !== false;

    if (spec.type === 'DROP_SHADOW' || spec.type === 'INNER_SHADOW') {
      const parsedColor = parseColor(spec.color || '#000000');
      const r = parsedColor ? parsedColor.r : 0;
      const g = parsedColor ? parsedColor.g : 0;
      const b = parsedColor ? parsedColor.b : 0;
      const a = spec.opacity !== undefined ? spec.opacity : (parsedColor ? parsedColor.a : 0.15);

      const effect: DropShadowEffect | InnerShadowEffect = {
        type: spec.type,
        color: { r, g, b, a },
        offset: {
          x: spec.offset?.x ?? 0,
          y: spec.offset?.y ?? 4
        },
        radius: spec.radius ?? 12,
        spread: spec.spread ?? 0,
        visible,
        blendMode: (spec.blendMode as any) || 'NORMAL'
      };

      effects.push(effect);
    } else if (spec.type === 'LAYER_BLUR' || spec.type === 'BACKGROUND_BLUR') {
      const effect: any = {
        type: spec.type,
        radius: spec.radius ?? 16,
        visible
      };

      effects.push(effect);
    }
  }

  return effects;
}

/**
 * Serializes Figma native Effect objects into JSON-friendly format.
 */
export function serializeEffects(effects?: readonly Effect[]): EffectSpec[] {
  if (!effects || !Array.isArray(effects)) return [];

  return effects
    .filter(e => e.visible !== false)
    .map(e => {
      if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
        const shadow = e as DropShadowEffect | InnerShadowEffect;
        return {
          type: shadow.type,
          color: figmaRgbToHex(shadow.color),
          opacity: Math.round(shadow.color.a * 100) / 100,
          offset: { x: shadow.offset.x, y: shadow.offset.y },
          radius: shadow.radius,
          spread: shadow.spread ?? 0,
          visible: shadow.visible,
          blendMode: shadow.blendMode
        };
      } else if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
        const blur = e as BlurEffect;
        return {
          type: blur.type,
          radius: blur.radius,
          visible: blur.visible
        };
      }
      return null as any;
    })
    .filter(Boolean);
}
