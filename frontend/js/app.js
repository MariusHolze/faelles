document.addEventListener("DOMContentLoaded", async () => {
  if (typeof indsætNavbar === "function") {
    await indsætNavbar(); // henter navbar.html og sætter den ind på siden
  }

  if (typeof opdaterNavbarEfterLogin === "function") {
    opdaterNavbarEfterLogin(); // viser rigtig menu alt efter login
  }

  if (typeof bindBrugerMenu === "function") {
    bindBrugerMenu(); // gør dropdown-menuen klikbar
  }

  if (typeof bindLogoutKnap === "function") {
    bindLogoutKnap(); // gør logout-knappen aktiv
  }

  if (typeof initInvesteringscaseSide === "function") {
    initInvesteringscaseSide(); // viser og binder investeringscasesiden
  }

  if (typeof bindInvesteringscaseTrinForm === "function") {
    bindInvesteringscaseTrinForm(); // sætter formulartrin til investeringscase op
  }

  if (typeof bindLoginForm === "function") {
    bindLoginForm(); // sætter login-formularen op
  }

  if (typeof bindOpretBrugerForm === "function") {
    bindOpretBrugerForm(); // sætter opret-bruger-formularen op
  }

  if (typeof bindAdresseSoegning === "function") {
    bindAdresseSoegning(); // sætter adresse-søgning op
  }

  if (typeof bindOpretEjendomsprofilFraForside === "function") {
    bindOpretEjendomsprofilFraForside(); // knap fra forsiden til ejendomsoprettelse
  }

  if (typeof visProfil === "function") {
    visProfil(); // viser brugerdata på profilsiden
  }

  if (typeof hentProfilEjendomme === "function") {
    hentProfilEjendomme(); // henter ejendomme til profilsiden
  }

  if (typeof hentEjendomme === "function") {
    hentEjendomme(); // henter ejendomme til ejendomssiden
  }
});
