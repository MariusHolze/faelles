CREATE TABLE Bruger (
    brugerID INT IDENTITY(1,1) PRIMARY KEY,
    fornavn VARCHAR(100) NOT NULL,
    efternavn VARCHAR(100) NOT NULL,
    telefon VARCHAR(30) NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    foedselsdato DATE NULL,
    investorType VARCHAR(100) NULL,
    adgangskode VARCHAR(255) NOT NULL,
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE Ejendomsprofil (
    ejendomID INT IDENTITY(1,1) PRIMARY KEY,
    brugerID INT NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    vejnavn VARCHAR(100) NULL,
    husnr VARCHAR(20) NULL,
    postnr VARCHAR(10) NULL,
    bynavn VARCHAR(100) NULL,
    boligtype VARCHAR(100) NULL,
    boligareal INT NULL,
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    sidstOpdateret DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    erArkiveret BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_Ejendomsprofil_Bruger
        FOREIGN KEY (brugerID) REFERENCES Bruger(brugerID),
    CONSTRAINT UQ_Ejendom_Bruger_Adresse
        UNIQUE (brugerID, adresse)
);

CREATE TABLE Investeringscase (
    caseID INT IDENTITY(1,1) PRIMARY KEY,
    ejendomID INT NOT NULL,
    navn VARCHAR(100) NOT NULL,
    beskrivelse VARCHAR(500) NULL,
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Investeringscase_Ejendom
        FOREIGN KEY (ejendomID) REFERENCES Ejendomsprofil(ejendomID)
);

SELECT * FROM INFORMATION_SCHEMA.TABLES;