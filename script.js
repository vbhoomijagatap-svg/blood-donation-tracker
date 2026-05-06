const DONATION_GAP_DAYS = 90;
const API_BASE = "/api";
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function togglePasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const shouldShow = input.type === "password";
  input.type = shouldShow ? "text" : "password";
  button.classList.toggle("is-visible", shouldShow);
  button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
  button.setAttribute("title", shouldShow ? "Hide password" : "Show password");
  input.focus();
}

const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];
const INDIA_CITIES_BY_STATE = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Kakinada", "Anantapur", "Kadapa"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Bomdila", "Aalo", "Tezu"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur", "Nagaon", "Tinsukia", "Bongaigaon"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Arrah", "Begusarai"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Jagdalpur", "Raigarh"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar", "Karnal", "Rohtak", "Sonipat"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi", "Solan", "Kullu", "Hamirpur", "Una", "Chamba"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Kalaburagi", "Davanagere", "Ballari", "Udupi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Kottayam", "Alappuzha", "Palakkad"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Satna"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Solapur", "Kolhapur", "Amravati", "Nanded"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Kakching"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongpoh", "Williamnagar"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bharatpur"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Rangpo"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Mahbubnagar"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar", "Ambassa"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Meerut", "Ghaziabad", "Noida", "Bareilly", "Aligarh"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Rishikesh", "Nainital"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Kharagpur", "Bardhaman", "Malda"],
  "Andaman and Nicobar Islands": ["Port Blair", "Mayabunder", "Diglipur", "Car Nicobar"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Delhi": ["New Delhi", "Delhi", "Dwarka", "Rohini", "Saket", "Karol Bagh"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti", "Agatti", "Minicoy", "Amini"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"]
};
const CITY_HOSPITALS = {
  pune: [
    "Ruby Hall Clinic",
    "Jehangir Hospital",
    "Sahyadri Super Speciality Hospital",
    "Deenanath Mangeshkar Hospital",
    "Poona Hospital and Research Centre"
  ],
  mumbai: [
    "KEM Hospital",
    "Tata Memorial Hospital",
    "Lilavati Hospital",
    "Nanavati Max Super Speciality Hospital",
    "Kokilaben Dhirubhai Ambani Hospital"
  ],
  thane: [
    "Jupiter Hospital",
    "Bethany Hospital",
    "Horizon Prime Hospital",
    "Fortis Hospital Mulund",
    "Hiranandani Hospital"
  ],
  nashik: [
    "Civil Hospital Nashik",
    "Wockhardt Hospitals Nashik",
    "Sahyadri Super Speciality Hospital Nashik",
    "Apollo Hospital Nashik",
    "Six Sigma Medicare"
  ],
  nagpur: [
    "Government Medical College and Hospital Nagpur",
    "Alexis Multispeciality Hospital",
    "Wockhardt Hospitals Nagpur",
    "Orange City Hospital",
    "Kingsway Hospitals"
  ],
  delhi: [
    "AIIMS Delhi",
    "Safdarjung Hospital",
    "Sir Ganga Ram Hospital",
    "Max Super Speciality Hospital Saket",
    "Fortis Escorts Heart Institute"
  ],
  bengaluru: [
    "Manipal Hospital",
    "Victoria Hospital",
    "Narayana Health City",
    "Fortis Hospital Bannerghatta Road",
    "Aster CMI Hospital"
  ],
  chennai: [
    "Apollo Hospitals Greams Road",
    "MIOT International",
    "Stanley Medical College Hospital",
    "Global Hospital Chennai",
    "Fortis Malar Hospital"
  ],
  hyderabad: [
    "Yashoda Hospitals",
    "Apollo Hospitals Jubilee Hills",
    "KIMS Hospitals",
    "Osmania General Hospital",
    "AIG Hospitals"
  ],
  kolkata: [
    "SSKM Hospital",
    "AMRI Hospitals",
    "Apollo Multispeciality Hospitals Kolkata",
    "Fortis Hospital Anandapur",
    "Belle Vue Clinic"
  ]
};
const DONOR_QUOTES = [
  "Your one donation can become someone's second chance.",
  "Thank you for being a consistent lifesaver.",
  "A small act from you can mean a whole life for someone else.",
  "Your kindness keeps hope moving."
];

