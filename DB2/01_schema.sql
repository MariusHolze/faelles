CREATE TABLE Bruger (
    brugerID INT IDENTITY(1,1) NOT NULL,
    fornavn VARCHAR(100) NOT NULL,
    efternavn VARCHAR(100) NOT NULL,
    telefon VARCHAR(30) NULL,
    email VARCHAR(255) NOT NULL,
    foedselsdato DATE NULL,
    investorType VARCHAR(100) NULL,
    adgangskode VARCHAR(255) NOT NULL,
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT PK_Bruger PRIMARY KEY (brugerID),
    CONSTRAINT UQ_Bruger_Email UNIQUE (email)
);

CREATE TABLE Ejendomsprofil (
    ejendomID INT IDENTITY(1,1) NOT NULL,
    brugerID INT NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    vejnavn VARCHAR(100) NULL,
    husnr VARCHAR(20) NULL,
    postnr VARCHAR(10) NULL,
    bynavn VARCHAR(100) NULL,
    boligtype VARCHAR(100) NULL,
    byggeaar INT NULL,
    boligareal INT NULL,
    grundareal INT NULL,
    antalVaerelser INT NULL,
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    sidstOpdateret DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    erArkiveret BIT NOT NULL DEFAULT 0,

    CONSTRAINT PK_Ejendomsprofil PRIMARY KEY (ejendomID),
    CONSTRAINT FK_Ejendomsprofil_Bruger
        FOREIGN KEY (brugerID) REFERENCES Bruger(brugerID),
    CONSTRAINT UQ_Ejendomsprofil_Bruger_Adresse
        UNIQUE (brugerID, adresse)
);

CREATE TABLE Investeringscase (
    caseID INT IDENTITY(1,1) NOT NULL,
    ejendomID INT NOT NULL,
    navn VARCHAR(100) NOT NULL,
    beskrivelse VARCHAR(500) NULL,
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT PK_Investeringscase PRIMARY KEY (caseID),
    CONSTRAINT FK_Investeringscase_Ejendomsprofil
        FOREIGN KEY (ejendomID) REFERENCES Ejendomsprofil(ejendomID)
);
