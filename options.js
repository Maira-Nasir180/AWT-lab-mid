/** Dropdown options shared by the API, the form and validation. */
const INSTITUTES = [
  { name: "COMSATS University Islamabad (Islamabad Campus)", comsats: true },
  { name: "COMSATS University Islamabad (Abbottabad Campus)", comsats: true },
  { name: "COMSATS University Islamabad (Attock Campus)", comsats: true },
  { name: "COMSATS University Islamabad (Lahore Campus)", comsats: true },
  { name: "COMSATS University Islamabad (Sahiwal Campus)", comsats: true },
  { name: "COMSATS University Islamabad (Vehari Campus)", comsats: true },
  { name: "COMSATS University Islamabad (Wah Campus)", comsats: true },
  { name: "NUST" },
  { name: "FAST-NUCES" },
  { name: "Air University" },
  { name: "Bahria University" },
  { name: "Riphah International University" },
  { name: "International Islamic University Islamabad" },
  { name: "NUML" },
  { name: "Quaid-i-Azam University" },
  { name: "Other" },
];

const PROGRAMS = [
  "BS Software Engineering (BSE)",
  "BS Computer Science (BCS)",
  "BS Artificial Intelligence (BAI)",
  "BS Data Science (BDS)",
  "BS Cyber Security (BCY)",
  "BS Computer Engineering (BCE)",
  "BS Electrical Engineering (BEE)",
  "BBA",
  "MS / PhD",
  "Other",
];

module.exports = { INSTITUTES, PROGRAMS };