let donors = [];
let currentUser = null;

const authShell = document.querySelector("#authShell");
const appShell = document.querySelector("#appShell");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const showLogin = document.querySelector("#showLogin");
const showRegister = document.querySelector("#showRegister");
const authMessage = document.querySelector("#authMessage");
const currentUserEmail = document.querySelector("#currentUserEmail");
const logoutButton = document.querySelector("#logoutButton");
const donorForm = document.querySelector("#donorForm");
const donorTable = document.querySelector("#donorTable");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const emptyState = document.querySelector("#emptyState");
const stateInput = document.querySelector("#state");
const cityInput = document.querySelector("#city");
const hospitalInput = document.querySelector("#hospital");
const citySuggestions = document.querySelector("#citySuggestions");
const hospitalSuggestions = document.querySelector("#hospitalSuggestions");
const hospitalRecommendations = document.querySelector("#hospitalRecommendations");
const nearbyHospitalsButton = document.querySelector("#nearbyHospitalsButton");
const hospitalLocationButton = document.querySelector("#hospitalLocationButton");
const lastDonationInput = document.querySelector("#lastDonation");
const nextDatePreview = document.querySelector("#nextDatePreview");
const groupCounts = document.querySelector("#groupCounts");
const dailyReminderList = document.querySelector("#dailyReminderList");
const sendReminderButton = document.querySelector("#sendReminderButton");
const sendReminderStatus = document.querySelector("#sendReminderStatus");
const emergencyGroup = document.querySelector("#emergencyGroup");
const emergencyHospital = document.querySelector("#emergencyHospital");
const emergencyButton = document.querySelector("#emergencyButton");
const historyAccountInput = document.querySelector("#historyAccountInput");
const historySearchButton = document.querySelector("#historySearchButton");
const historyList = document.querySelector("#historyList");

const counters = {
  totalDonors: document.querySelector("#totalDonors"),
  readyDonors: document.querySelector("#readyDonors"),
  reminderDonors: document.querySelector("#reminderDonors"),
  totalAccounts: document.querySelector("#totalAccounts"),
  heroReady: document.querySelector("#heroReady"),
  heroSoon: document.querySelector("#heroSoon")
};

donorForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const lastDonation = lastDonationInput.value;
  const donor = {
    name: document.querySelector("#donorName").value.trim(),
    bloodGroup: document.querySelector("#bloodGroup").value,
    phone: document.querySelector("#phone").value.trim(),
    email: document.querySelector("#email").value.trim(),
    state: document.querySelector("#state").value,
    city: document.querySelector("#city").value.trim(),
    hospital: document.querySelector("#hospital").value.trim(),
    lastDonation,
    consent: document.querySelector("#consent").checked,
    nextDonation: toDateInputValue(addDays(lastDonation, DONATION_GAP_DAYS))
  };

  try {
    await apiRequest("/donors", {
      method: "POST",
      body: JSON.stringify(donor)
    });

    donorForm.reset();
    populateCitiesForState("");
    nextDatePreview.textContent = "Select last donation date";
    renderHospitalRecommendations([]);
    await loadAndRender();
  } catch (error) {
    alert(error.message);
  }
});

showLogin.addEventListener("click", () => setAuthMode("login"));
showRegister.addEventListener("click", () => setAuthMode("register"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("");

  try {
    currentUser = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.querySelector("#loginEmail").value.trim(),
        password: document.querySelector("#loginPassword").value
      })
    });
    loginForm.reset();
    showApp();
    await loadAndRender();
  } catch (error) {
    setAuthMessage(error.message, "error");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("");

  try {
    currentUser = await apiRequest("/register", {
      method: "POST",
      body: JSON.stringify({
        email: document.querySelector("#registerEmail").value.trim(),
        password: document.querySelector("#registerPassword").value
      })
    });
    const registeredEmail = currentUser.email;
    currentUser = null;
    await apiRequest("/logout", { method: "POST" }).catch(() => null);
    registerForm.reset();
    document.querySelector("#loginEmail").value = registeredEmail;
    setAuthMode("login");
    setAuthMessage("Registration complete. Please login with your email and password.", "success");
  } catch (error) {
    setAuthMessage(error.message, "error");
  }
});

