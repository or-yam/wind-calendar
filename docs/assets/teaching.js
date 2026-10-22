document.querySelectorAll("[data-client]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-client]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    document.querySelectorAll(".client-panel").forEach((panel) => {
      panel.hidden = panel.id !== button.dataset.client;
    });
  });
});
document.querySelectorAll(".quiz").forEach((quiz) => {
  quiz.querySelectorAll("button[data-correct]").forEach((button) => {
    button.addEventListener("click", () => {
      const correct = button.dataset.correct === "true";
      const feedback = quiz.querySelector(".feedback");
      feedback.dataset.correct = String(correct);
      feedback.textContent = (correct ? "Correct. " : "Try again. ") + button.dataset.feedback;
    });
  });
});
