/* VSPARK portal - registration form: dropdowns, validation, submit. */
const COMSATS_REG_NO = /^(FA|SP)\d{2}-[A-Z]{2,4}-\d{3}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^03\d{9}$/;

const form = document.getElementById("form");
const submitBtn = document.getElementById("submitBtn");
const formError = document.getElementById("formError");
const formIntro = document.getElementById("formIntro");
const success = document.getElementById("success");

let institutes = [];

// ---------- Dropdowns ----------
function fillSelect(select, placeholder, items) {
  select.innerHTML = `<option value="">${placeholder}</option>` +
    items.map((name) => `<option>${name}</option>`).join("");
}

async function loadOptions() {
  const res = await fetch("/api/options");
  const { institutes: inst, programs } = await res.json();
  institutes = inst;
  [1, 2].forEach((n) => {
    fillSelect(form.elements[`member${n}Institute`], "Choose institute", inst.map((i) => i.name));
    fillSelect(form.elements[`member${n}Program`], "Choose program", programs);
  });
}

const isComsats = (instituteName) => institutes.find((i) => i.name === instituteName)?.comsats;

// ---------- Errors ----------
function setError(name, message) {
  const input = form.elements[name];
  const hint = form.querySelector(`.error[data-for="${name}"]`);
  if (hint) hint.textContent = message || "";
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

function clearErrors() {
  formError.hidden = true;
  [...form.elements].forEach((el) => el.name && setError(el.name, ""));
}

function showErrors(errors) {
  Object.entries(errors).forEach(([name, message]) => setError(name, message));
  form.querySelector('[aria-invalid="true"]')?.focus();
}

// ---------- Validation (the server re-checks everything) ----------
function checkMember(v, n, errors) {
  if (v[`member${n}Name`].trim().length < 3) errors[`member${n}Name`] = "Enter the full name.";
  if (!v[`member${n}Institute`]) errors[`member${n}Institute`] = "Choose an institute.";
  if (!v[`member${n}Program`]) errors[`member${n}Program`] = "Choose a degree program.";

  const regNo = v[`member${n}RegNo`];
  if (isComsats(v[`member${n}Institute`])) {
    if (!COMSATS_REG_NO.test(regNo)) errors[`member${n}RegNo`] = "Use the format FA23-BSE-062.";
  } else if (regNo.length < 3) {
    errors[`member${n}RegNo`] = "Enter your roll / registration number.";
  }
}

function validate(v) {
  const errors = {};
  checkMember(v, 1, errors);
  if (v.member2Name.trim() || v.member2RegNo || v.member2Institute || v.member2Program) {
    checkMember(v, 2, errors);
    if (!errors.member2RegNo && v.member2RegNo === v.member1RegNo && v.member2Institute === v.member1Institute)
      errors.member2RegNo = "Teammate must be a different person.";
  }
  if (!EMAIL.test(v.email)) errors.email = "Enter a valid email address.";
  if (!PHONE.test(v.phone)) errors.phone = "Use the format 03001234567.";
  if (!v.paymentMethod) errors.paymentMethod = "Choose a payment method.";
  if (v.transactionId.trim().length < 4) errors.transactionId = "Enter the transaction ID.";
  return errors;
}

// ---------- Input formatting ----------
form.querySelectorAll("[data-regno]").forEach((input) => {
  input.addEventListener("input", () => (input.value = input.value.toUpperCase().replace(/\s/g, "")));
});
form.elements.phone.addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "")));

// ---------- Submit ----------
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const values = Object.fromEntries(new FormData(form));
  const errors = validate(values);
  if (Object.keys(errors).length) return showErrors(errors);

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) return showErrors(data.errors || {});

    document.getElementById("regId").textContent = data.id;
    form.hidden = true;
    formIntro.hidden = true;
    success.hidden = false;
    success.focus();
  } catch {
    formError.textContent = "Couldn't reach the server. Check your connection and try again.";
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit registration";
  }
});

loadOptions();
