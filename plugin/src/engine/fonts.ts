/**
 * Safe Font Loader with caching and graceful fallbacks.
 * Ensures Figma's loadFontAsync is executed before writing any text characters.
 */

const loadedFonts = new Set<string>();

/**
 * Normalizes common font weight aliases to Figma standard style names.
 */
export function normalizeFontStyle(weight?: string): string {
  if (!weight) return 'Regular';
  const w = weight.trim().toLowerCase();

  switch (w) {
    case 'thin':
    case '100':
      return 'Thin';
    case 'extralight':
    case 'extra light':
    case 'ultra light':
    case '200':
      return 'Extra Light';
    case 'light':
    case '300':
      return 'Light';
    case 'regular':
    case 'normal':
    case '400':
      return 'Regular';
    case 'medium':
    case '500':
      return 'Medium';
    case 'semibold':
    case 'semi bold':
    case '600':
      return 'Semi Bold';
    case 'bold':
    case '700':
      return 'Bold';
    case 'extrabold':
    case 'extra bold':
    case 'ultra bold':
    case '800':
      return 'Extra Bold';
    case 'black':
    case 'heavy':
    case '900':
      return 'Black';
    default:
      return weight;
  }
}

/**
 * Safely loads a font in Figma, with automatic fallback chain to Inter and Roboto.
 */
export async function ensureFontLoaded(family = 'Inter', style = 'Regular'): Promise<FontName> {
  const normStyle = normalizeFontStyle(style);
  const fontKey = `${family}::${normStyle}`;

  if (loadedFonts.has(fontKey)) {
    return { family, style: normStyle };
  }

  // 1. Try requested font & style
  try {
    const target: FontName = { family, style: normStyle };
    await figma.loadFontAsync(target);
    loadedFonts.add(fontKey);
    return target;
  } catch (err1) {
    // 2. Try requested family with Regular
    if (normStyle !== 'Regular') {
      try {
        const regularTarget: FontName = { family, style: 'Regular' };
        await figma.loadFontAsync(regularTarget);
        loadedFonts.add(`${family}::Regular`);
        return regularTarget;
      } catch (err2) {
        // Fall through to standard system defaults
      }
    }

    // 3. Fallback to Inter with requested style
    try {
      const interTarget: FontName = { family: 'Inter', style: normStyle };
      await figma.loadFontAsync(interTarget);
      loadedFonts.add(`Inter::${normStyle}`);
      return interTarget;
    } catch (err3) {
      // 4. Fallback to Inter Regular
      try {
        const interRegular: FontName = { family: 'Inter', style: 'Regular' };
        await figma.loadFontAsync(interRegular);
        loadedFonts.add('Inter::Regular');
        return interRegular;
      } catch (err4) {
        // 5. Ultimate fallback: Roboto Regular
        const robotoRegular: FontName = { family: 'Roboto', style: 'Regular' };
        await figma.loadFontAsync(robotoRegular);
        loadedFonts.add('Roboto::Regular');
        return robotoRegular;
      }
    }
  }
}
