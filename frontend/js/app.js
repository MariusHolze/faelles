document.addEventListener("DOMContentLoaded", async () => {
  await indsætNavbar();
  opdaterNavbarEfterLogin();
  bindBrugerMenu();
  bindLogoutKnap();

  bindLoginForm();
  bindOpretBrugerForm();
  bindEjendomForm();
  bindAdresseSoegning();
  bindOpretEjendomsprofilFraForside();

  visProfil();
  hentProfilEjendomme();
  hentEjendomme();
});