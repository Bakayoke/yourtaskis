import type { Lang } from './i18n'
import { t } from './i18n'

/** Map known Swedish server errors to English UI strings. */
const EN_ERRORS: Record<string, string> = {
  'Rummet finns inte': 'Room not found',
  'Hittade inget spel med den koden': 'No game found with that code',
  'Spelet har redan startat — vänta till nästa omgång': 'Game already started — you will join next round',
  'Namnet är redan taget': 'Name already taken',
  'Ange ett namn': 'Enter a name',
  'Spelaren hittades inte': 'Player not found',
  'Inte i ett rum': 'Not in a room',
  'Bara testledaren kan starta': 'Only the host can start',
  'Bara testledaren kan avsluta lobbyn': 'Only the host can close the lobby',
  'Kan bara avsluta lobbyn innan spelet startat': 'Lobby can only be closed before the game starts',
  'Bara testledaren kan ta bort deltagare': 'Only the host can remove players',
  'Kan bara ta bort deltagare i lobbyn': 'Players can only be removed in the lobby',
  'Kan inte ta bort testledaren': 'Cannot remove the host',
  'Deltagaren hittades inte': 'Player not found',
  'Bara testledaren kan ge poäng': 'Only the host can score',
  'Bara testledaren kan fortsätta': 'Only the host can continue',
  'Bara testledaren kan avsluta': 'Only the host can end the game',
  'Bara testledaren kan gå till lobbyn': 'Only the host can return to lobby',
  'Bara testledaren kan välja antal test': 'Only the host can set the number of challenges',
  'Bara testledaren kan avsluta testet': 'Only the host can stop the challenge',
  'Inget aktivt test': 'No active challenge',
  'Inget test aktivt': 'No active challenge',
  'Inte i bedömningsfas': 'Not in judging phase',
  'Testledaren deltar inte i testet': 'The host does not play challenges',
  'Du har redan lämnat in': 'You already submitted',
  'Inlämningen är tom': 'Submission is empty',
  'Ogiltig inlämning': 'Invalid submission',
  'Du går med från nästa test': 'You join from the next challenge',
  'Spelet har redan startat': 'Game already started',
  'Kan bara ändras i lobbyn': 'Can only be changed in the lobby',
  'Ogiltigt antal rundor': 'Invalid number of rounds',
  'Avsluta omgången först': 'Finish the round first',
  'Alla rundor är klara': 'All rounds complete',
  'Testledaren får inga poäng': 'The host cannot receive points',
  'Kunde inte skapa rum': 'Could not create room',
  'Kunde inte gå med': 'Could not join',
  'Kunde inte återansluta': 'Could not reconnect',
  'Kunde inte avsluta lobbyn': 'Could not close lobby',
  'Kunde inte ändra antal test': 'Could not change number of challenges',
  'Deltagaren går med nästa runda': 'Player joins next round',
  'Kunde inte ta bort deltagare': 'Could not remove player',
}

export function formatError(message: string | undefined, lang: Lang): string {
  if (!message) return t(lang).errorGeneric
  if (lang === 'sv') return message
  if (EN_ERRORS[message]) return EN_ERRORS[message]
  const minMatch = message.match(/^Minst (\d+) deltagare krävs \(förutom testledaren\)$/)
  if (minMatch) return `At least ${minMatch[1]} players required (besides the host)`
  return message
}