logoutButton.addEventListener("click", async () => {
  await apiRequest("/logout", { method: "POST" }).catch(() => null);
  currentUser = null;
  donors = [];
  showAuth();
});

historySearchButton.addEventListener("click", renderMyHistory);
sendReminderButton.addEventListener("click", sendDirectWhatsAppReminders);

lastDonationInput.addEventListener("change", () => {
  if (!lastDonationInput.value) {
    nextDatePreview.textContent = "Select last donation date";
    return;
  }

  nextDatePreview.textContent = formatDate(addDays(lastDonationInput.value, DONATION_GAP_DAYS));
});

stateInput.addEventListener("change", () => {
  populateCitiesForState(stateInput.value);
  renderHospitalRecommendations([]);
});

cityInput.addEventListener("change", () => {
  renderHospitalRecommendations(getHospitalsForCity(cityInput.value, stateInput.value));
});

hospitalRecommendations.addEventListener("click", (event) => {
  const button = event.target.closest("[data-hospital]");
  if (!button) return;

  hospitalInput.value = button.dataset.hospital;
});

nearbyHospitalsButton.addEventListener("click", findNearbyHospitals);
hospitalLocationButton.addEventListener("click", findHospitalLocation);

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);

donorTable.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  await apiRequest(`/donors/${button.dataset.deleteId}`, { method: "DELETE" });
  await loadAndRender();
});

emergencyButton.addEventListener("click", () => {
  const group = emergencyGroup.value;
  const hospital = emergencyHospital.value.trim() || "the requested hospital";

  if (!group) {
    alert("Please select the blood group needed for emergency notification.");
    return;
  }

  const eligibleDonors = donors
    .map(normalizeDonor)
    .filter((donor) => donor.isOwner && donor.bloodGroup === group && donor.status.key === "ready");

  if (!eligibleDonors.length) {
    alert(`No eligible ${group} donor is available in your own account today. Other donor contacts are private.`);
    return;
  }

  const firstDonor = eligibleDonors[0];
  const message = buildEmergencyMessage(group, hospital);
  alert(`${eligibleDonors.length} eligible ${group} donor(s) found. Opening WhatsApp message for ${firstDonor.name}.`);
  window.location.href = buildWhatsappUrl(firstDonor.phone, message);
});

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    if (response.status === 401) {
      showAuth();
    }
    throw new Error(error.error || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  loginForm.classList.toggle("hidden", !isLogin);
  registerForm.classList.toggle("hidden", isLogin);
  showLogin.classList.toggle("active", isLogin);
  showRegister.classList.toggle("active", !isLogin);
  setAuthMessage("");
}

function setAuthMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`.trim();
}

function showApp() {
  authShell.classList.add("hidden");
  appShell.classList.remove("hidden");
  currentUserEmail.textContent = currentUser ? currentUser.email : "-";
  historyAccountInput.value = currentUser ? currentUser.email : "";
}

async function sendDirectWhatsAppReminders() {
  setSendStatus("Sending WhatsApp reminders...", "");
  sendReminderButton.disabled = true;

  try {
    const result = await apiRequest("/reminders/send", { method: "POST" });
    if (!result.sent) {
      setSendStatus(result.message || "No reminders were sent today.", "error");
    } else {
      setSendStatus(`Sent ${result.sent} WhatsApp reminder(s) directly.`, "success");
    }
  } catch (error) {
    setSendStatus(error.message, "error");
  } finally {
    sendReminderButton.disabled = false;
  }
}

function setSendStatus(message, type = "") {
  sendReminderStatus.textContent = message;
  sendReminderStatus.className = `send-status ${type}`.trim();
}

function showAuth() {
  appShell.classList.add("hidden");
  authShell.classList.remove("hidden");
}

async function initAuth() {
  try {
    currentUser = await apiRequest("/me");
    showApp();
    await loadAndRender();
  } catch (error) {
    showAuth();
  }
}

async function loadAndRender() {
  try {
    donors = await apiRequest("/donors");
    render();
  } catch (error) {
    donorTable.innerHTML = `<tr><td colspan="8" class="empty-state">Login again or start the Python server to connect securely.</td></tr>`;
    console.error(error);
  }
}

function initHospitalSuggestions() {
  INDIA_STATES.forEach((state) => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    stateInput.append(option);
  });
  renderHospitalRecommendations([]);
}

function populateCitiesForState(state) {
  cityInput.innerHTML = `<option value="">Select city</option>`;
  citySuggestions.innerHTML = "";
  const cities = INDIA_CITIES_BY_STATE[state] || [];

  cities.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    cityInput.append(option);

    const dataOption = document.createElement("option");
    dataOption.value = city;
    citySuggestions.append(dataOption);
  });
}

function normalizeCity(value) {
  return value.trim().toLowerCase();
}

function getHospitalsForCity(city, state = "") {
  const normalized = normalizeCity(city);
  if (!normalized) return [];

  if (CITY_HOSPITALS[normalized]) {
    return CITY_HOSPITALS[normalized];
  }

  const generated = [
    `${city} Civil Hospital`,
    `${city} District Hospital`,
    `${city} General Hospital`,
    `${city} Government Medical College Hospital`,
    `${city} Blood Bank`
  ];

  const matchedCity = Object.keys(CITY_HOSPITALS).find((knownCity) =>
    knownCity.includes(normalized) || normalized.includes(knownCity)
  );

  return matchedCity ? CITY_HOSPITALS[matchedCity] : generated.map((hospital) =>
    state ? `${hospital}, ${state}` : hospital
  );
}

function renderHospitalRecommendations(hospitals, statusText = "Select state and city to view suggestions") {
  hospitalRecommendations.innerHTML = "";
  hospitalSuggestions.innerHTML = "";

  if (!hospitals.length) {
    const emptyButton = document.createElement("button");
    emptyButton.type = "button";
    emptyButton.textContent = statusText;
    hospitalRecommendations.append(emptyButton);
    return;
  }

  hospitals.slice(0, 8).forEach((hospital) => {
    const option = document.createElement("option");
    option.value = hospital;
    hospitalSuggestions.append(option);

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.hospital = hospital;
    button.textContent = hospital;
    hospitalRecommendations.append(button);
  });
}

async function findNearbyHospitals() {
  if (!navigator.geolocation) {
    renderHospitalRecommendations(getHospitalsForCity(cityInput.value, stateInput.value), "Location is not supported in this browser");
    return;
  }

  nearbyHospitalsButton.textContent = "Finding...";
  nearbyHospitalsButton.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const hospitals = await fetchNearbyHospitals(position.coords.latitude, position.coords.longitude);
        renderHospitalRecommendations(hospitals, hospitals.length ? "Nearby hospitals found" : "No nearby hospitals found");
      } catch (error) {
        console.error(error);
        renderHospitalRecommendations(getHospitalsForCity(cityInput.value, stateInput.value), "Could not load nearby hospitals");
      } finally {
        nearbyHospitalsButton.textContent = "Nearby hospitals";
        nearbyHospitalsButton.disabled = false;
      }
    },
    () => {
      renderHospitalRecommendations(getHospitalsForCity(cityInput.value, stateInput.value), "Location permission was not allowed");
      nearbyHospitalsButton.textContent = "Nearby hospitals";
      nearbyHospitalsButton.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

async function findHospitalLocation() {
  const hospital = hospitalInput.value.trim();
  const city = cityInput.value.trim();
  const state = stateInput.value.trim();

  if (!hospital || !city || !state) {
    alert("Please select state, city, and hospital name first.");
    return;
  }

  hospitalLocationButton.textContent = "Locating...";
  hospitalLocationButton.disabled = true;

  try {
    const location = await geocodeHospital(hospital, city, state);
    if (!location) {
      alert("Could not find this hospital location. Please check the hospital name.");
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lon}`, "_blank");
  } catch (error) {
    console.error(error);
    alert("Could not load hospital location right now.");
  } finally {
    hospitalLocationButton.textContent = "Find hospital location";
    hospitalLocationButton.disabled = false;
  }
}

