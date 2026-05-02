# Forretningslogik: simpel cashflow-beregning

Dette eksempel dokumenterer den centrale beregning i investeringscasen.
Formålet er ikke at lave en præcis finansiel model, men en forklarbar prototype.

## Eksempel

- Ejendomspris: 2.500.000 kr.
- Købsomkostninger: 200.000 kr.
- Renovering: 100.000 kr.
- Lånebeløb: 2.000.000 kr.
- Egenbetaling: 500.000 kr.
- Rente: 4 %
- Løbetid: 30 år
- Månedlig leje: 12.000 kr.
- Tomgang: 5 %
- Drift pr. måned: 2.000 kr.
- Udlejningsudgifter pr. måned: 500 kr.

## Pseudokode

```text
startInvestering = ejendomspris + købsomkostninger + renovering

maanedligRente = rente / 100 / 12
antalMaaneder = løbetid * 12

hvis maanedligRente er 0:
    maanedligYdelse = lånebeløb / antalMaaneder
ellers:
    maanedligYdelse = lånebeløb *
        (maanedligRente / (1 - (1 + maanedligRente)^(-antalMaaneder)))

lejeEfterTomgang = månedligLeje * (1 - tomgangProcent / 100)

maanedligeUdgifter =
    driftPrMaaned
    + udlejningsudgifterPrMaaned
    + maanedligYdelse

maanedligtCashflow = lejeEfterTomgang - maanedligeUdgifter
aarligtCashflow = maanedligtCashflow * 12

totalRenteomkostning = maanedligYdelse * antalMaaneder - lånebeløb
```

## Kobling til koden

Beregningen ligger i:

```text
backend/services/beregnCase.js
```

Den centrale funktion hedder:

```text
calculateInvestmentCase(input)
```
