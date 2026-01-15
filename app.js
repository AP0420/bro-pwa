/*********************************
 * BRO – SMART VOICE ASSISTANT (PWA)
 *********************************/

const status = document.getElementById("status");
const mic = document.getElementById("mic");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "en-IN";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

// ---------- SESSION ----------
let unlocked = sessionStorage.getItem("unlocked") === "true";

// ---------- UTILITIES ----------
function detectLanguage(text) {
  const hindiChars = /[अ-ह]/;
  const hindiWords = ["kya", "kaise", "hai", "nahi", "kar", "bata", "bolo"];

  if (hindiChars.test(text)) return "hi";
  if (hindiWords.some(w => text.includes(w))) return "hinglish";
  return "en";
}

function speak(text, langMode = "en") {
  const msg = new SpeechSynthesisUtterance(text);

  if (langMode === "hi") msg.lang = "hi-IN";
  else msg.lang = "en-IN";

  speechSynthesis.cancel();
  speechSynthesis.speak(msg);

  console.log("🤖 Bro:", text);
}

function askToRepeat(lang) {
  if (lang === "hi") speak("Maaf kijiye, ek baar phir boliye", "hi");
  else if (lang === "hinglish") speak("Sorry bhai, thoda repeat karo");
  else speak("Sorry, can you repeat that?");
}

// ---------- INTENT ----------
function getIntent(text) {
  if (["bye", "exit"].some(w => text.includes(w))) return "EXIT";
  if (["time", "samay"].some(w => text.includes(w))) return "TIME";
  if (["play", "gaana", "song", "baja"].some(w => text.includes(w))) return "PLAY";
  if (["joke"].some(w => text.includes(w))) return "JOKE";
  if (["sad", "low"].some(w => text.includes(w))) return "MOOD_LOW";
  if (["mail", "email", "send mail"].some(w => text.includes(w))) return "EMAIL";

  return "UNKNOWN";
}

// ---------- EMAIL ----------
function handleEmail(text, lang) {
  let body = text.replace("send mail", "").replace("email", "").trim();

  const url =
    "https://mail.google.com/mail/?view=cm&fs=1&body=" +
    encodeURIComponent(body);

  if (lang === "hi")
    speak("Main mail draft kar raha hoon. Aap bhej sakte hain.", "hi");
  else if (lang === "hinglish")
    speak("Mail draft kar diya bhai, bas send kar do");
  else
    speak("I have drafted the email for you. Please review and send.");

  window.open(url, "_blank");
}

// ---------- MAIN LISTENER ----------
recognition.onresult = (event) => {
  const text = event.results[0][0].transcript.toLowerCase();
  status.innerText = "You: " + text;

  const lang = detectLanguage(text);

  // Wake word
  if (!text.includes("bro")) {
    askToRepeat(lang);
    return;
  }

  // Security once
  if (!unlocked) {
    speak("What's my gang");
    unlocked = true;
    sessionStorage.setItem("unlocked", "true");
    return;
  }

  const intent = getIntent(text);

  switch (intent) {
    case "TIME":
      const time = new Date().toLocaleTimeString("en-IN");
      if (lang === "hi") speak(`Abhi samay hai ${time}`, "hi");
      else if (lang === "hinglish") speak(`Time hai ${time}`);
      else speak(`The time is ${time}`);
      break;

    case "PLAY":
      speak(lang === "hi" ? "Gaana chala raha hoon" : "Playing music");
      window.open("https://youtube.com", "_blank");
      break;

    case "EMAIL":
      handleEmail(text, lang);
      break;

    case "JOKE":
      if (lang === "hi")
        speak("Computer thak kyun gaya? Kyunki usne bahut processing ki.", "hi");
      else speak("Why did the computer get tired? Too much processing.");
      break;

    case "MOOD_LOW":
      if (lang === "hi")
        speak("Main samajh raha hoon. Aap akela nahi ho.", "hi");
      else speak("I understand. I’m here with you.");
      break;

    case "EXIT":
      speak(lang === "hi" ? "Alvida" : "Goodbye");
      sessionStorage.clear();
      unlocked = false;
      break;

    default:
      askToRepeat(lang);
  }
};

// ---------- MIC ----------
mic.onclick = () => {
  status.innerText = "Listening...";
  recognition.start();
};
