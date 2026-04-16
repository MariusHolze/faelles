document.addEventListener("DOMContentLoaded", async () => {
  await indsætNavbar(); // henter navbar.html og sætter den ind på siden
  opdaterNavbarEfterLogin(); // viser rigtig menu alt efter login
  bindBrugerMenu(); // gør dropdown-menuen klikbar
  bindLogoutKnap(); // gør logout-knappen aktiv

  bindLoginForm(); // sætter login-formularen op
  bindOpretBrugerForm(); // sætter opret-bruger-formularen op
  bindAdresseSoegning(); // sætter adresse-søgning op
  bindOpretEjendomsprofilFraForside(); // knap fra forsiden til ejendomsoprettelse

  visProfil(); // viser brugerdata på profilsiden
  hentProfilEjendomme(); // henter ejendomme til profilsiden
  hentEjendomme(); // henter ejendomme til ejendomssiden
});
