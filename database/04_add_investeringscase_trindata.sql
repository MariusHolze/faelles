IF OBJECT_ID('InvesteringscaseTrinData', 'U') IS NULL
BEGIN
    CREATE TABLE InvesteringscaseTrinData (
        trinDataID INT IDENTITY(1,1) NOT NULL,
        caseID INT NOT NULL,
        trin VARCHAR(50) NOT NULL,
        dataJson NVARCHAR(MAX) NOT NULL,
        opdateretTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT PK_InvesteringscaseTrinData PRIMARY KEY (trinDataID),
        CONSTRAINT FK_InvesteringscaseTrinData_Investeringscase
            FOREIGN KEY (caseID) REFERENCES Investeringscase(caseID),
        CONSTRAINT UQ_InvesteringscaseTrinData_Case_Trin UNIQUE (caseID, trin)
    );
END;
