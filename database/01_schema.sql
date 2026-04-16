CREATE TABLE Bruger (
    brugerID INT IDENTITY(1,1) NOT NULL, -- automatisk stigende id
    fornavn VARCHAR(100) NOT NULL, -- brugerens fornavn (krav)
    efternavn VARCHAR(100) NOT NULL, -- brugerens efternavn (krav)
    telefon VARCHAR(30) NULL, -- valgfrit telefonnummer
    email VARCHAR(255) NOT NULL, -- bruges til login og identifikation
    foedselsdato DATE NULL, -- valgfri fødselsdato
    investorType VARCHAR(100) NULL, -- type af investor (valgfrit)
    adgangskode VARCHAR(255) NOT NULL, -- adgangskode (simpel løsning, brug af hashing er fravalgt)
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(), -- oprettelsestidspunkt

    CONSTRAINT PK_Bruger PRIMARY KEY (brugerID), -- primærnøgle
    CONSTRAINT UQ_Bruger_Email UNIQUE (email) -- sikrer unik email
);

CREATE TABLE Ejendomsprofil (
    ejendomID INT IDENTITY(1,1) NOT NULL, -- unikt id for ejendom
    brugerID INT NOT NULL, -- reference til ejer (Bruger)
    adresse VARCHAR(255) NOT NULL, -- samlet adresse
    vejnavn VARCHAR(100) NULL, -- vejnavn
    husnr VARCHAR(20) NULL, -- husnummer
    postnr VARCHAR(10) NULL, -- postnummer
    bynavn VARCHAR(100) NULL, -- bynavn
    adgangsadresseID VARCHAR(50) NULL, -- id fra adresse-API, bruges til BBR-opslag
    boligtype VARCHAR(100) NULL, -- type bolig
    byggeaar INT NULL, -- byggeår
    boligareal INT NULL, -- antal m2 bolig
    grundareal INT NULL, -- antal m2 grund
    antalVaerelser INT NULL, -- antal værelser
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(), -- oprettet tidspunkt
    sidstOpdateret DATETIME2 NOT NULL DEFAULT SYSDATETIME(), -- sidst ændret
    erArkiveret BIT NOT NULL DEFAULT 0, -- 0 = aktiv, 1 = arkiveret

    CONSTRAINT PK_Ejendomsprofil PRIMARY KEY (ejendomID), -- primærnøgle
    CONSTRAINT FK_Ejendomsprofil_Bruger 
        FOREIGN KEY (brugerID) REFERENCES Bruger(brugerID), -- kobling til bruger
    CONSTRAINT UQ_Ejendomsprofil_Bruger_Adresse 
        UNIQUE (brugerID, adresse) -- samme bruger kan ikke have samme adresse 2 gange
);

CREATE TABLE Investeringscase (
    caseID INT IDENTITY(1,1) NOT NULL, -- unikt id for case
    ejendomID INT NOT NULL, -- reference til ejendom
    navn VARCHAR(100) NOT NULL, -- navn på casen
    beskrivelse VARCHAR(500) NULL, -- valgfri beskrivelse
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(), -- oprettet tidspunkt

    CONSTRAINT PK_Investeringscase PRIMARY KEY (caseID), -- primærnøgle
    CONSTRAINT FK_Investeringscase_Ejendomsprofil 
        FOREIGN KEY (ejendomID) REFERENCES Ejendomsprofil(ejendomID) -- kobling til ejendom
);
