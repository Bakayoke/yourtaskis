import { fill, type Ui } from './i18n'
import type { PublicRoom, SessionAward } from './types'

function awardLabel(id: string, ui: Ui): string {
  const map: Record<string, string> = {
    hostFavorite: ui.awardHostFavorite,
    worstMasterpiece: ui.awardWorstMasterpiece,
    roundHero: ui.awardRoundHero,
    crowdFavorite: ui.awardCrowdFavorite,
    almostChampion: ui.awardAlmostChampion,
  }
  return map[id] ?? id
}

export function SessionAwards({ room, ui }: { room: PublicRoom; ui: Ui }) {
  if (!room.awards?.length) return null

  return (
    <section className="session-awards" aria-labelledby="session-awards-title">
      <h3 id="session-awards-title">{ui.awardsTitle}</h3>
      <ul>
        {room.awards.map((a: SessionAward) => (
          <li key={a.id}>
            <strong>{a.playerName}</strong>
            <span>{awardLabel(a.id, ui)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ComebackBanner({ room, ui }: { room: PublicRoom; ui: Ui }) {
  if (!room.comeback) return null
  const { playerName, fromRank, toRank } = room.comeback
  return (
    <div className="comeback-banner" role="status">
      <p>{fill(ui.comebackMsg, { name: playerName, from: fromRank, to: toRank })}</p>
    </div>
  )
}

export function HandicapBanner({ room, ui }: { room: PublicRoom; ui: Ui }) {
  if (room.status !== 'challenge' || !room.handicap) return null
  const { playerName, text } = room.handicap
  return (
    <div className="handicap-banner" role="note">
      <p>{fill(ui.handicapLead, { name: playerName })}</p>
      <p className="handicap-text">{text}</p>
    </div>
  )
}
