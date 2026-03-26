CREATE TABLE Bruger (
    brugerID INT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255)
);

CREATE TABLE Ejendomsprofil (
    ejendomID INT IDENTITY(1,1) PRIMARY KEY,
    adresse VARCHAR(255),
    boligtype VARCHAR(50),
    boligareal INT
);
