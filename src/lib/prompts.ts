export const SPARK_PROMPTS: string[] = [
  'Combine two unrelated industries into one product.',
  'Fix an annoyance you ran into yesterday.',
  'What would this look like at 10× the scale — or 1/10th the cost?',
  'Invent a service your grandparents would have paid for.',
  'Take a boring daily chore and make it a game.',
  'What tool do you wish existed at your job?',
  'Design something for people who are left-handed, colorblind, or new in town.',
  'Turn a physical product into a subscription — or vice versa.',
  'What would a kid build to solve your biggest problem?',
  'Remove one step from a process everyone tolerates.',
  'Pick a trend from 10 years ago. What does its comeback look like?',
  'What could you build with only a phone camera and a microphone?',
  'Reverse a common assumption in your field.',
  'Make something that saves people 10 minutes every day.',
  'What would you build if you had to ship it by Friday?',
  'Borrow an idea from nature (ants, bees, fungi, rivers…).',
  'Who is completely underserved in your neighborhood?',
  'What would make waiting in line enjoyable?',
  'Create a new ritual or tradition for teams or families.',
  'Turn something you know deeply into a product for beginners.',
  'What breaks when everyone uses AI for it? Fix that.',
  'Mash up a hobby you love with a technology you use daily.',
  'What would the premium, luxury version of something cheap look like?',
  'What would the free, radically simple version of something expensive look like?',
  'Solve a problem you overheard someone complain about.',
  'Design for a world with no internet for one day.',
  'What should exist for people over 70? Under 10?',
  'Take a B2B tool and redesign it for consumers.',
  'Make one thing in your home smarter — without a screen.',
  'What could you teach in 5 minutes that people would pay for?',
  'Reimagine a public space: bus stop, library, park bench.',
  'What would make strangers help each other more?',
  'Invent a new unit of measurement for something people care about.',
  'What data do people throw away that could be valuable?',
  'Write 10 bad ideas fast. Then flip the worst one into a good one.',
  'Make sustainability the cheaper, easier option for something.',
  'What would a 5-minute daily habit app for a different skill look like?',
  'Combine a marketplace with something that has never had one.',
  'What do you keep putting off? Build the thing that makes it effortless.',
  'Design an experience for people traveling alone.',
];

/** Deterministic "prompt of the day" so it's stable across reloads. */
export function promptIndexForDate(date: string): number {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % SPARK_PROMPTS.length;
}

export function randomPromptIndex(exclude: number): number {
  if (SPARK_PROMPTS.length < 2) return 0;
  let i = exclude;
  while (i === exclude) i = Math.floor(Math.random() * SPARK_PROMPTS.length);
  return i;
}
