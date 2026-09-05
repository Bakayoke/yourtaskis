export type { Challenge, ChallengeType, SubmissionMode } from './challengeTypes.js'
import type { Challenge, SubmissionMode } from './challengeTypes.js'
import { generatedChallenges } from './challenges/generated.js'
import { defaultTimer } from './challenges/timers.js'

export const starterChallenges: Challenge[] = [
  {
    id: 'c-001',
    title: 'Porträtt i mörker',
    description:
      'Rita ett storslaget porträtt av testledaren. Haken: Du måste blunda hela tiden. Din tid börjar nu.',
    type: 'creative',
    timeLimitSeconds: 180,
    submissionMode: 'draw',
  },
  {
    id: 'c-002',
    title: 'Något blått',
    description:
      'Hämta det största blåa föremålet du kan hitta. Snabbast tillbaka med störst föremål vinner. Din tid börjar nu.',
    type: 'speed',
    timeLimitSeconds: 120,
    submissionMode: 'physical',
  },
  {
    id: 'c-003',
    title: 'Få mig att skratta',
    description: 'Få testledaren att skratta. Den som lyckas snabbast vinner.',
    type: 'speed',
    submissionMode: 'physical',
  },
  {
    id: 'c-004',
    title: 'Perfekt cirkel',
    description:
      'Rita en så perfekt cirkel som möjligt. Du får inte använda några hjälpmedel. Testledarens dom är slutgiltig.',
    type: 'subjective',
    timeLimitSeconds: 90,
    submissionMode: 'draw',
  },
  {
    id: 'c-005',
    title: 'Längsta ljudet',
    description:
      'Ta ett djupt andetag och gör ett valfritt ljud. Den som kan hålla samma ljud längst utan att andas vinner.',
    type: 'endurance',
  },
  {
    id: 'c-006',
    title: 'Tornet',
    description:
      'Bygg det högsta tornet av föremål du har inom en meters radie just nu. Du får inte ställa dig upp.',
    type: 'creative',
    timeLimitSeconds: 150,
    submissionMode: 'physical',
  },
  {
    id: 'c-007',
    title: 'Hemligt uppdrag',
    description:
      'Hitta på ett nytt smeknamn på personen till vänster om dig. Bäst motivering till namnet vinner. Smeknamnet gäller resten av spelet.',
    type: 'subjective',
    timeLimitSeconds: 120,
    submissionMode: 'text',
  },
  {
    id: 'c-008',
    title: 'Mest oväntade ljudet',
    description:
      'Gör det absolut mest oväntade ljudet med din egen kropp. Testledaren bedömer vem som var konstigast.',
    type: 'subjective',
    submissionMode: 'physical',
  },
  {
    id: 'c-009',
    title: 'Göm dig',
    description:
      'Göm dig för skärmen/testledaren. Den som testledaren hittar (eller ser) SIST vinner.',
    type: 'speed',
    timeLimitSeconds: 90,
    submissionMode: 'physical',
  },
  {
    id: 'c-010',
    title: 'Sista smset',
    description:
      'Läs upp det senaste SMS:et du tog emot högt, men med rösten av en nyhetsankare som rapporterar en tragedi. Bäst inlevelse vinner.',
    type: 'creative',
    timeLimitSeconds: 120,
    submissionMode: 'text',
  },
  {
    id: 'c-011',
    title: 'Fel hand',
    description:
      'Rita en banan med din icke-dominanta hand. Du får inte byta hand. Testledarens smakdom avgör vem som fick mest fruktig banan.',
    type: 'creative',
    timeLimitSeconds: 120,
    submissionMode: 'draw',
  },
  {
    id: 'c-012',
    title: 'Gruppens vapen',
    description:
      'Designa en logotyp för er grupp just nu. En enda grafisk form räcker — men den ska kännas som ett riktigt varumärke.',
    type: 'creative',
    timeLimitSeconds: 180,
    submissionMode: 'draw',
  },
  {
    id: 'c-013',
    title: 'Rödest vinner',
    description:
      'Hämta det rödeste föremålet du kan hitta. Vid oavgjort vinner störst föremål. Din tid börjar nu.',
    type: 'speed',
    timeLimitSeconds: 120,
    submissionMode: 'physical',
  },
  {
    id: 'c-014',
    title: 'Plankan',
    description:
      'Planka så länge du orkar. Sista person som håller formen utan att vila vinner. Testledaren avslutar när alla gett upp.',
    type: 'endurance',
  },
  {
    id: 'c-015',
    title: 'Valaffisch',
    description:
      'Hitta på ett nytt politiskt parti för testledaren. Skriv partinamn, slogan och en valaffisch-text (max tre meningar).',
    type: 'subjective',
    timeLimitSeconds: 180,
    submissionMode: 'text',
  },
  {
    id: 'c-016',
    title: 'Breaking news',
    description:
      'Skriv en breaking news-rubrik om något du gjorde idag, som om det vore världshändelse. Plus en mening brödtext.',
    type: 'creative',
    timeLimitSeconds: 120,
    submissionMode: 'text',
  },
  {
    id: 'c-017',
    title: 'Filmrecension',
    description:
      'Skriv en filmrecension (två meningar) av det som hände senaste timmen i ditt liv. Bäst dramatik vinner.',
    type: 'subjective',
    timeLimitSeconds: 120,
    submissionMode: 'text',
  },
  {
    id: 'c-018',
    title: 'Gruppfoto',
    description:
      'Ta det roligaste gruppfotot där testledaren MÅSTE vara med. Visa upp resultatet när du är klar. Testledaren bedömer.',
    type: 'creative',
    timeLimitSeconds: 120,
    submissionMode: 'physical',
  },
  {
    id: 'c-019',
    title: 'Minnesmålning',
    description:
      'Rita testledarens ansikte utifrån minnet. Du får inte titta på testledaren under tiden. Din tid börjar nu.',
    type: 'creative',
    timeLimitSeconds: 180,
    submissionMode: 'draw',
  },
  {
    id: 'c-020',
    title: 'Skulptur av ledaren',
    description:
      'Bygg en skulptur av minst tre föremål som "symboliserar testledaren". Motivera muntligt när testledaren bedömer.',
    type: 'creative',
    timeLimitSeconds: 150,
    submissionMode: 'physical',
  },
  {
    id: 'c-021',
    title: 'Strump-race',
    description:
      'Ta av dig en strumpa (eller skosnöre) snabbast. Strumpan ska vara hel och helt av. Fusk = noll poäng.',
    type: 'speed',
    timeLimitSeconds: 90,
    submissionMode: 'physical',
  },
  {
    id: 'c-022',
    title: 'Robot-intro',
    description:
      'Presentera dig själv som en robot tills testledaren säger stopp. Mest övertygande mekaniska person vinner.',
    type: 'subjective',
    submissionMode: 'physical',
  },
  {
    id: 'c-023',
    title: 'Enbens',
    description:
      'Stå på ett ben. Sista person som står utan att sätta ner foten vinner. Testledaren avslutar när det är klart.',
    type: 'endurance',
  },
  {
    id: 'c-024',
    title: 'Djurets kung',
    description:
      'Imitera ett djur — testledaren ska gissa vilket. Bäst imitation vinner, oavgjort går till snabbast gissning.',
    type: 'subjective',
    timeLimitSeconds: 120,
    submissionMode: 'physical',
  },
  {
    id: 'c-025',
    title: 'Rumskarta',
    description:
      'Rita en karta över rummet du är i just nu. Testledaren bedömer vem som hade bäst orienteringskänsla.',
    type: 'creative',
    timeLimitSeconds: 180,
    submissionMode: 'draw',
  },
  {
    id: 'c-026',
    title: 'Kuddefortet',
    description:
      'Bygg det mäktigaste kuddefortet du kan. Höjd, stabilitet och drama räknas.',
    type: 'speed',
    timeLimitSeconds: 120,
    submissionMode: 'physical',
  },
  {
    id: 'c-027',
    title: 'Drama queen',
    description:
      'Spela upp det dramatiskaste ögonblicket i din vecka som teater. Testledaren bedömer vem som fick flest tårar.',
    type: 'subjective',
    timeLimitSeconds: 120,
    submissionMode: 'physical',
  },
  {
    id: 'c-028',
    title: 'Tung lyft',
    description:
      'Håll ett tungt föremål (välj själv) rakt fram framför dig längst utan att böja armarna. Sista som håller vinner.',
    type: 'endurance',
  },
  {
    id: 'c-029',
    title: 'Wikipedia-lögn',
    description:
      'Skriv tre meningar till en falsk Wikipedia-artikel om testledaren. Mest trovärdig lögn vinner.',
    type: 'subjective',
    timeLimitSeconds: 150,
    submissionMode: 'text',
  },
  {
    id: 'c-030',
    title: 'Freeze dance',
    description:
      'Dansa tills testledaren ropar stopp — stå sedan helt still. Den som rör sig minst efter stoppet vinner.',
    type: 'speed',
    submissionMode: 'physical',
  },
]

export const allChallenges: Challenge[] = [...starterChallenges, ...generatedChallenges]

const challengeById = new Map(allChallenges.map((c) => [c.id, c]))

export function getChallenge(id: string): Challenge | undefined {
  return challengeById.get(id)
}

/** How participants submit for this challenge in the app. */
export function submissionModeFor(challenge: Challenge): SubmissionMode {
  if (challenge.submissionMode) return challenge.submissionMode
  if (challenge.type === 'endurance') return 'physical'
  if (challenge.description.includes('Rita') || challenge.description.includes('rita')) return 'draw'
  if (challenge.description.includes('Skriv') || challenge.description.includes('skriv')) return 'text'
  return 'physical'
}

export function pickNextChallenge(usedIds: string[]): Challenge {
  const unused = allChallenges.filter((c) => !usedIds.includes(c.id))
  const pool = unused.length > 0 ? unused : allChallenges
  return pool[Math.floor(Math.random() * pool.length)]!
}

export { defaultTimer }
