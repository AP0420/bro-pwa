/*********************************
 * BRO – VOICE ASSISTANT (PWA)
 *********************************/

// ---------- UI ----------
const status = document.getElementById("status");
const mic = document.getElementById("mic");

// ---------- SPEECH RECOGNITION ----------
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();
recognition.lang = "en-IN";            // Indian English + Hinglish
recognition.interimResults = false;
recognition.maxAlternatives = 1;

// ---------- SESSION STATE ----------
let unlocked = sessionStorage.getItem("unlocked") === "true";

// ---------- TTS ----------
function speak(text, lang = "en-IN") {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1;
  speechSynthesis.cancel(); // stop overlapping speech
  speechSynthesis.speak(utterance);
  console.log("🤖 Bro:", text);
}

// ---------- INTENT NORMALIZER (HINGLISH-FIRST) ----------
function getIntent(text) {
  text = text.toLowerCase();

  if (["bye", "exit", "band kar"].some(w => text.includes(w))) return "EXIT";
  if (["time", "samay", "kitna baje"].some(w => text.includes(w))) return "TIME";
  if (["gaana", "song", "play", "baja"].some(w => text.includes(w))) return "PLAY";
  if (["sad", "low", "down"].some(w => text.includes(w))) return "MOOD_LOW";
  if (text.includes("joke")) return "JOKE";
  if (text.includes("how are you") || text.includes("kaise ho")) return "HOW_ARE_YOU";

  return "UNKNOWN";
}

// ---------- MAIN SPEECH HANDLER ----------
recognition.onresult = (event) => {
  const text = event.results[0][0].transcript.toLowerCase();
  status.innerText = "You: " + text;
  console.log("🎤 Heard:", text);

  // ---- WAKE WORD CHECK ----
  if (!text.includes("bro")) {
    speak("Pehle Bro bolo bhai");
    return;
  }

  // ---- SECURITY (ONCE PER SESSION) ----
  if (!unlocked) {
    speak("What's my gang");
    unlocked = true;
    sessionStorage.setItem("unlocked", "true");
    return;
  }

  // ---- INTENT HANDLING ----
  const intent = getIntent(text);

  switch (intent) {
    case "TIME":
      speak("Abhi time hai " + new Date().toLocaleTimeString("en-IN"));
      break;

    case "PLAY":
      speak("YouTube pe gaana chala raha hoon");
      window.open("https://www.youtube.com", "_blank");
      break;

    case "MOOD_LOW":
      speak("Samajh raha hoon bhai. Thoda break le, main hoon na.");
      break;

    case "JOKE":
      speak("Why did the computer get tired? Kyunki usne bahut processing kar li.");
      break;

    case "HOW_ARE_YOU":
      speak("Main badiya hoon bhai. Tum batao?");
      break;

    case "EXIT":
      speak("Bye bhai, phir milenge");
      sessionStorage.clear();
      unlocked = false;
      break;

    default:
      speak("Samjha nahi bhai, thoda clearly bolo");
  }
};

// ---------- MIC BUTTON ----------
mic.onclick = () => {
  status.innerText = "Listening...";
  recognition.start();
};

// ---------- SERVICE WORKER REGISTRATION ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then(reg => {
        console.log("✅ Service Worker registered:", reg.scope);
      })
      .catch(err => {
        console.error("❌ Service Worker registration failed:", err);
      });
  });
}
