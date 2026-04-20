IF OBJECT_ID('InvesteringscaseKoebspost', 'U') IS NULL
BEGIN
    CREATE TABLE InvesteringscaseKoebspost (
        postID INT IDENTITY(1,1) NOT NULL,
        caseID INT NOT NULL,
        navn VARCHAR(100) NOT NULL,
        beloeb DECIMAL(18,2) NOT NULL,
        oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT PK_InvesteringscaseKoebspost PRIMARY KEY (postID),
        CONSTRAINT FK_InvesteringscaseKoebspost_Investeringscase
            FOREIGN KEY (caseID) REFERENCES Investeringscase(caseID)
    );
END;
