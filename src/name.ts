import { hashToIndices } from './colors'
import { makeHash } from './hash'
import { WordCatalog, type WordCatalogType } from './word-catalog'
import { WordDimensions } from './word-dimensions'
import type { ColorName } from './colors'

// Generate a word description of the Identicon
export function name(text: string): string {
  const hash1 = makeHash(text)
  const hash2 = makeHash(hash1)

  const face = Number(hash1[3] + hash1[4])
  const top = Number(hash1[5] + hash1[6])
  const sides = Number(hash1[7] + hash1[8])
  const bottom = Number(hash1[9] + hash1[10])
  const featureSelectors = Number(hash2[0] + hash1[0])
  const wordsVariation = Number(hash2[1] + hash2[2])
  const color = Number(hash1[0])
  const bgColor = hash1[2]
  return wordsByEntropy({ face, top, sides, bottom, featureSelectors, wordsVariation, color, bgColor })
}

interface WordsByEntropyParams extends Record<Extract<WordCatalogType, 'face' | 'top' | 'sides' | 'bottom' | 'color'>, number> {
  featureSelectors: number
  wordsVariation: number
  bgColor: string
}

// Generate a nice tuple of (adjective, verb, noun) describing the Identicon.
//  - The *Nr are indices of word families/modifiers (see catalog.html)
//  - featureSelectors decides which feature (face, top, side, bottom) is included as which word type
//  - wordsVariation   decides which variation of the max 27 legal tuples is chosen
// Returns a valid name by calling _wordRound until it succeeds
// export function wordsByEntropy(faceNr, topNr, sidesNr, bottomNr, featureSelectors, wordsVariation, color, bgColor) {
export function wordsByEntropy({ face, top, sides, bottom, featureSelectors, wordsVariation, color, bgColor }: WordsByEntropyParams): string {
  const colorIndices = hashToIndices(color, bgColor, 0)
  const mainColor = colorIndices.main

  let i
  for (i = 0; i < 100; i++) {
    const result = _wordRound({ face, top, sides, bottom, featureSelectors: featureSelectors + i, wordsVariation, mainColor })
    if (result)
      return result
  }

  return 'Rare Shiny Bug'
}

export function makeLetterHash(text: string): string {
  const hash = makeHash(text).slice(0, 6)
  const letters = 'ABCDEFGHIJ'
  return [...hash].map(num => letters[+num]).join('')
}

interface WordRoundParams extends Record<Extract<WordCatalogType, 'face' | 'top' | 'sides' | 'bottom'>, number> {
  featureSelectors: number
  wordsVariation: number
  mainColor: string
}

// Returns: [oneLineString, twoLineString, iterations] or null
// oneLineString: Words in one line
// twoLineString: Words in two lines
// iterations: (Debug only) Iterations needed to build words
function _wordRound({ face, top, sides, bottom, featureSelectors, wordsVariation, mainColor }: WordRoundParams): string | null {
  // Each word family consists of nine entries,
  //   indices 0-3 are adjectives,
  //   indices 3-6 are verbs,
  //   indices 6-9 are nouns
  const _adjectives = (a: string[]): string[] => a.slice(0, 3)
  const _verbs = (a: string[]): string[] => a.slice(3, 6)
  const _nouns = (a: string[]): string[] => a.slice(6, 9)

  // Build array of all possible word lists
  //   (string[9])[4]
  // The catalog contains four of five features: Faces, Tops, Sides and Bottoms.
  // The fifth feature is the body color of the Identicon, which is not using synonyms.
  // Each feature has a list of 21 word families.
  // We select the same word families as shown in the identicon.
  const wordLists = [
    WordCatalog.face[face % 21],
    WordCatalog.top[top % 21],
    WordCatalog.sides[sides % 21],
    WordCatalog.bottom[bottom % 21],
  ]

  // We have four features, but we want only three words to describe them.
  // The order of the three words must be: adjective, verb, noun.
  // That leaves us with
  const _idx2 = featureSelectors % 2
  const _idx1 = (featureSelectors / 2 | 0) % 3
  const _idx0 = (featureSelectors / 6 | 0) % 5

  // Build array of synonyms
  const features: [string | ColorName, string, string][] = []

  // Get features by order from featureSelectors
  //   features[0]: 3 adjectives or color
  const useColor = _idx0 === 4
  if (useColor) {
    features.push(WordCatalog.color[mainColor as keyof typeof WordCatalog.color])
  }
  else {
    features.push(_adjectives(wordLists[_idx0]))
    wordLists.splice(_idx0, 1)
  }
  //   features[1]: 3 verbs
  features.push(_verbs(wordLists[_idx1]))
  wordLists.splice(_idx1, 1)
  //   features[2]: 3 nouns
  features.push(_nouns(wordLists[_idx2]))

  // Permute features to combinations
  // Get each possible (adjective, verb, noun) tuple
  //   (string[3])[27]
  const combinations: [string, string, string][] = []
  for (let k = 0; k < 3; k++) {
    for (let j = 0; j < 3; j++) {
      if (useColor) {
        combinations.push([features[0], features[1][j], features[2][k]])
      }
      else {
        for (let i = 0; i < 3; i++) {
          combinations.push([features[0][i], features[1][j], features[2][k]])
        }
      }
    }
  }

  const dim = WordDimensions

  // Clean out illegal combinations
  //   (string[3])[<=27]
  const cleaned = []
  for (const combo of combinations) {
    const word0dim = makeLetterHash(combo[0])
    const word1dim = makeLetterHash(combo[1])
    const word2dim = makeLetterHash(combo[2])
    // Rule 1: Any two words must be <=74px (space is 2px)
    const line1 = dim[word0dim] + 2 + dim[word1dim]
    const line2 = dim[word1dim] + 2 + dim[word2dim]
    if (line1 > 74 && line2 > 74)
      continue

    // Rule 2: Max name width must be <=124px (spaces are 2px each)
    const line = dim[word0dim] + 2 + dim[word1dim] + 2 + dim[word2dim]
    if (line > 124)
      continue

    // TODO Rule 3: At least one word must contain less than 3 syllables

    cleaned.push(combo)
  }

  // No fitting combination
  if (cleaned.length === 0)
    return null

  // Finally, choose one combination with wordsVariation
  wordsVariation %= cleaned.length
  const tuple = cleaned[wordsVariation]

  return tuple.join(' ')
}