async function geocodeHospital(hospital, city, state) {
  const query = `${hospital}, ${city}, ${state}, India`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Hospital geocoding failed");
  }

  const results = await response.json();
  return results[0] || null;
}

async function fetchNearbyHospitals(latitude, longitude) {
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="hospital"](around:5000,${latitude},${longitude});
      way["amenity"="hospital"](around:5000,${latitude},${longitude});
      relation["amenity"="hospital"](around:5000,${latitude},${longitude});
    );
    out tags center 12;
  `;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Nearby hospital lookup failed");
  }

  const data = await response.json();
  return [...new Set(
    data.elements
      .map((item) => item.tags && item.tags.name)
      .filter(Boolean)
  )].slice(0, 8);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}

function todayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysUntil(date) {
  return Math.ceil((date - todayDate()) / 86400000);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDonorStatus(donor) {
  const nextEligible = addDays(donor.lastDonation, DONATION_GAP_DAYS);
  const remainingDays = daysUntil(nextEligible);

  if (remainingDays <= 0) {
    return {
      key: "ready",
      label: remainingDays === 0 ? "Reminder today" : "Ready now",
      nextEligible,
      remainingDays
    };
  }

  return {
    key: "waiting",
    label: `${remainingDays} days left`,
    nextEligible,
    remainingDays
  };
}

function normalizeDonor(donor) {
  return {
    ...donor,
    status: getDonorStatus(donor)
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[character]));
}

function cleanPhone(phone) {
  return phone.replace(/[^\d+]/g, "");
}

function getDonorQuote(donor) {
  const index = donor.name.length % DONOR_QUOTES.length;
  return DONOR_QUOTES[index];
}

function buildReminderMessage(donor) {
  if (donor.status.remainingDays === 0) {
    return `Hello ${donor.name}, good news. You are ready to donate blood today. If you are healthy and available, please consider donating again. ${getDonorQuote(donor)}`;
  }

  if (donor.status.remainingDays < 0) {
    return `Hello ${donor.name}, you are eligible to donate blood again. If you are healthy and available, your donation can help save a life. ${getDonorQuote(donor)}`;
  }

  return `Hello ${donor.name}, thank you for being a blood donor. Your next safe donation date is ${formatDate(donor.status.nextEligible)}. We will remind you when it is time to donate again.`;
}

function buildEmergencyMessage(group, hospital) {
  return `Urgent request: ${group} blood is needed at ${hospital}. If you are healthy, eligible, and available, please help with a donation today. Your support can save a life.`;
}

function buildWhatsappUrl(phone, message) {
  const number = cleanPhone(phone).replace(/^\+/, "");
  return `https://wa.me/${encodeURIComponent(number)}?text=${encodeURIComponent(message)}`;
}

function buildSmsUrl(phone, message) {
  return `sms:${encodeURIComponent(cleanPhone(phone))}?body=${encodeURIComponent(message)}`;
}

