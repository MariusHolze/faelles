document.addEventListener("DOMContentLoaded", async () => {
  if (typeof indsætNavbar === "function") {
    await indsætNavbar(); // henter navbar.html og sætter den ind på siden
  }

  if (typeof initInvesteringscaseSide === "function") {
    initInvesteringscaseSide(); // viser og binder investeringscasesiden
  }

  if (typeof initCaseOverblikSide === "function") {
    initCaseOverblikSide(); // viser læse-overblik for en valgt investeringscase
  }

  if (typeof bindInvesteringscaseTrinForm === "function") {
    bindInvesteringscaseTrinForm(); // sætter formulartrin til investeringscase op
  }

  if (typeof bindAdresseSoegning === "function") {
    bindAdresseSoegning(); // sætter adresse-søgning op
  }

  if (typeof bindOpretEjendomsprofilFraForside === "function") {
    bindOpretEjendomsprofilFraForside(); // knap fra forsiden til ejendomsoprettelse
  }

  if (typeof bindSeCasesFraForside === "function") {
    bindSeCasesFraForside(); // offentlig visning af cases for valgt ejendom
  }

  if (typeof initKortdata === "function") {
    initKortdata(); // sætter kortmodal og kortknapper op
  }

  if (typeof visProfil === "function") {
    visProfil(); // viser fælles prototypeoversigt på profilsiden
  }

  if (typeof hentProfilEjendomme === "function") {
    hentProfilEjendomme(); // henter ejendomme til profilsiden
  }

});
