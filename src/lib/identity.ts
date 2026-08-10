// Cute auto-generated identity: an emoji avatar + a friendly name, editable.
// Deterministic from a seed so the same phone keeps the same starting identity.

const CREATURES: { e: string; w: string }[] = [
  { e: '🦊', w: 'Fox' },
  { e: '🦉', w: 'Owl' },
  { e: '🦆', w: 'Duck' },
  { e: '🐢', w: 'Turtle' },
  { e: '🦥', w: 'Sloth' },
  { e: '🦔', w: 'Hedgehog' },
  { e: '🐙', w: 'Octopus' },
  { e: '🦩', w: 'Flamingo' },
  { e: '🐝', w: 'Bee' },
  { e: '🦋', w: 'Moth' },
  { e: '🐳', w: 'Whale' },
  { e: '🐧', w: 'Penguin' },
  { e: '🦦', w: 'Otter' },
  { e: '🐿️', w: 'Squirrel' },
  { e: '🦚', w: 'Peacock' },
  { e: '🐡', w: 'Puffer' },
  { e: '🦡', w: 'Badger' },
  { e: '🐌', w: 'Snail' },
]

const ADJECTIVES = [
  'Teal',
  'Warm',
  'Bright',
  'Calm',
  'Bold',
  'Quiet',
  'Swift',
  'Merry',
  'Clever',
  'Sunny',
  'Brave',
  'Keen',
  'Cosy',
  'Wry',
]

function hash(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface Profile {
  name: string
  avatar: string
}

/** Deterministic starting profile from a seed (the participant id). */
export function profileFromSeed(seed: string): Profile {
  const h = hash(seed)
  const creature = CREATURES[h % CREATURES.length]
  const adj = ADJECTIVES[(h >>> 8) % ADJECTIVES.length]
  return { name: `${adj} ${creature.w}`, avatar: creature.e }
}

/** A fresh random-ish avatar emoji, seeded by an incrementing nonce. */
export function rerollAvatar(seed: string, nonce: number): string {
  return CREATURES[hash(`${seed}:${nonce}`) % CREATURES.length].e
}