function buildMailUrl(email, donor, message) {
  const subject = donor.status.remainingDays <= 0
    ? "You are ready to donate blood today"
    : `Blood donation reminder for ${donor.name}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

function matchesSearch(donor, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [donor.name, donor.ownerAccount, donor.state, donor.city, donor.bloodGroup, donor.phone, donor.email, donor.hospital]
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function render() {
  const query = searchInput.value;
  const filter = statusFilter.value;
  const enrichedDonors = donors.map(normalizeDonor);

  const visibleDonors = enrichedDonors.filter((donor) => {
    const statusMatches =
      filter === "all" ||
      donor.status.key === filter ||
      (filter === "today" && donor.status.remainingDays === 0);
    return statusMatches && matchesSearch(donor, query);
  });

  updateCounters(enrichedDonors);
  renderGroupCounts(enrichedDonors);
  renderDailyReminders(enrichedDonors);
  renderTable(visibleDonors);
  renderMyHistory(false);
  showDailyReminderNotification(enrichedDonors);
}

function updateCounters(enrichedDonors) {
  const ready = enrichedDonors.filter((donor) => donor.status.key === "ready").length;
  const dueToday = enrichedDonors.filter((donor) => donor.status.remainingDays === 0).length;
  const totalAccounts = new Set(enrichedDonors.map((donor) => donor.ownerAccount)).size;

  counters.totalDonors.textContent = enrichedDonors.length;
  counters.readyDonors.textContent = ready;
  counters.reminderDonors.textContent = dueToday;
  counters.totalAccounts.textContent = totalAccounts;
  counters.heroReady.textContent = ready;
  counters.heroSoon.textContent = dueToday;
}

function renderGroupCounts(enrichedDonors) {
  groupCounts.innerHTML = "";

  BLOOD_GROUPS.forEach((group) => {
    const count = enrichedDonors.filter((donor) => donor.bloodGroup === group).length;
    const eligible = enrichedDonors.filter((donor) => donor.bloodGroup === group && donor.status.key === "ready").length;
    const item = document.createElement("div");
    item.className = "group-pill";
    item.innerHTML = `
      <span>${group}</span>
      <strong>${count}</strong>
      <span>${eligible} eligible today</span>
    `;
    groupCounts.append(item);
  });
}

function renderDailyReminders(enrichedDonors) {
  const dueToday = enrichedDonors.filter((donor) => donor.isOwner && donor.status.remainingDays === 0);
  dailyReminderList.innerHTML = "";

  if (!dueToday.length) {
    dailyReminderList.innerHTML = `<p class="empty-state">No reminders are due today.</p>`;
    return;
  }

  dueToday.forEach((donor) => {
    const message = buildReminderMessage(donor);
    const emailHref = donor.email ? buildMailUrl(donor.email, donor, message) : "#";
    const item = document.createElement("div");
    item.className = "reminder-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(donor.name)} (${escapeHtml(donor.bloodGroup)})</strong>
        <span>${escapeHtml(donor.city)} - ${escapeHtml(donor.hospital)}</span>
      </div>
      <div class="row-actions">
        <a class="whatsapp-link" href="${buildWhatsappUrl(donor.phone, message)}">WhatsApp</a>
        <a class="email-link" href="${emailHref}" aria-disabled="${donor.email ? "false" : "true"}">Email</a>
      </div>
    `;
    dailyReminderList.append(item);
  });
}

function showDailyReminderNotification(enrichedDonors) {
  const seenKey = `reminders-seen-${toDateInputValue(todayDate())}`;
  if (sessionStorage.getItem(seenKey)) return;

  const dueToday = enrichedDonors.filter((donor) => donor.isOwner && donor.status.remainingDays === 0);
  if (!dueToday.length) return;

  sessionStorage.setItem(seenKey, "true");
  alert(`${dueToday.length} donor reminder(s) due today. Use WhatsApp, SMS, Call, or Email from the donor list.`);
}

