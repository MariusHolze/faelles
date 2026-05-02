# Estate Scope

Estate Scope er en prototype til PROG-eksamen 2026. Appen bruges til at oprette ejendomsprofiler ud fra validerede danske adresser og arbejde med simple investeringscases for ejendomme.

Projektet er bevidst lavet med almindelig HTML, CSS, JavaScript, Node.js, Express og SQL Server. Der bruges ikke frontend-framework.

## Systemets Lag

- `frontend/`: HTML, CSS og JavaScript. Frontend indsamler input, viser ejendomme, kortdata, investeringscases og beregningsresultater.
- `backend/`: Node.js/Express API. Backend håndterer adresseopslag, BBR-data, kortdata, databasekald og investeringscase-beregninger.
- `database/`: SQL Server scripts til tabeller for ejendomsprofiler og investeringscases.

## Start Lokalt

1. Installer backend-afhængigheder:


cd backend
npm install

2. Opret og udfyld `backend/.env`:


cp .env.example .env

3. Start serveren:


npm start

4. Åbn appen:
text
http://localhost:3000/

## Miljøvariabler

`backend/.env` skal indeholde værdier som disse. Brug ikke rigtige passwords eller tokens i README eller frontend.
text
PORT=3000

DB_USER=DIT_BRUGERNAVN
DB_PASSWORD=DIT_PASSWORD
DB_SERVER=DIT_SERVER
DB_DATABASE=DIT_DATABASE

BBR_USERNAME=DIT_DATAFORDELER_BRUGERNAVN
BBR_PASSWORD=DIT_DATAFORDELER_PASSWORD
BBR_BASE_URL=https://services.datafordeler.dk/BBR/BBRPublic/1/rest

DATAFORSYNINGEN_MAP_TOKEN=DIT_KORT_TOKEN

## Database

Kør scripts i denne rækkefølge:
text
database/01_ejendomsprofil.sql
database/02_investeringscase.sql

`Investeringscase` refererer til `Ejendomsprofil`, så ejendomsprofil-tabellen skal oprettes først.

## Vigtige Brugerflows

- **Søg adresse:** Brugeren søger en dansk adresse via forsiden. Adresseforslag hentes fra offentligt API.
- **Opret ejendomsprofil:** Brugeren vælger en adresse og opretter en ejendomsprofil. Backend henter BBR-data. Grundareal er nice to have; hvis det ikke kan hentes, kan resten af BBR-data stadig bruges.
- **Se ejendomsprofiler:** Profilsiden viser gemte ejendomsprofiler og antal tilknyttede investeringscases.
- **Slet ejendomsprofil:** Brugeren advares først. Når profilen slettes, slettes tilknyttede investeringscases også.
- **Opret investeringscase:** Cases oprettes fra investeringscase-overblikket, ikke direkte fra hver ejendomsprofil.
- **Beregn/simuler investeringscase:** Frontend sender input til backend, og backend beregner resultatet og 30-års simuleringen.
- **Sammenlign cases:** Brugeren kan vælge flere eksisterende cases og se dem i en simpel tabel.
- **Duplikér case:** Brugeren kan duplikere en eksisterende case. Den nye case får samme input og kan redigeres bagefter.

## Centrale API-Endpoints

- `GET /api/adresser?soeg=...` - adresseforslag.
- `POST /api/ejendomme` - opret ejendomsprofil med BBR-data.
- `GET /api/ejendomme` - hent gemte ejendomsprofiler.
- `GET /api/ejendomme/find` - find gemt ejendom for en valgt adresse.
- `DELETE /api/ejendomme/:id` - slet ejendomsprofil og tilknyttede investeringscases.
- `GET /api/investeringscases` - hent investeringscases.
- `GET /api/investeringscases/:id` - hent én investeringscase.
- `POST /api/investeringscases/beregn` - beregn investeringscase i backend.
- `POST /api/investeringscases` - opret investeringscase.
- `PUT /api/investeringscases/:id` - opdater investeringscase.
- `POST /api/investeringscases/:id/duplicate` - duplikér investeringscase.
- `DELETE /api/investeringscases/:id` - slet investeringscase.
- `GET /api/kort/ejendom` - hent kortdata for adresse.
- `GET /api/kort/matrikel-wms` - proxy til matrikelkort.

## Investeringscase-Beregning

Beregninger ligger i:
text
backend/services/beregnCase.js

Frontend laver ikke den økonomiske hovedberegning. Frontend samler input, kalder backend og viser resultatet. Backend returnerer blandt andet:

- ejendomspris
- månedligt cashflow
- årligt cashflow
- restgæld over tid
- egenkapital over tid
- 30-års simulering

## Centrale Filer

- `frontend/index.html` - adresseflow og oprettelse af ejendomsprofil.
- `frontend/profil.html` - overblik over ejendomsprofiler.
- `frontend/investeringscase.html` - investeringscase-overblik, formular, sammenligning og duplikering.
- `frontend/js/adresse.js` - adresseflow fra forsiden.
- `frontend/js/profil.js` - visning og sletning af ejendomsprofiler.
- `frontend/js/investeringscaseForm.js` - investeringscase-formular og overblik.
- `frontend/js/kort.js` - kortmodal og kortvisning.
- `backend/routes/ejendomRoutes.js` - API for ejendomsprofiler.
- `backend/routes/investeringscaseRoutes.js` - API for investeringscases.
- `backend/services/bbrService.js` - BBR-opslag.
- `backend/services/beregnCase.js` - beregninger.
- `backend/services/investeringscaseRepository.js` - databaseadgang for investeringscases.

## Test

Der findes simple console-baserede tests af investeringscase-beregningerne:


node backend/testInvesteringscaseBeregninger.js

Testene dækker blandt andet renovering, egenbetaling, negativt cashflow og lån der afdrages over 30 år.

## Bevidst Simple Designvalg

- Ingen login i prototypen.
- Ingen redigering af ejendomsprofiler.
- Investeringscases hører til en ejendomsprofil.
- Ved sletning af ejendomsprofil slettes tilknyttede investeringscases også.
- Grundareal er ikke kritisk for oprettelse, hvis resten af BBR-data kan bruges.
- Sammenligning er en simpel tabel, ikke et avanceret dashboard.
