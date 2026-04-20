IF COL_LENGTH('Ejendomsprofil', 'adresseID') IS NULL
BEGIN
    ALTER TABLE Ejendomsprofil
    ADD adresseID VARCHAR(50) NULL;
END;