function renderMyHistory(showErrors = true) {
  const requestedAccount = historyAccountInput.value.trim().toLowerCase();
  historyList.innerHTML = "";

  if (!requestedAccount) {
    historyList.innerHTML = `<p class="empty-state">Enter your registered email or account name to view your private donation history.</p>`;
    return;
  }

  const accountMatches = currentUser && (
    requestedAccount === currentUser.email.toLowerCase() ||
    requestedAccount === currentUser.name.toLowerCase()
  );

  if (!accountMatches) {
    historyList.innerHTML = `<p class="empty-state">This history is private. Login with the same registered email to view it.</p>`;
    if (showErrors) {
      alert("You can only view history for your own registered account.");
    }
    return;
  }

  const myDonors = donors
    .map(normalizeDonor)
    .filter((donor) => donor.isOwner)
    .sort((a, b) => new Date(b.lastDonation) - new Date(a.lastDonation));

  if (!myDonors.length) {
    historyList.innerHTML = `<p class="empty-state">No donation history found for this account yet.</p>`;
    return;
  }

  myDonors.forEach((donor) => {
    const card = document.createElement("div");
    card.className = "history-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(donor.name)} - ${escapeHtml(donor.bloodGroup)}</strong>
        <span>Hospital: ${escapeHtml(donor.hospital)}</span>
        <span>Location: ${escapeHtml(donor.city)}, ${escapeHtml(donor.state || "India")}</span>
        <span>Last donation: ${formatDate(new Date(`${donor.lastDonation}T00:00:00`))}</span>
        <span>Next donation: ${formatDate(donor.status.nextEligible)}</span>
      </div>
      <span class="badge ${donor.status.key}">${donor.status.label}</span>
    `;
    historyList.append(card);
  });
}

function renderTable(visibleDonors) {
  donorTable.innerHTML = "";

  if (!visibleDonors.length) {
    donorTable.append(emptyState.content.cloneNode(true));
    return;
  }

  const rows = visibleDonors
    .sort((a, b) => a.status.remainingDays - b.status.remainingDays)
    .map((donor) => {
      const tr = document.createElement("tr");
      const safeName = escapeHtml(donor.name);
      const safeCity = escapeHtml(donor.city);
      const safeState = escapeHtml(donor.state || "India");
      const safePhone = escapeHtml(donor.phone);
      const safeEmail = escapeHtml(donor.email || "No email");
      const safeBloodGroup = escapeHtml(donor.bloodGroup);
      const safeHospital = escapeHtml(donor.hospital);
      const safeOwner = escapeHtml(donor.ownerAccount || "Unassigned");
      const actions = donor.isOwner ? buildOwnerActions(donor) : `<span class="donor-meta">Private account record</span>`;

      tr.innerHTML = `
        <td>
          <span class="donor-name">${safeName}</span>
          <span class="donor-meta">${safeCity}, ${safeState} - ${safePhone}</span>
          <span class="donor-meta">${safeEmail}</span>
        </td>
        <td>${safeOwner}</td>
        <td><strong>${safeBloodGroup}</strong></td>
        <td>${safeHospital}</td>
        <td>${formatDate(new Date(`${donor.lastDonation}T00:00:00`))}</td>
        <td>${formatDate(donor.status.nextEligible)}</td>
        <td><span class="badge ${donor.status.key}">${donor.status.label}</span></td>
        <td>
          ${actions}
        </td>
      `;
      return tr;
    });

  donorTable.append(...rows);
}

function buildOwnerActions(donor) {
  const reminderMessage = buildReminderMessage(donor);
  const emergencyMessage = buildEmergencyMessage(donor.bloodGroup, donor.hospital);
  const emailHref = donor.email ? buildMailUrl(donor.email, donor, reminderMessage) : "#";

  return `
    <div class="row-actions">
      <a class="call-link" href="tel:${encodeURIComponent(cleanPhone(donor.phone))}">Call</a>
      <a class="message-link" href="${buildSmsUrl(donor.phone, reminderMessage)}">SMS</a>
      <a class="whatsapp-link" href="${buildWhatsappUrl(donor.phone, reminderMessage)}">WhatsApp</a>
      <a class="email-link" href="${emailHref}" aria-disabled="${donor.email ? "false" : "true"}">Email</a>
      <a class="message-link" href="${buildSmsUrl(donor.phone, emergencyMessage)}">Need help</a>
      <button class="delete-button" data-delete-id="${donor.id}" type="button">Remove</button>
    </div>
  `;
}

initHospitalSuggestions();
setAuthMode("register");
initAuth();
