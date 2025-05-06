// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => {
        console.log(
          "ServiceWorker registration successful with scope: ",
          registration.scope
        );
      })
      .catch((error) => {
        console.log("ServiceWorker registration failed: ", error);
      });
  });
}

// Main app functionality
document.addEventListener("DOMContentLoaded", () => {
  const clock = document.getElementById("clock");
  const alarmForm = document.getElementById("alarmForm");
  const alarmTimeInput = document.getElementById("alarmTime");
  const alarmMsgInput = document.getElementById("alarmMsg");
  const alarmStatus = document.getElementById("alarmStatus");
  const alarmAudio = document.getElementById("alarmAudio");
  const bellIcon = document.getElementById("bellIcon");
  const voiceSelect = document.getElementById("voiceSelect");
  const stopBtn = document.getElementById("stopBtn");

  let alarmTime = null;
  let alarmMessage = "";
  let selectedVoice = null;
  let alarmInterval = null;

  function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString();
    const current = now.toTimeString().slice(0, 5);
    if (alarmTime === current) {
      triggerAlarm();
    }
    requestAnimationFrame(updateClock);
  }

  function populateVoices() {
    const voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '<option value="">Select Voice</option>';

    // Group voices by language with special handling for Punjabi
    const grouped = {};

    voices.forEach((voice, index) => {
      // Normalize language codes (handle both 'pa' and 'pa-IN')
      const langParts = voice.lang.toLowerCase().split("-");
      const baseLang = langParts[0];

      // Special case for Punjabi
      const displayLang =
        baseLang === "pa" ? "Punjabi" : baseLang.toUpperCase();

      if (!grouped[displayLang]) grouped[displayLang] = [];
      grouped[displayLang].push({ voice, index });
    });

    // Sort languages alphabetically but put Punjabi first if it exists
    const sortedLangs = Object.keys(grouped).sort((a, b) => {
      if (a === "Punjabi") return -1;
      if (b === "Punjabi") return 1;
      return a.localeCompare(b);
    });

    sortedLangs.forEach((lang) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = lang;

      // Sort voices within each language group
      grouped[lang].sort((a, b) => a.voice.name.localeCompare(b.voice.name));

      grouped[lang].forEach(({ voice, index }) => {
        const option = document.createElement("option");
        option.value = index;
        option.text = `${voice.name} (${voice.lang})`;
        optgroup.appendChild(option);
      });

      voiceSelect.appendChild(optgroup);
    });

    // Auto-select Punjabi voice if available
    if (grouped["Punjabi"] && grouped["Punjabi"].length > 0) {
      const punjabiVoice = grouped["Punjabi"][0];
      voiceSelect.value = punjabiVoice.index;
    }
  }

  // Voice preview
  voiceSelect.addEventListener("change", () => {
    const selectedIndex = voiceSelect.value;
    if (!selectedIndex) return;

    const previewVoice = speechSynthesis.getVoices()[selectedIndex];

    if (previewVoice) {
      let previewText = "This is a voice preview.";
      if (previewVoice.lang.startsWith("pa")) {
        previewText = "ਇਹ ਇੱਕ ਵੌਇਸ ਪਰਿਵੇਖਣ ਹੈ।"; // Punjabi preview text
      } else if (previewVoice.lang.startsWith("ur")) {
        previewText = "یہ ایک آواز کا پیش نظارہ ہے۔"; // Urdu preview text
      }

      const utterance = new SpeechSynthesisUtterance(previewText);
      utterance.voice = previewVoice;
      utterance.lang = previewVoice.lang;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  });

  // Handle voice changes on Chrome
  speechSynthesis.onvoiceschanged = populateVoices;

  alarmForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alarmTime = alarmTimeInput.value;
    alarmMessage = alarmMsgInput.value;
    const selectedIndex = voiceSelect.value;

    if (!selectedIndex) {
      alarmStatus.textContent = "⚠️ Please select a voice";
      alarmStatus.style.color = "var(--danger-color)";
      return;
    }

    selectedVoice = speechSynthesis.getVoices()[selectedIndex];
    alarmStatus.textContent = `⏳ Alarm set for ${alarmTime} - "${alarmMessage}"`;
    alarmStatus.style.color = "var(--primary-color)";

    // Visual feedback
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerHTML = "✅ Alarm Set!";
    setTimeout(() => {
      submitBtn.innerHTML = "Set Alarm";
    }, 2000);
  });

  function triggerAlarm() {
    alarmStatus.textContent = `🔔 Alarm ringing: "${alarmMessage}"`;
    bellIcon.classList.remove("d-none");
    bellIcon.classList.add("ringing");
    alarmAudio.play();
    stopBtn.classList.remove("d-none");

    // Vibration for mobile devices if supported
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }

    speakMessage();
    alarmInterval = setInterval(speakMessage, 10000);
  }

  function speakMessage() {
    if (!selectedVoice) return;

    const msg = new SpeechSynthesisUtterance();
    msg.text = alarmMessage;
    msg.voice = selectedVoice;
    msg.lang = selectedVoice.lang;
    msg.pitch = 1;
    msg.rate = 0.9; // Slightly slower for better comprehension

    // Special handling for Punjabi/Urdu messages
    if (
      selectedVoice.lang.startsWith("pa") ||
      selectedVoice.lang.startsWith("ur")
    ) {
      msg.rate = 0.85; // Even slower for complex scripts
    }

    speechSynthesis.speak(msg);
  }

  stopBtn.addEventListener("click", stopAlarm);

  function stopAlarm() {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    speechSynthesis.cancel();
    clearInterval(alarmInterval);
    bellIcon.classList.add("d-none");
    bellIcon.classList.remove("ringing");
    stopBtn.classList.add("d-none");
    alarmTime = null;
    alarmMessage = "";
    selectedVoice = null;
    alarmStatus.textContent = "✅ Alarm stopped.";
    alarmStatus.style.color = "var(--success-color)";

    // Reset form for better UX
    alarmForm.reset();

    // Reset time to current time + 1 minute
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    alarmTimeInput.value = `${hours}:${mins}`;
  }

  // Check for browser support
  if (!("speechSynthesis" in window)) {
    alarmStatus.textContent =
      "⚠️ Speech synthesis not supported in this browser.";
    alarmStatus.style.color = "var(--danger-color)";
    voiceSelect.disabled = true;
  }

  // Initial voice population
  populateVoices();

  // Some browsers need a delay before voices are ready
  setTimeout(populateVoices, 500);

  // Initialize the clock
  updateClock();

  // Set default time to current time + 1 minute for better UX
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  alarmTimeInput.value = `${hours}:${mins}`;
});
