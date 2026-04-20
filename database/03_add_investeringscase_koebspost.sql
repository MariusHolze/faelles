IF COL_LENGTH('Investeringscase', 'dataJson') IS NULL
BEGIN
    ALTER TABLE Investeringscase
    ADD dataJson NVARCHAR(MAX) NULL;
END;
