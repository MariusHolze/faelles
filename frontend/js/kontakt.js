// Finder kontaktformularen på siden
const contactForm = document.getElementById("contactForm");

// Finder stedet hvor vi kan vise en besked efter submit
const formMessage = document.getElementById("formMessage");

// Finder alle spørgsmål i FAQ-sektionen
const faqQuestions = document.querySelectorAll(".faq-question");

// Kører kun hvis kontaktformularen findes på siden
if (contactForm) {
  contactForm.addEventListener("submit", function (event) {
    // Stopper formularens normale genindlæsning af siden
    event.preventDefault();

    // Viser en simpel bekræftelse til brugeren
    if (formMessage) {
      formMessage.textContent = "Tak for din besked. Vi vender tilbage hurtigst muligt.";
    }

    // Rydder formularfelterne
    contactForm.reset();
  });
}

// Gennemgår alle FAQ-spørgsmål og giver dem klik-funktion
faqQuestions.forEach(function (question) {
  question.addEventListener("click", function () {
    const faqItem = question.parentElement;

    if (faqItem) {
      faqItem.classList.toggle("active");
    }
  });
});
