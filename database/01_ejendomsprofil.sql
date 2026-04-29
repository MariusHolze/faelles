CREATE TABLE Ejendomsprofil (
    ejendomID INT IDENTITY(1,1) NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    adresseID VARCHAR(50) NULL,
    vejnavn VARCHAR(100) NULL,
    husnr VARCHAR(20) NULL,
    postnr VARCHAR(10) NULL,
    bynavn VARCHAR(100) NULL,
    adgangsadresseID VARCHAR(50) NULL,
    boligtype VARCHAR(100) NULL,
    byggeaar INT NULL,
    boligareal INT NULL,
    grundareal INT NULL,
    antalVaerelser INT NULL,
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    sidstOpdateret DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    erArkiveret BIT NOT NULL DEFAULT 0,

    CONSTRAINT PK_Ejendomsprofil PRIMARY KEY (ejendomID),
    CONSTRAINT UQ_Ejendomsprofil_Adresse UNIQUE (adresse)
);
