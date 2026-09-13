// Simple frontend for Apps Script backend
// Assumes backend supports ?action=getCategories, addExpense, getExpenses

const backendStatus = document.getElementById("backendStatus");
const backendInput = document.getElementById("backendUrl");
const saveBackendBtn = document.getElementById("saveBackendBtn");

const categorySelect = document.getElementById("category");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const addExpenseMsg = document.getElementById("addExpenseMsg");
const expenseList = document.getElementById("expenseList");

function getBackendUrl() {
  return localStorage.getItem("backendUrl") || "";
}

function setBackendUrl(url) {
  localStorage.setItem("backendUrl", url);
}

function showBackendStatus(msg, ok = false) {
  backendStatus.textContent = msg;
  backendStatus.className = ok ? "success" : "error";
}

async function pingBackend(url) {
  const res = await fetch(url + "?action=ping").catch(() => null);
  if (!res) throw new Error("No response");
  const data = await res.json();
  if (data.backend !== "custom") throw new Error("Backend not in custom mode");
}

// Save backend URL
saveBackendBtn.addEventListener("click", async () => {
  const url = backendInput.value.trim();
  if (!url) {
    showBackendStatus("Please enter a backend URL");
    return;
  }
  showBackendStatus("Checking backend...");
  try {
    await pingBackend(url);
    setBackendUrl(url);
    showBackendStatus("Backend saved and verified", true);
    await loadCategories();
    await loadRecentExpenses();
  } catch (e) {
    showBackendStatus("Could not verify backend: " + e.message);
  }
});

// Load categories
async function loadCategories() {
  const url = getBackendUrl();
  if (!url) return;
  categorySelect.innerHTML = "";
  try {
    const res = await fetch(url + "?action=getCategories");
    const data = await res.json();
    (data.categories || []).forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  } catch {
    // ignore for now
  }
}

// Add expense
addExpenseBtn.addEventListener("click", async () => {
  const url = getBackendUrl();
  if (!url) {
    addExpenseMsg.textContent = "Set backend URL first.";
    return;
  }

  const amount = parseFloat(document.getElementById("amount").value);
  const category = categorySelect.value;
  const vendor = document.getElementById("vendor").value.trim();
  const notes = document.getElementById("notes").value.trim();

  if (!amount || !category) {
    addExpenseMsg.textContent = "Amount and category are required.";
    return;
  }

  addExpenseMsg.textContent = "Saving...";
  try {
    const res = await fetch(url + "?action=addExpense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, category, vendor, notes })
    });
    const data = await res.json();
    if (data.status === "ok") {
      addExpenseMsg.textContent = "Expense added.";
      addExpenseMsg.className = "success";
      document.getElementById("amount").value = "";
      document.getElementById("vendor").value = "";
      document.getElementById("notes").value = "";
      await loadRecentExpenses();
    } else {
      addExpenseMsg.textContent = "Backend error.";
      addExpenseMsg.className = "error";
    }
  } catch {
    addExpenseMsg.textContent = "Failed to add expense.";
    addExpenseMsg.className = "error";
  }
});

// Load recent expenses
async function loadRecentExpenses() {
  const url = getBackendUrl();
  if (!url) return;
  expenseList.innerHTML = "";
  try {
    const res = await fetch(url + "?action=getExpenses&limit=10");
    const data = await res.json();
    (data.expenses || []).forEach(e => {
      const li = document.createElement("li");
      li.textContent = `${e.date} – ${e.category} – ${e.amount} – ${e.vendor || ""}`;
      expenseList.appendChild(li);
    });
  } catch {
    // ignore
  }
}

// Init
window.addEventListener("load", async () => {
  const url = getBackendUrl();
  if (url) {
    backendInput.value = url;
    showBackendStatus("Using saved backend URL", true);
    await loadCategories();
    await loadRecentExpenses();
  }
});
