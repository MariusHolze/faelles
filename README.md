# Estate Scope

Estate Scope er en prototype til PROG-eksamen 2026. Appen bruges til at oprette ejendomsprofiler og simple investeringscases med køb, finansiering, renovering, drift og udlejning.

Projektet er bevidst lavet med almindelig HTML, CSS, JavaScript, Node.js, Express og SQL Server. Der bruges ikke frontend-frameworks.

## Kørsel Lokalt

1. Installer backend-afhængigheder:

```bash
cd backend
npm install
```

2. Opret en lokal `.env` i `backend`:

```bash
cp .env.example .env
```

3. Udfyld databaseoplysninger i `backend/.env`:

```text
PORT=3000
DB_USER=DIT_BRUGERNAVN
DB_PASSWORD=DIT_PASSWORD
DB_SERVER=DIT_SERVERNAVN
DB_DATABASE=DIT_DATABASENAVN
```

4. Start backend:

```bash
npm start
```

5. Åbn frontend i browseren:

```text
http://localhost:3000/index.html
```

## Arkitektur

Projektet er delt i tre enkle lag:

- `frontend/`: HTML, CSS og almindelig JavaScript. Frontend viser UI og kalder backend med `fetch`.
- `backend/`: Express API-routes, databasekald og beregningslogik.
- `database/`: SQL-script til tabeller i SQL Server.

Investeringscase-delen er delt sådan:

- `backend/routes/investeringscaseRoutes.js`: API og SQL Server-adgang.
- `backend/services/investeringscaseBeregner.js`: simple økonomiske beregninger.
- `frontend/investeringscase/`: HTML-sider for de fem formulartrin og caseoverblik.
- `frontend/js/investeringscaseForm.js`: formularlogik.
- `frontend/js/investeringscase.js`: liste og overblik over investeringscases.

## Database

Den primære database oprettes med:

```text
database/01_schema.sql
```

Der er to centrale tabeller:

- `Ejendomsprofil`: adresse og BBR-data for en ejendom.
- `Investeringscase`: en case knyttet til en ejendom.

`Investeringscase.dataJson` gemmer formulartrinene samlet som JSON. Det er et bevidst prototypevalg, fordi casens input kan ændre sig under udvikling uden at databasen skal ændres for hvert nyt felt.

## Investeringscase-Beregninger

Beregningerne ligger i:

```text
backend/services/investeringscaseBeregner.js
```

De vigtigste formler er:

```text
samletInvestering = købsudgifter + renovering
finansieringsbehov = samletInvestering - egenbetaling
nettoleje = leje efter tomgang - udlejningsudgifter
cashflow = nettoleje - driftsudgifter - låneydelse
egenkapital i ejendom = ejendomsværdi - restgæld
samlet investorværdi = egenkapital i ejendom + akkumuleret cashflow
```

Låneydelsen kan indeholde afdrag. Derfor kaldes tallet efter låneydelse for **cashflow** og ikke regnskabsmæssigt resultat.

Ejendomsværdi fremskrives ikke i den nuværende prototype. Købsprisen bruges som en konservativ værdi.

Skat af udlejning vises kun som et estimat.

## Test Af Beregninger

Der findes simple console-baserede tests:

```bash
node backend/testInvesteringscaseBeregninger.js
```

Testene dækker:

- case uden renovering
- case med renovering
- case hvor egenbetaling dækker hele investeringen
- case med negativt cashflow
- case hvor lån afdrages over 30 år

## Bevidst Simple Designvalg

Projektet er en prototype og prioriterer forklarbarhed:

- Ingen React eller andre frontend-frameworks.
- Ingen TypeScript.
- Ingen login/authentication; ejendomsprofiler og cases er fælles i prototypedatabasen.
- Simple Express-routes.
- Simple SQL-tabeller.
- Investeringscase-input gemmes som JSON for fleksibilitet.
- Skatteberegning er kun et estimat.
- Ejendomsværdi holdes konservativt uændret.

## Database-Opdateringer

Hvis databasen oprettes fra bunden, er `database/01_schema.sql` nok.


Hvis databasen allerede findes fra en ældre version, kan disse scripts køres én gang:

- `database/02_add_adresseID.sql`
- `database/03_add_investeringscase_koebspost.sql`
- `database/04_add_investeringscase_trindata.sql`
