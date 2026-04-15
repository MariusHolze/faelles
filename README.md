## Kørsel af projektet lokalt

Projektet er en prototype og kræver adgang til en SQL Server database for at fungere fuldt ud.

### Hurtig test (uden database)
Frontend kan åbnes direkte via:

http://localhost:3000/index.html

(hvis backend kører)

### Kørsel med database
For at få fuld funktionalitet (oprettelse af bruger og ejendomme) kræves en databaseforbindelse.

1. Opret en lokal .env fil i backend:

   cp backend/.env.example backend/.env

2. Indsæt dine egne databaseoplysninger:
    Brugernavn og Password er givet i rapportens bilag.
    Det er ikke givet på forhånd. Dette er gjordt for at optimere sikkerhed af vores database. 

    PORT=3000
    DB_USER=DIT_BRUGERNAVN
    DB_PASSWORD=DIT_PASSWORD
    DB_SERVER=eksamensprojektprog2026.database.windows.net
    DB_DATABASE=Ejendomsinvestering-app

3. Installer og start backend:

   cd backend
   npm install
   npm start