/**
 * Run once to regenerate generated.ts:
 *   npx tsx server/challenges/buildGenerated.ts
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Challenge, ChallengeType, SubmissionMode } from '../challengeTypes.js'
import { defaultTimer } from './timers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function c(
  id: number,
  title: string,
  description: string,
  type: ChallengeType,
  opts?: { timeLimitSeconds?: number | null; submissionMode?: SubmissionMode },
): Challenge {
  const mode = opts?.submissionMode
  const timeLimitSeconds =
    opts?.timeLimitSeconds === null
      ? undefined
      : (opts?.timeLimitSeconds ?? defaultTimer(type, mode))
  const challenge: Challenge = { id: `c-${String(id).padStart(3, '0')}`, title, description, type }
  if (timeLimitSeconds != null) challenge.timeLimitSeconds = timeLimitSeconds
  if (mode) challenge.submissionMode = mode
  return challenge
}

function build(): Challenge[] {
  const out: Challenge[] = []
  let id = 31

  const colors = [
    'röd',
    'blå',
    'grön',
    'gul',
    'lila',
    'orange',
    'rosa',
    'svart',
    'vit',
    'brun',
    'turkos',
    'silver',
  ]
  for (const color of colors) {
    out.push(
      c(
        id++,
        `Något ${color}`,
        `Hämta det mest ${color}a föremålet du kan hitta. Vid oavgjort vinner störst föremål. Din tid börjar nu.`,
        'speed',
        { submissionMode: 'physical' },
      ),
      c(
        id++,
        `${color.charAt(0).toUpperCase() + color.slice(1)} jakt`,
        `Ta med dig tre olika ${color}a saker. Testledaren bedömer vem som hade mest övertygande ${color} samling.`,
        'speed',
        { submissionMode: 'physical' },
      ),
    )
  }

  const fetchTargets = [
    ['rund', 'Det rundaste föremålet du kan hitta vinner.'],
    ['tung', 'Det tyngsta föremålet du kan bära tillbaka till testledaren vinner.'],
    ['mjuk', 'Det mjukaste föremålet vinner. Testledaren får klämma.'],
    ['gammalt', 'Det äldsta föremålet med tydlig ålder vinner — motivera muntligt.'],
    ['konstigt', 'Det konstigaste föremålet i hemmet vinner.'],
    ['dyrt', 'Det som ser dyrast ut vinner. Priset spelar ingen roll.'],
    ['billigt', 'Det billigaste föremålet du hittar vinner.'],
    ['stort', 'Det största föremålet du kan bära ensam vinner.'],
    ['litet', 'Det minsta föremålet som syns med blotta ögat vinner.'],
    ['blankt', 'Det blankaste/speglande föremålet vinner.'],
    ['ljudligt', 'Det föremål som gör bäst ljud när testledaren testar det vinner.'],
    ['doftande', 'Det doftande föremålet med bäst (eller värst) doft vinner.'],
    ['klibbigt', 'Det klibbigaste föremålet du vågar ta med vinner.'],
    ['skarpt', 'Det vassaste föremålet du hittar vinner — var försiktig!'],
    ['varmt', 'Det varmaste föremålet just nu vinner.'],
  ] as const
  for (const [adj, rule] of fetchTargets) {
    out.push(
      c(
        id++,
        `Något ${adj}`,
        `Hämta något ${adj}. ${rule} Din tid börjar nu.`,
        'speed',
        { submissionMode: 'physical' },
      ),
    )
  }

  const drawPrompts = [
    ['Självporträtt', 'Rita ett självporträtt utan att titta i spegel. Testledaren bedömer likheten.'],
    ['Drömhus', 'Rita ditt drömhus på tre sekunder — nej, du har mer tid, men håll det enkelt.'],
    ['Monster', 'Rita ett monster som bor under soffan. Mest skrämmande vinner.'],
    ['Superhjälte', 'Rita dig själv som superhjälte. Mest heroisk vinner.'],
    ['Katt-hund', 'Rita en katt som tror att den är en hund.'],
    ['Robot', 'Rita en robot som gör något vardagligt (t.ex. diskar).'],
    ['Karta hem', 'Rita en karta från dörren till kylskåpet.'],
    ['Familjeträd', 'Rita ett familjeträd — figurer räcker, namn valfritt.'],
    ['Logo', 'Designa en logotyp för kvällens fest. Ett tecken räcker.'],
    ['Emblem', 'Rita ett emblem för din egen hederliga orden.'],
    ['Flagga', 'Designa en flagga för det här rummet.'],
    ['Tatuering', 'Rita en tatuering testledaren borde skaffa.'],
    ['Tatuering del 2', 'Rita samma tatuering på fel kroppsdel.'],
    ['Maträtt', 'Rita dagens middag som fine dining-upplägg.'],
    ['Alien', 'Rita en alien som precis landat i hallen.'],
    ['Dinosaurie', 'Rita en dinosaurie som klarar vuxenlivet.'],
    ['Banan 2.0', 'Rita en frukt som är för cool för att vara frukt.'],
    ['Husdjur', 'Rita ditt påhittade husdjur.'],
    ['Skor', 'Rita skor designade för att gå på lava.'],
    ['Hatt', 'Rita världens mest over-the-top hatt.'],
    ['Vinter', 'Rita en snögubbe i badshorts.'],
    ['Sommar', 'Rita en sol som är trött på sommaren.'],
    ['Musik', 'Rita hur din favoritlåt skulle se ut som form.'],
    ['Kaos', 'Rita kaos. Förklara inte.'],
    ['Ord', 'Rita ordet "TOMTE" utan att skriva bokstäver — bara bild.'],
    ['Pil', 'Rita en pil som pekar på testledarens nästa karriärsteg.'],
    ['Hjärna', 'Rita en hjärna som tänker på något pinsamt.'],
    ['Hand', 'Rita din hand utan att titta på den.'],
    ['Fot', 'Rita din fot med skon på — blundar du? Det får du välja.'],
    ['Rymden', 'Rita en planet där alla bara fikar.'],
    ['Bil', 'Rita en bil som passar testledarens personlighet.'],
    ['Båt', 'Rita en båt som seglar på te.'],
    ['Träd', 'Rita ett träd som har sett saker.'],
    ['Blomma', 'Rita en blomma som är sur på måndagar.'],
    ['Insekter', 'Rita tre insekter som diskuterar vädret.'],
    ['Stad', 'Rita en stad där alla hus är kuddar.'],
    ['Bro', 'Rita en bro mellan två möbler i rummet.'],
    ['Tåg', 'Rita ett tåg som är försenat av känslor.'],
    ['Flygplan', 'Rita ett flygplan som är rädd för höjder.'],
    ['Glass', 'Rita världens sorgligaste glass.'],
  ] as const
  for (const [title, desc] of drawPrompts) {
    out.push(
      c(id++, title, `${desc} Din tid börjar nu.`, 'creative', { submissionMode: 'draw' }),
    )
  }

  const textPrompts = [
    ['Haiku om ledaren', 'Skriv ett haiku om testledaren. Fem-sju-fem stavelser om du orkar.'],
    ['Fake tweet', 'Skriv en tweet från testledaren som skulle ställa till det.'],
    ['Rubrik', 'Skriv en tidningsrubrik om det som hände dig senaste dygnet.'],
    ['Recension 2', 'Ge kvällens snacks betyg 1–5 och motivera som en krass matkritiker.'],
    ['Reklam', 'Skriv en reklamtext för något oanvändbart i rummet.'],
    ['Sångtext', 'Skriv två rader sångtext om att vara i det här rummet.'],
    ['Rap', 'Skriv fyra rader rap om testledarens domarenergi.'],
    ['Horoskop', 'Skriv dagens horoskop för testledaren.'],
    ['Obituary', 'Skriv en överdrivet dramatisk nekrolog för en socka som försvann.'],
    ['Manual', 'Skriv en felaktig bruksanvisning för en stol.'],
    ['Varning', 'Skriv en varningsskylt för testledarens humör.'],
    ['Brev', 'Skriv ett kort brev till ditt framtida jag efter den här kvällen.'],
    ['Lista', 'Skriv en topplista: tre saker som borde vara olagliga i det här rummet.'],
    ['Regler', 'Skriv tre nya husregler för kvällen.'],
    ['Namn', 'Hitta på ett nytt ord för "när någon tar sista biten utan att fråga".'],
    ['Definition', 'Skriv en falsk ordboksdefinition av "testledare".'],
    ['Dialog', 'Skriv dialog mellan två möbler i rummet.'],
    ['Film', 'Skriv en logline till en skräckfilm som utspelar sig här.'],
    ['Podcast', 'Skriv intro till en true crime-podcast om försvunna fjärrkontroller.'],
    ['SMS', 'Skriv det mest pinsamma SMS du kan hitta på att skicka till fel person.'],
    ['Status', 'Skriv en Facebook-status från 2012 om den här kvällen.'],
    ['LinkedIn', 'Skriv en cringe LinkedIn-post om att "vinna" det här testet.'],
    ['Tinder', 'Skriv en Tinder-bio för testledaren baserat på ikväll.'],
    ['Yelp', 'Recensera testledarens domarskrik som om det vore en restaurang.'],
    ['Amazon', 'Skriv en femstjärnig recension av något helt meningslöst.'],
    ['Dröm', 'Beskriv en absurd dröm där alla här är med.'],
    ['Alibi', 'Skriv ditt alibi för var du var igår kl. 19:00.'],
    ['Konspiration', 'Skriv en konspirationsteori om varför testledaren har den kappen.'],
    ['Manifest', 'Skriv tre punkter i ett manifest för laget som förlorar.'],
    ['Tal', 'Skriv början på ett seger- eller förlusttal till laget.'],
    ['Barnbok', 'Skriv första meningen i en barnbok om en testledare.'],
    ['Slutet', 'Skriv slutet på en saga som började med "Det var en gång en kudde".'],
    ['Rätt stavning', 'Stava testledarens namn på fem kreativa sätt.'],
    ['Acronym', 'Skapa en förkortning av ditt namn som låter som en myndighet.'],
    ['Slogan', 'Skriv en reklamslogan för att sälja tystnad i det här rummet.'],
  ] as const
  for (const [title, desc] of textPrompts) {
    out.push(
      c(id++, title, `${desc} Din tid börjar nu.`, 'subjective', { submissionMode: 'text' }),
    )
  }

  const performSubjective = [
    ['News anchor', 'Läs upp din senaste tanke högt som en nyhetsuppläsare. Bäst gravitas vinner.'],
    ['Opera', 'Sjung (eller nynna) en mening om testledaren operastil.'],
    ['Shakespeare', 'Framför en Shakespeare-monolog om att vara hungrig.'],
    ['Robotdans', 'Dansa som en robot tills testledaren säger stopp. Mest mekaniskt vinner.'],
    ['Staty', 'Stå som en staty. Den som rör sig minst efter stopp vinner.'],
    ['Tunga twister', 'Säg "sju sjösjuka sjömän" fem gånger snabbt. Flest klara utan att skratta vinner.'],
    ['Accent', 'Prata med en accent i 30 sekunder. Testledaren väljer bäst (och värst).'],
    ['Whisper', 'Viska något dramatiskt till testledaren. Mest teatralt vinner.'],
    ['Rädd', 'Spela upp att du just såg ett spöke bakom testledaren.'],
    ['Reklamfilm', 'Gör en 15-sekunders reklam för vatten.'],
    ['Nature documentary', 'Kommentera testledaren som David Attenborough.'],
    ['Sport', 'Ge en sportkommentator-beskrivning av någon i rummet.'],
    ['Weather', 'Presentera vädret i det här rummet som en meteorolog.'],
    ['Auction', 'Ropa ut ett föremål i rummet på auktion. Högst bud vinner inget — bara poäng.'],
    ['Motivation', 'Ge testledaren en överdrivet peppig motivationsmonolog.'],
    ['Therapist', 'Ge testledaren tre sekunders terapi.'],
    ['Fortune teller', 'Spå testledarens framtid baserat på deras skor.'],
    ['Chef', 'Låtsas vara kock och presentera en imaginär rätt.'],
    ['Pilot', 'Gör säkerhetsinstruktioner för det här rummet.'],
    ['Tour guide', 'Guida oss genom rummet som om det vore ett museum.'],
    ['Villain', 'Presentera dig som skurk och förklara din plan.'],
    ['Hero entrance', 'Gör en hjältemodig entré in i bild.'],
    ['Slow motion', 'Gör något vardagligt i slow motion. Mest filmiskt vinner.'],
    ['Mime', 'Mima att du klättrar på en osynlig stege.'],
    ['Puppet', 'Låt din hand vara en marionett som introducerar dig.'],
    ['Evil laugh', 'Gör det bästa skurklig skrattet.'],
    ['Compliment battle', 'Ge testledaren den mest specifika komplimangen.'],
    ['Roast', 'Ge testledaren en mild roast som ändå känns ärlig.'],
    ['Pickup line', 'Använd en raggningsreplik på ett kaffekopp.'],
    ['Breakup', 'Gör slut med en stol på ett dramatiskt sätt.'],
  ] as const
  for (const [title, desc] of performSubjective) {
    out.push(
      c(id++, title, desc, 'subjective', { submissionMode: 'physical', timeLimitSeconds: null }),
    )
  }

  const endurance = [
    ['Handuppristräning', 'Håll händerna rakt upp i luften. Sista som står kvar vinner.'],
    ['Squat hold', 'Stå i squat. Sista person som håller vinner.'],
    ['Vägg-sits', 'Sitt mot väggen som om du hade en osynlig stol. Sista vinner.'],
    ['Armhävningar', 'Gör så många armhävningar (på knä räknas) tills testledaren avslutar.'],
    ['Hopp på ett ben', 'Hoppa på ett ben. Sista som hoppar vinner.'],
    ['Tung blick', 'Stirra på testledaren utan att blinka. Sista som blinkar förlorar — vinnare är kvar.'],
    ['Ingen skratt', 'Testledaren försöker få dig att skratta. Sista som håller sig allvarlig vinner.'],
    ['Bubble face', 'Blås kinderna och håll luften. Sista vinner.'],
    ['Tongue out', 'Stick ut tungan och håll. Sista vinner.'],
    ['Superman', 'Ligg som superman (armar och ben lyft). Sista vinner.'],
    ['Bok på huvudet', 'Balansera en bok på huvudet. Sista som tappar förlorar.'],
    ['Te-glas', 'Håll en mugg/teglas med utsträckt arm. Sista vinner.'],
    ['Kedja', 'Håll i någons axel och stå still. Kedjan får inte brytas.'],
    ['Högsta ljudet 2', 'Gör ett ljud och håll det. Längst vinner.'],
    ['Andning', 'Andas så tyst du kan medan testledaren lyssnar. Mest tyst vinner.'],
    ['Stå på tå', 'Stå på tå. Sista vinner.'],
    ['Knäböj', 'Håll knäböj. Sista vinner.'],
    ['Planka på knä', 'Planka på knä om full planka är för hårt. Sista vinner.'],
    ['Vända på huvudet', 'Stå upp och ned (huvudet nedåt mot möbel) så länge du orkar.'],
    ['Finger fight', 'Håll pekfingret upp utan att böja det. Sista vinner.'],
    ['Ingen ord', 'Du får inte prata. Sista som pratar förlorar.'],
    ['Leendets fång', 'Le utan att skratta. Sista som skrattar förlorar.'],
    ['Kramkudde', 'Krama en kudde hårt. Sista som släpper vinner.'],
    ['Iskall', 'Håll något kallt från kylen. Sista vinner.'],
    ['Vänta', 'Stå helt still i mitten av rummet. Sista som rör sig vinner.'],
  ] as const
  for (const [title, desc] of endurance) {
    out.push(c(id++, title, `${desc} Testledaren avslutar när det är klart.`, 'endurance'))
  }

  const creativeBuild = [
    ['Hatt av det du har', 'Bygg en hatt av föremål du har på dig eller inom räckhåll.'],
    ['Krona', 'Bygg en krona värdig testledaren.'],
    ['Trofé', 'Bygg ett trofé för kvällens förlorare.'],
    ['Monument', 'Bygg ett monument över dagens första måltid.'],
    ['Bro', 'Bygg en bro mellan två ytor med saker i rummet.'],
    ['Bil', 'Bygg en "bil" du kan sitta i.'],
    ['Flygplan', 'Bygg något som ser flygplan-aktigt ut.'],
    ['Båt', 'Bygg en båt som flottar i badkaret — nej, den får stå på golvet.'],
    ['Robot', 'Bygg en robot av minst fem delar.'],
    ['Dinosaurie', 'Bygg en dinosaurie som hotar testledaren.'],
    ['Museum', 'Ställ ut tre föremål som ett mini-museum med etiketter (muntligt räcker).'],
    ['Mode', 'Skapa en outfit av hushållspapper, filtar eller vad som finns.'],
    ['Skylt', 'Gör en protestskylt om något löjligt i rummet.'],
    ['Flagga fysisk', 'Bygg en fysisk flagga för ditt lag.'],
    ['Instrument', 'Bygg ett musikinstrument som faktiskt låter.'],
    ['Telefon', 'Bygg en "telefon" och ring testledaren.'],
    ['Kamera', 'Bygg en kamera och "fota" testledaren.'],
    ['Trädgård', 'Bygg en miniatyrträdgård på bordet.'],
    ['Stad', 'Bygg en stad i miniatyr.'],
    ['Landskap', 'Bygg ett landskap med minst tre höjdnivåer.'],
    ['Mat', 'Presentera en "maträtt" av minst tre ingredienser visuellt.'],
    ['Cocktail', 'Skapa en mocktail och presentera den som om du vore bartender.'],
    ['Present', 'Slå in en meningslös gåva till testledaren.'],
    ['Time capsule', 'Packa en tidskapsel av tre saker från rummet.'],
    ['Altare', 'Bygg ett mini-altare till testledaren.'],
    ['Tron', 'Bygg en tron av kuddar.'],
    ['Fängelse', 'Bygg ett fängelse för en mobiltelefon.'],
    ['Zoo', 'Bygg burar för tre "djur" (föremål).'],
    ['Parad', 'Linje upp föremål i parad och presentera dem.'],
    ['Red carpet', 'Bygg en röda mattan-upplevelse med det du har.'],
  ] as const
  for (const [title, desc] of creativeBuild) {
    out.push(
      c(id++, title, `${desc} Testledaren bedömer när du är klar.`, 'creative', {
        submissionMode: 'physical',
      }),
    )
  }

  const speedPhysical = [
    ['Skosnöre', 'Knyt skosnörena snabbast. Båda skorna.'],
    ['Sängbäddning', 'Bädda om en säng eller soffa snyggast snabbast.'],
    ['Pappersflygplan', 'Vik ett pappersflygplan som flyger längst.'],
    ['Torn av kort', 'Bygg högst torn av spelkort eller papper.'],
    ['Balans', 'Balansera en sked på näsan längst.'],
    ['Kast', 'Kasta något mjukt i en korg/balja längst avstånd.'],
    ['Hopprep', 'Hoppa hopprep (inbillat räknas om rep saknas) flest gånger på 30 sek.'],
    ['Push-ups snabb', 'Flest armhävningar på tid — testledaren räknar.'],
    ['Jumping jacks', 'Flest jumping jacks på tid.'],
    ['High knees', 'Flest high knees på tid.'],
    ['Spin', 'Snurra runt och stå still utan att ramla.'],
    ['Limbo', 'Gå under något utan att röra det. Lägst vinner.'],
    ['Limbo 2', 'Håll en bok på huvudet och gå snabbast till dörren.'],
    ['Transfer', 'Flytta tre föremål från A till B snabbast.'],
    ['Sort', 'Sortera tio saker efter färg snabbast.'],
    ['Fold', 'Vik en filt eller handduk snyggast snabbast.'],
    ['Stack cups', 'Stapla flest muggar/koppar utan att de faller.'],
    ['Ping pong', 'Studsa en boll (eller servett) flest gånger.'],
    ['Keepy uppy', 'Håll en ballong/servett i luften längst.'],
    ['Crab walk', 'Gå som krabba snabbast tvärs rummet.'],
    ['Bear crawl', 'Björngång snabbast.'],
    ['Backwards', 'Gå baklänges snabbast till vald punkt.'],
    ['Whisper run', 'Spring tystast till dörren och tillbaka.'],
    ['Object relay', 'Tagga testledaren med ett föremål snabbast (försiktigt!).'],
    ['Paper tear', 'Riv papper i en så lång remsa som möjligt.'],
    ['Origami', 'Vik en svan snabbast (ful får vara).'],
    ['Knot', 'Knyt flest knutar på ett rep/snöre på tid.'],
    ['Coin flip', 'Flest lyckade myntkast i rad (mynt valfritt — låtsas räknas med heder).'],
    ['Dice roll', 'Kasta tärning högst totalt på tre kast.'],
    ['Card house', 'Bygg högst korthus på kort tid.'],
  ] as const
  for (const [title, desc] of speedPhysical) {
    out.push(
      c(id++, title, `${desc} Din tid börjar nu.`, 'speed', { submissionMode: 'physical' }),
    )
  }

  const sillyMixed = [
    ['Byt plats', 'Byt plats med någon utan att prata. Snabbast och smidigast vinner.'],
    ['Mystery box', 'Hämta något från ett annat rum utan att säga vad. Testledaren gissar.'],
    ['Outfit swap', 'Byt en accessoar med någon. Bäst match vinner.'],
    ['Sock puppet', 'Gör en strumpdocka och introducera den.'],
    ['Fort', 'Bygg ett fort och försvara det med en mening.'],
    ['Campfire', 'Berätta en skräckhistoria om en lampa.'],
    ['Commercial break', 'Gör en reklam paus för att sträcka på benen.'],
    ['Weather report 2', 'Rapportera temperaturen i kylskåpet (om du vågar kolla).'],
    ['Tre saker', 'Presentera tre saker du alltid har med dig (påhittat halvt räknas).'],
    ['Show and tell', 'Visa upp det mest pinsamma i din telefon (inga privata bilder!).'],
    ['Talent', 'Visa en dold talang.'],
    ['No talent', 'Visa upp något du är dålig på med stolthet.'],
    ['Group pose', 'Organisera gruppen i en pose. Testledaren fotar eller bedömer.'],
    ['Human letter', 'Bilda en bokstav med kroppen tillsammans med andra — eller solo.'],
    ['Soundtrack', 'Nynna en låt som passar testledaren just nu.'],
    ['Sound effect', 'Gör ljudeffekter till testledarens promenad.'],
    ['Slow clap', 'Starta en slow clap som känns motiverad.'],
    ['Standing ovation', 'Ge testledaren stående ovation. Mest genuint vinner.'],
    ['Award speech', 'Håll ett tacktal för en prisutdelning som inte hänt.'],
    ['Acceptance speech', 'Tacka någon som inte finns.'],
    ['Translator', 'Översätt testledarens senaste mening till "piratsvenska".'],
    ['Lawyer', 'Försvara varför du borde få poäng utan att göra något.'],
    ['Detective', 'Lös vem som tog sista kakan (påhittat brott).'],
    ['Scientist', 'Förklara en vardaglig sak med fel vetenskap.'],
    ['Historian', 'Förklara ursprunget till en soffa som om den vore antik.'],
    ['Coach', 'Ge testledaren en halvtidspeptalk.'],
  ] as const
  for (const [title, desc] of sillyMixed) {
    out.push(
      c(
        id++,
        title,
        desc,
        id % 3 === 0 ? 'creative' : id % 2 === 0 ? 'subjective' : 'speed',
        { submissionMode: 'physical' },
      ),
    )
  }

  const extras = [
    ['Pappersplan 2', 'Vik det mest aerodynamiska föremålet av papper du kan.', 'creative', 'physical'],
    ['Mumie', 'Linda in dig själv (eller en kudde) som en mumie snabbast.', 'speed', 'physical'],
    ['Tidning hatt', 'Gör en hatt av tidning eller papper och bär den med stolthet.', 'creative', 'physical'],
    ['Känslo-emoji', 'Få testledaren att gissa vilken emoji du spelar.', 'subjective', 'physical'],
    ['TV-kanal', 'Byt "kanal" genom att spela upp tre olika genrer på 10 sek vardera.', 'creative', 'physical'],
    ['Reality intro', 'Gör en reality-intro av dig själv med namn och catchphrase.', 'subjective', 'physical'],
    ['Kattlåda', 'Bygg en låda som en katt skulle ogilla.', 'creative', 'physical'],
    ['Hundpark', 'Låtsas vara en hund som precis kom till parken.', 'subjective', 'physical'],
    ['Golf', 'Spela minigolf med det du har. Färst i hål vinner.', 'speed', 'physical'],
    ['Bowling', 'Bowla med ett föremål mot PET-flaskor eller liknande.', 'speed', 'physical'],
    ['Dart', 'Kasta något mjukt mot en måltavla (ritad på papper).', 'speed', 'physical'],
    ['Memory', 'Hämta exakt samma föremål som testledaren beskriver från minnet.', 'speed', 'physical'],
    ['Blind fetch', 'Hämta det testledaren säger medan du blundar.', 'speed', 'physical'],
    ['Synonym', 'Hitta ett annat ord för "test" och förklara det som ett nytt koncept.', 'subjective', 'text'],
    ['Haiku om mat', 'Skriv ett haiku om något ätbart i rummet.', 'creative', 'text'],
  ] as const
  for (const [title, desc, type, mode] of extras) {
    out.push(
      c(id++, title, `${desc} Din tid börjar nu.`, type as ChallengeType, {
        submissionMode: mode as SubmissionMode,
      }),
    )
  }

  const partyGold = [
    ['Familjeporträtt', 'Rita hela sällskapet som en tecknad serie. Testledaren väljer bästa karikatyr.', 'creative', 'draw'],
    ['Blundteckning', 'Rita testledarens husdjur (påhittat går) utan att titta på papperet.', 'creative', 'draw'],
    ['En linje', 'Rita testledaren med ett enda obrutet streck. Minst rörigt vinner.', 'creative', 'draw'],
    ['Left hand', 'Rita en blomma med fel hand. Mest symmetrisk vinner.', 'creative', 'draw'],
    ['Logo', 'Designa en logotyp för kvällens test. Mest säljbar vinner.', 'creative', 'draw'],
    ['Skäggteori', 'Rita testledaren med ett episk skägg de inte har. Mest majestätiskt vinner.', 'creative', 'draw'],
    ['Museum', 'Rita ett föremål i rummet som om det vore en dyr konstinstallation.', 'creative', 'draw'],
    ['Albumomslag', 'Rita omslaget till testledarens debutalbum.', 'creative', 'draw'],
    ['Instruktionsmanual', 'Rita en steg-för-steg-guide till att göra te.', 'creative', 'draw'],
    ['Karta', 'Rita en skattkarta till kylskåpet.', 'creative', 'draw'],
    ['Smeknamn 2', 'Hitta på ett smeknamn för personen till höger. Mest träffande vinner.', 'subjective', 'text'],
    ['Recension', 'Skriv en recension av testledarens senaste outfit (1–5 stjärnor).', 'subjective', 'text'],
    ['Rubrik', 'Skriv en clickbait-rubrik om det som hände idag.', 'subjective', 'text'],
    ['Mantra', 'Skriv ett mantra testledaren borde säga varje morgon.', 'subjective', 'text'],
    ['Brev', 'Skriv ett kort brev till ditt framtida jag efter den här kvällen.', 'subjective', 'text'],
    ['Regler', 'Skriv tre absurda regler för ett nytt hemmatest.', 'subjective', 'text'],
    ['Övertalning', 'Skriv två meningar som övertygar testledaren att ge dig poäng.', 'subjective', 'text'],
    ['Rim', 'Skriv ett rim om något i rummet. Mest genialt vinner.', 'creative', 'text'],
    ['Fortsätt meningen', 'Fortsätt: "Det värsta som kan hända på en fredag är…"', 'creative', 'text'],
    ['SMS till chefen', 'Skriv ett SMS du ALDRIG skulle skicka till chefen — men gör det övertygande.', 'subjective', 'text'],
    ['Skrattgaranti', 'Få testledaren att skratta. Först vinner.', 'speed', 'physical'],
    ['Ögonkontakt', 'Håll ögonkontakt med testledaren i 20 sekunder utan att blinka först.', 'speed', 'physical'],
    ['Tyst disco', 'Dansa i 30 sekunder utan att göra ett enda ljud.', 'speed', 'physical'],
    ['Papegoja', 'Upprepa exakt det testledaren säger — med samma ton — i 15 sekunder.', 'speed', 'physical'],
    ['Staty 2', 'Stå som en staty medan testledaren går runt dig och tittar misstänksamt.', 'endurance', 'physical'],
    ['Balans', 'Balansera tre föremål på huvudet. Längst utan att tappa vinner.', 'endurance', 'physical'],
    ['Ordkedja', 'Säg ord som börjar på sista bokstaven i föregående ord. Sista som fastnar vinner.', 'speed', 'physical'],
    ['Mime', 'Mima att du öppnar en osynlig dörr — testledaren ska gissa vad som är bakom.', 'subjective', 'physical'],
    ['Nyhetsflash', 'Rapportera live från vardagsrummet som en nyhetsreporter.', 'subjective', 'physical'],
    ['Opera', 'Sjung testledarens namn som en operasångare.', 'creative', 'physical'],
    ['Rap intro', 'Gör en 10-sekunders rap-intro om dig själv.', 'creative', 'physical'],
    ['Kunglig hälsning', 'Hälsa på testledaren som om de vore kunglighet.', 'subjective', 'physical'],
    ['Tidningsfoto', 'Posera för ett tidningsfoto efter en påhittad skandal.', 'subjective', 'physical'],
    ['Reality-klipp', 'Spela upp dramat från när någon tog sista biten tårta.', 'subjective', 'physical'],
    ['Infomercial', 'Sälj ett vardagligt föremål i rummet som om det kostade en miljon.', 'subjective', 'physical'],
    ['Nature documentary', 'Kommentera testledaren som David Attenborough.', 'subjective', 'physical'],
    ['Weather report', 'Ge en väderrapport för stämningen i rummet.', 'subjective', 'physical'],
    ['Translator', 'Översätt testledarens senaste mening till sura farbror-svenska.', 'subjective', 'physical'],
    ['Motivation', 'Ge testledaren en peptalk som om de ska in i en boxningsmatch.', 'subjective', 'physical'],
    ['Röd matta', 'Gör en röd-matta-entré från dörren till testledaren.', 'speed', 'physical'],
    ['Pillow fort', 'Bygg en kuddfästning på 60 sekunder. Mest imponerande vinner.', 'speed', 'physical'],
    ['Pappersflyg', 'Vik ett pappersflygplan som flyger längst.', 'speed', 'physical'],
    ['Tårchallenge', 'Försök få fram en tår på 10 sekunder (skådespeleri räknas).', 'subjective', 'physical'],
    ['Accent', 'Läs upp testledarens senaste instruktion med en ny accent.', 'creative', 'physical'],
    ['Robot 2', 'Rör dig som en robot tills testledaren säger stopp.', 'speed', 'physical'],
    ['Zombie', 'Gå som en zombie mot testledaren — mest skrämmande vinner.', 'speed', 'physical'],
    ['Ninja', 'Ta dig från din plats till testledaren så tyst du kan.', 'speed', 'physical'],
    ['Magiker', 'Gör ett "trick" med ett föremål i rummet. Mest magiskt vinner.', 'creative', 'physical'],
    ['Viking', 'Hälsa testledaren som en viking som kommit hem från plundring.', 'subjective', 'physical'],
    ['Alien', 'Förklara jordens sedvänjor för testledaren som ett utomjordiskt väsen.', 'subjective', 'physical'],
    ['Gissning', 'Gissa testledarens favoritgodis. Närmast vinner.', 'subjective', 'physical'],
    ['Minnesbild', 'Beskriv testledarens outfit i detalj — utan att titta.', 'subjective', 'text'],
    ['Emoji-berättelse', 'Berätta hur kvällen började med minst fem emojis (skriv dem).', 'creative', 'text'],
    ['Film pitch', 'Pitcha en film baserad på testledarens personlighet.', 'creative', 'text'],
    ['Spelidé', 'Beskriv ett brädspel testledaren skulle vara bra på.', 'creative', 'text'],
    ['Superkraft', 'Välj en superkraft åt testledaren och motivera.', 'subjective', 'text'],
    ['Skvaller', 'Skriv en påhittad skvallerrubrik om någon i rummet (snällt!).', 'subjective', 'text'],
    ['Middagsmeny', 'Planera en trerättersmiddag testledaren skulle älska.', 'creative', 'text'],
    ['Bucket list', 'Skriv tre saker testledaren borde göra innan året är slut.', 'subjective', 'text'],
    ['Horoskop', 'Skriv testledarens horoskop för kvällen.', 'subjective', 'text'],
    ['Reklam', 'Skriv en 15-sekunders reklamtext för testledaren som produkt.', 'creative', 'text'],
    ['Podcast', 'Ge testledaren ett podcastnamn och beskriv första avsnittet.', 'creative', 'text'],
    ['Hemlighet', 'Viska en (påhittad) hemlighet om testledaren till gruppen.', 'subjective', 'physical'],
    ['Compliment battle', 'Ge testledaren det bästa komplimangen du kan — utan att upprepa någon annan.', 'subjective', 'physical'],
    ['Roast light', 'Säg något snällt-men-petigt om testledaren med ett leende.', 'subjective', 'physical'],
    ['High five', 'Ge testledaren den mest överdrivna high five du kan.', 'speed', 'physical'],
    ['Fist bump', 'Inspirera till världens smidigaste fist bump.', 'speed', 'physical'],
    ['Handskakning', 'Gör en alldeles för formell handskakning med testledaren.', 'subjective', 'physical'],
    ['Namn på nytt', 'Döp om testledaren till något episk — och förklara varför.', 'subjective', 'physical'],
    ['Walk of shame', 'Gör en "walk of shame" från kylskåpet till testledaren.', 'speed', 'physical'],
    ['Victory lap', 'Ta en segervarv runt rummet som om du redan vunnit.', 'speed', 'physical'],
    ['Slow walk', 'Gå i slow motion från dörren till testledaren med dramatisk musik (nynna).', 'subjective', 'physical'],
    ['Hide item', 'Göm ett föremål så testledaren har svårt att hitta det på 30 sekunder.', 'speed', 'physical'],
    ['Find item', 'Hitta något i rummet som börjar på samma bokstav som ditt namn.', 'speed', 'physical'],
    ['Twin item', 'Hitta ett föremål som "matchar" testledarens energi. Motivera.', 'subjective', 'physical'],
    ['Worst gift', 'Presentera det sämsta tänkbara julklappet till testledaren.', 'subjective', 'physical'],
    ['Best gift', 'Presentera det bästa tänkbara julklappet — med ett föremål i rummet.', 'subjective', 'physical'],
    ['Auction 2', 'Auktionera ut din plats i soffan. Mest övertygande bud vinner.', 'subjective', 'physical'],
    ['Charades', 'Spela charader — testledaren ska gissa på 60 sekunder.', 'speed', 'physical'],
    ['Reverse charades', 'Alla utom en ska gissa — den ene mima.', 'speed', 'physical'],
    ['Sound quiz', 'Imitera ett djur — testledaren gissar.', 'speed', 'physical'],
    ['Instrument', 'Imitera ett instrument med bara munnen.', 'creative', 'physical'],
    ['Beatbox', 'Gör 10 sekunder beatbox. Mest rytmiskt vinner.', 'creative', 'physical'],
    ['Whistle', 'Vissla en melodi testledaren ska gissa.', 'speed', 'physical'],
    ['Humming', 'Nynna en låt — testledaren gissar titeln.', 'speed', 'physical'],
    ['One word', 'Beskriv testledaren med exakt ett ord — och förklara.', 'subjective', 'text'],
    ['Two truths', 'Skriv två sanna och en falsk sak om dig — testledaren gissar lögnen.', 'subjective', 'text'],
    ['Would you rather', 'Ställ en "skulle du hellre"-fråga till testledaren och svara själv.', 'subjective', 'text'],
    ['Hot take', 'Skriv en kontroversiell matåsikt och försvara den.', 'subjective', 'text'],
    ['Unpopular opinion', 'Dela en impopulär åsikt om något harmlöst.', 'subjective', 'text'],
    ['Complaint letter', 'Skriv ett klagomål till universum om något smått.', 'creative', 'text'],
    ['Thank you note', 'Skriv ett tackkort till testledaren för kvällen.', 'subjective', 'text'],
    ['Fortune cookie', 'Skriv en fortune cookie-text för testledaren.', 'subjective', 'text'],
    ['Spell', 'Skapa en trollformel testledaren kan använda imorgon bitti.', 'creative', 'text'],
    ['Spell name', 'Döp en magisk besvärjelse efter testledaren.', 'creative', 'text'],
    ['Plank 2', 'Planka medan du säger något uppmuntrande till testledaren.', 'endurance', 'physical'],
    ['Wall sit 2', 'Vägg-sits medan du håller ögonkontakt med testledaren.', 'endurance', 'physical'],
    ['Toe touch', 'Rör tårna utan att böja knäna — eller visa hur nära du kommer.', 'speed', 'physical'],
    ['Jumping jacks', 'Gör flest jumping jacks på 20 sekunder.', 'speed', 'physical'],
    ['Push ups', 'Gör flest armhävningar (på knä räknas) på 20 sekunder.', 'speed', 'physical'],
    ['Sit ups', 'Gör flest situps på 20 sekunder.', 'speed', 'physical'],
    ['Lunge walk', 'Gå lunge till testledaren och tillbaka snabbast.', 'speed', 'physical'],
    ['Crab walk', 'Krabbgång till testledaren. Snabbast vinner.', 'speed', 'physical'],
    ['Bear crawl', 'Björngång runt rummet en gång. Snabbast vinner.', 'speed', 'physical'],
    ['Egg spoon', 'Balansera något på en sked (eller sked-liknande) till testledaren.', 'speed', 'physical'],
    ['Book balance', 'Balansera en bok på huvudet till testledaren.', 'speed', 'physical'],
    ['No thumbs', 'Gör något enkelt utan att använda tummarna — testledaren bedömer.', 'subjective', 'physical'],
    ['Backwards', 'Säg alfabetet baklänges så långt du kan på 30 sekunder.', 'speed', 'physical'],
    ['Count', 'Räkna till 50 på ett ovanligt språk eller dialekt.', 'creative', 'physical'],
    ['Tongue twister 2', 'Säg "fem fina fransmän" tio gånger snabbt.', 'speed', 'physical'],
    ['Breath hold', 'Håll andan längst. Testledaren avslutar när det är klart.', 'endurance', 'physical'],
    ['Staring contest', 'Stirratävling med testledaren — först som blinkar förlorar.', 'endurance', 'physical'],
    ['No smile', 'Testledaren försöker få dig att le — håll neutralt ansikte längst.', 'endurance', 'physical'],
    ['Compliment chain', 'Ge komplimang till personen till vänster — kedjan fortsätter till testledaren.', 'subjective', 'physical'],
    ['Group photo', 'Organisera gruppen för ett påhittat omslagsfoto på 30 sekunder.', 'speed', 'physical'],
    ['Human pyramid', 'Bygg en mänsklig pyramid (säkert!) — högst vinner.', 'speed', 'physical'],
    ['Synchronized', 'Gör samma rörelse som testledaren i 15 sekunder utan att tappa.', 'speed', 'physical'],
    ['Mirror', 'Spegla testledarens rörelser i 20 sekunder.', 'speed', 'physical'],
    ['Shadow', 'Följ testledaren som en skugga runt rummet.', 'speed', 'physical'],
    ['Red light', 'Gå mot testledaren — stopp när de säger rött ljus.', 'speed', 'physical'],
    ['Musical chairs', 'Lek musikaliska stolar med kuddar (testledaren styr musiken).', 'speed', 'physical'],
    ['Hot potato', 'Kasta ett mjukt föremål — sista som håller när tiden går ut förlorar.', 'speed', 'physical'],
    ['Pass the sound', 'Skicka vidare ett ljud runt cirkeln — snabbast klara vinner.', 'speed', 'physical'],
    ['Build tower', 'Bygg högst torn av det du hittar på 60 sekunder.', 'speed', 'physical'],
    ['Bridge', 'Bygg en bro mellan två möbler med böcker/kuddar — håll längst.', 'endurance', 'physical'],
    ['Paper hat 2', 'Vik en hatt och bär den med attityd resten av rundan.', 'creative', 'physical'],
    ['Origami', 'Vik något av papper — testledaren bedömer skicklighet.', 'creative', 'physical'],
    ['Collage', 'Beskriv en collage av testledaren med ord (minst fem adjektiv).', 'creative', 'text'],
    ['Museum label', 'Skriv museibeskrivningen för ett föremål testledaren pekar på.', 'creative', 'text'],
    ['Obituary', 'Skriv en (humoristisk) tidningsnotis om att testledaren "försvann i soffan".', 'creative', 'text'],
    ['Wanted poster', 'Skriv en "efterlyses"-affisch för testledaren.', 'creative', 'text'],
    ['Recipe', 'Skriv receptet på den perfekta fredagskvällen.', 'creative', 'text'],
    ['Instruction manual', 'Skriv en bruksanvisning för testledaren.', 'creative', 'text'],
    ['Warning label', 'Skriv en varningsetikett för testledaren.', 'creative', 'text'],
    ['Product review', 'Ge testledaren betyg som om de vore en produkt på nätet.', 'subjective', 'text'],
    ['Yelp review', 'Skriv en Yelp-recension av kvällens test.', 'subjective', 'text'],
    ['TripAdvisor', 'Skriv en TripAdvisor-recension av vardagsrummet.', 'subjective', 'text'],
    ['Final toast', 'Håll ett kort skåltal för kvällen — max 20 sekunder.', 'subjective', 'physical'],
  ] as const
  for (const [title, desc, type, mode] of partyGold) {
    out.push(
      c(id++, title, `${desc} Din tid börjar nu.`, type as ChallengeType, {
        submissionMode: mode as SubmissionMode,
      }),
    )
  }

  return out.slice(0, 370)
}

const generated = build()
const header = `// Auto-generated by buildGenerated.ts — do not edit by hand
import type { Challenge } from '../challengeTypes.js'

export const generatedChallenges: Challenge[] = `

const footer = `
`

writeFileSync(
  path.join(__dirname, 'generated.ts'),
  header + JSON.stringify(generated, null, 2) + footer,
  'utf8',
)

console.log(`Generated ${generated.length} challenges (c-031 to c-${String(30 + generated.length).padStart(3, '0')})`)
