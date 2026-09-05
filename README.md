# Your Task Is

Hemma-Bäst-i-Test — en testledare läser upp, deltagarna utför på mobilen, testledaren ger poäng 1–5.

**Domän:** [yourtaskis.com](https://yourtaskis.com)

## Så funkar det

1. **Testledaren** skapar ett spel och delar sessionskod eller QR
2. **Deltagarna** ansluter med mobil (minst 2 + testledare)
3. Testledaren startar — ett test visas för alla
4. Deltagarna utför (rita, skriva, eller fysiskt test med "Jag är klar")
5. Testledaren bedömer och ger **1–5 poäng** per person
6. Poängtavla → nästa test

## Kom igång lokalt

```bash
npm install
npm install --prefix client
npm run dev
```

Öppna [http://localhost:5173](http://localhost:5173) — API/socket körs på port `3001`.

## Produktion

### Railway (API + sockets)

1. Skapa tjänst från GitHub-repot (start: `npm start`)
2. Lägg till **Redis-plugin** och koppla `REDIS_URL`
3. Sätt:
   - `PUBLIC_APP_URL=https://yourtaskis.com`
   - `CORS_ORIGIN=https://yourtaskis.com,https://www.yourtaskis.com`
4. Verifiera: `GET /api/health` → `persist.configured: true`

### Cloudflare (frontend)

1. Koppla `yourtaskis.com` / `www` i Cloudflare
2. Build command: `npm install && npm run build`
3. Deploy: `npm run deploy:cf`

Sätt `VITE_SOCKET_URL` till Railway-URL **före** client-build.

## Stack

- React + Vite (klient)
- Express + Socket.io (realtid)
- Redis (persistens)
- TypeScript

## Testtyper

| Typ | I appen |
|-----|---------|
| **Rita** | Canvas på mobil (porträtt, cirkel) |
| **Skriva** | Textfält (smeknamn, SMS-inlevelse) |
| **Fysiskt** | Deltagaren trycker "Jag är klar" — testledaren bedömer i verkligheten |

Testbanken finns i `server/challenges.ts`.
