import type { Colors, ColorType, CreateIdenticonOptions, IdenticonParams, Section, Sections } from './types'

export const defaultShadow = '<path fill="#010101" d="M119.21 80a39.46 39.46 0 0 1-67.13 28.13c10.36 2.33 36 3 49.82-14.28 10.39-12.47 8.31-33.23 4.16-43.26A39.35 39.35 0 0 1 119.21 80" opacity=".1"/>'
export const defaultCircleShape = (color: string): string => `<circle cx="80" cy="80" r="40" fill="${color}"/>`

/**
 * Generates the parameters needed to create an identicon
 * @param input - The string to generate the identicon parameters from
 * @returns Promise containing the sections and colors for the identicon
 */
export async function getIdenticonsParams(input: string): Promise<IdenticonParams> {
  const hash = makeHash(input)
  const main = Number(hash[0])
  const background = Number(hash[2])
  const accent = Number(hash[11])
  const face = Number(hash[3] + hash[4])
  const top = Number(hash[5] + hash[6])
  const sides = Number(hash[7] + hash[8])
  const bottom = Number(hash[9] + hash[10])

  const sections = await sectionsToSvg({ face, top, sides, bottom })
  const colors = colorsToRgb({ accent, background, main })

  return { sections, colors }
}

/**
 * Formats the SVG string into the requested output format
 * @param svg - The SVG string to format
 * @param options - Object containing format and size options
 * @param options.format - The desired output format. See {@link IdenticonFormat}
 * @returns Promise containing the formatted identicon string
 */
export async function formatIdenticon(svg: string, { format = 'svg' }: CreateIdenticonOptions = {}): Promise<string> {
  switch (format) {
    case 'image/svg+xml': {
      const base64String = typeof window !== 'undefined'
        ? btoa(svg)
        // eslint-disable-next-line unicorn/prefer-node-protocol
        : (await import('buffer')).Buffer.from(svg).toString('base64')

      return `data:image/svg+xml;base64,${base64String}`
    }
    case 'svg':
    default:
      return svg
  }
}

export const colors = ['#FC8702', '#D94432', '#E9B213', '#1A5493', '#0582CA', '#5961A8', '#21BCA5', '#FA7268', '#88B04B', '#795548'] as const
export const backgroundColors = ['#FC8702', '#D94432', '#E9B213', '#1F2348', '#0582CA', '#5F4B8B', '#21BCA5', '#FA7268', '#88B04B', '#795548'] as const

export function colorsToRgb({ main, background, accent }: Record<ColorType, number>): Colors {
  const adjustIndex = (index: number): number => ((index + 1) % 10) as number

  if (main === background)
    main = adjustIndex(main)
  while (accent === main || accent === background) accent = adjustIndex(accent)

  return {
    main: colors[main],
    background: backgroundColors[background],
    accent: colors[accent],
  }
}

export function makeHash(input: string): string {
  const fullHash = [...input]
    .map(c => c.charCodeAt(0) + 3)
    .reduce((a, e) => a * (1 - a) * chaosHash(e), 0.5)
    .toString(10)
    .split('')
    .reduce((a, e) => e + a, '')

  const hash = fullHash
    .replace('.', fullHash[5]) // Replace the dot as it cannot be parsed to int
    .slice(4, 21) // Changed from (4, 17) to (4, 21) to match V1 behavior

  // The index 5 of `fullHash` is currently unused (index 1 of `hash`,
  // after cutting off the first 4 elements). Identicons.svg() is not using it.

  // A small percentage of returned values are actually too short,
  // leading to an invalid bottom index and feature color. Adding
  // padding creates a bottom feature and accent color where no
  // existed previously, thus it's not a disrupting change.
  return hash.padEnd(13, fullHash[5])
}

function chaosHash(number: number): number {
  const k = 3.569956786876
  let a_n = 1 / number
  for (let i = 0; i < 100; i++)
    a_n = (1 - a_n) * a_n * k
  return a_n
}

export const identiconFeatures: Record<string, string> = {
  ...import.meta.glob('./features/optimized/bottom/*.svg', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('./features/optimized/top/*.svg', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('./features/optimized/face/*.svg', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('./features/optimized/sides/*.svg', { eager: true, query: '?raw', import: 'default' }),
}

export function sectionToSvg(section: Section, index: number): string {
  // Ensure index is between 1 and 21
  const numIndex = Math.abs(index % 21) + 1
  const assetIndex = numIndex < 10 ? `0${numIndex}` : `${numIndex}`
  const svgFile = `./features/optimized/${section}/${section}_${assetIndex}.svg`
  const svg = identiconFeatures[svgFile]
  if (!svg)
    throw new Error(`SVG file not found for ${section} with index ${index}/${numIndex}. Path ${svgFile}`)
  return svg
}

export async function sectionsToSvg(sectionsIndexes: Record<Section, number>): Promise<Sections> {
  const [bottom, face, sides, top] = await Promise.all(
    (['bottom', 'face', 'sides', 'top'] satisfies Section[]).map(s => sectionToSvg(s, sectionsIndexes[s])),
  )
  return { bottom, top, sides, face }
}
