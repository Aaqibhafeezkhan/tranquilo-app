// pages/about.html's "notify me about new features" form -- same
// api/subscribe.js endpoint as pro.html, tagged source: "feature_notify".
import { fieldWrap, isValidEmail } from "../utils/formValidation";
import "../analytics/cloudflareBeacon";
import { currentLocale, t } from "../i18n/index";

const form = document.getElementById("notifyForm") as HTMLFormElement;
const emailInput = document.getElementById("notifyEmail") as HTMLInputElement;
const submitBtn = document.getElementById(
  "notifySubmitBtn",
) as HTMLButtonElement;
const errorMsg = document.getElementById("notifyErrorMsg") as HTMLElement;
const success = document.getElementById("notifySuccess") as HTMLElement;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const wrap = fieldWrap(form, "notifyEmail");
  const email = emailInput.value.trim();
  const valid = isValidEmail(email);
  wrap?.classList.toggle("error", !valid);
  if (!valid) return;

  errorMsg.classList.remove("show");
  submitBtn.disabled = true;
  submitBtn.textContent = t("form.joining");

  fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      source: "feature_notify",
      locale: currentLocale(),
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("subscribe failed");
      form.style.display = "none";
      success.style.display = "block";
    })
    .catch(() => {
      errorMsg.textContent = t("form.error");
      errorMsg.classList.add("show");
      submitBtn.disabled = false;
      submitBtn.textContent = t("about.notify.cta");
    });
});
