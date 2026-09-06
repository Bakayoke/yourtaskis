import { ensureSessionBound, loadSession, type ConnState } from './api'
import { fill, type Ui } from './i18n'
import type { PublicRoom } from './types'

type Props = {
  conn: ConnState
  room: PublicRoom | null
  ui: Ui
  onReconnected?: () => void
}

export function ReconnectBanner({ conn, room, ui, onReconnected }: Props) {
  const session = loadSession()
  const self = session && room?.players.find((p) => p.id === session.playerId)
  const offline = conn !== 'connected'
  const away = Boolean(self && !self.connected && !room?.youAreHost)

  if (!offline && !away) return null

  async function retry() {
    const res = await ensureSessionBound()
    if (res?.ok && res.room) onReconnected?.()
  }

  return (
    <div className="reconnect-banner" role="status">
      <p>{offline ? (conn === 'connecting' ? ui.reconnecting : ui.disconnected) : ui.youAreAway}</p>
      <button type="button" className="btn secondary small" onClick={() => void retry()}>
        {ui.reconnectNow}
      </button>
    </div>
  )
}

export function PendingRoundBanner({ room, ui }: { room: PublicRoom; ui: Ui }) {
  if (room.youAreHost || !room.youPendingRound) return null
  return (
    <div className="pending-banner" role="status">
      <p>{ui.pendingRound}</p>
      <p className="muted">{fill(ui.pendingRoundHint, { name: room.hostName })}</p>
    </div>
  )
}
