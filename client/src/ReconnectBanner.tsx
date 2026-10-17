import { ensureSessionBound, type ConnState } from './api'
import { fill, type Ui } from './i18n'
import type { PublicRoom } from './types'

type Props = {
  conn: ConnState
  ui: Ui
  onReconnected?: () => void
}

export function ReconnectBanner({ conn, ui, onReconnected }: Props) {
  const offline = conn !== 'connected'

  if (!offline) return null

  async function retry() {
    const res = await ensureSessionBound()
    if (res?.ok && res.room) onReconnected?.()
  }

  return (
    <div className="reconnect-banner" role="status">
      <p>{conn === 'connecting' ? ui.reconnecting : ui.disconnected}</p>
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
