const opretProfil = document.getElementById("opretProfil");
const btnOpret = document.getElementById("btnOpret");

const opretBrugernavn = document.getElementById("opretBrugernavn");
const btnTilOpretBrugernavn = document.getElementById("tilOpretBrugernavn");
const submitProfil = document.getElementById("submitProfil");

function openForm() {
    opretProfil.classList.remove("hidden");
}

function closeForm() {
    opretProfil.classList.add("hidden");
    opretProfil.reset();
    opretBrugernavn.classList.add("hidden");
    opretBrugernavn.reset();
}

function showBrugernavnForm() {
    opretProfil.classList.add("hidden");
    opretBrugernavn.classList.remove("hidden");
}

btnOpret.addEventListener("click", openForm);
btnTilOpretBrugernavn.addEventListener("click", showBrugernavnForm);
submitProfil.addEventListener("click", closeForm);