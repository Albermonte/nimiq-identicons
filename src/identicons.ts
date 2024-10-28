import { colorsToRgb } from './colors'
import { makeHash } from './hash'
import { sectionsToSvg } from './sections'
import type { IdenticonFormat, IdenticonParams } from './types'

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

export function ensambleSvg({ colors: { accent, background, main }, sections: { bottom, face, sides, top } }: IdenticonParams): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><defs><clipPath id="a"><path d="m125.8 16.67 31.765 55.015a15.99 15.99 0 0 1 0 16L125.8 142.7c-2.85 4.95-8.135 8-13.85 8H48.415c-5.715 0-11-3.05-13.85-8L2.8 87.685a16.04 16.04 0 0 1 0-16L34.57 16.67a16 16 0 0 1 13.85-8h63.53c5.715 0 11 3.05 13.85 8"/></clipPath></defs><g fill="${accent}" clip-path="url(#a)" color="${main}"><path fill="${background}" d="M0 0h160v160H0z"/><circle cx="80" cy="80" r="40" fill="${main}"/><path fill="#010101" d="M119.21 80a39.46 39.46 0 0 1-67.13 28.13c10.36 2.33 36 3 49.82-14.28 10.39-12.47 8.31-33.23 4.16-43.26A39.35 39.35 0 0 1 119.21 80" opacity=".1"/>${top}${sides}${face}${bottom}</g></svg>`
}

interface CreateIdenticonOptions {
  /**
   * The format of the encoded image
   * @default 'svg'
   */
  format?: IdenticonFormat
}

/**
 * Generate an identicon from a string
 *
 * @param input The string to generate the identicon from
 * @param options The options for the identicon
 * @returns The identicon as a string
 */
export async function createIdenticon(input: string, options: CreateIdenticonOptions = {}): Promise<string> {
  const { format = 'svg' } = options
  const params = await getIdenticonsParams(input)
  const svg = ensambleSvg(params)

  switch (format) {
    case 'image/svg+xml': {
      const base64String = typeof window !== 'undefined'
        ? btoa(svg)
        // eslint-disable-next-line unicorn/prefer-node-protocol
        : (await import('buffer')).Buffer.from(svg).toString('base64')

      const uri = `data:image/svg+xml;base64,${base64String}`
      return uri
    }
    case 'svg':
    default:
      return svg
  }
}