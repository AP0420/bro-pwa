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

// ---------- EMAIL FLOW STATE ----------
let emailStep = null;
let emailData = {
  to: "",
  subject: "",
  body: ""
};

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
  msg.lang = langMode === "hi" ? "hi-IN" : "en-IN";
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

// ---------- EMAIL FLOW ----------
function handleEmailFlow(text, lang) {
  if (emailStep === "to") {
    emailData.to = text.replace(/\s/g, "");
    emailStep = "subject";
    speak(
      lang === "hi"
        ? "Email ka subject kya hoga?"
        : lang === "hinglish"
        ? "Mail ka subject batao"
        : "What should be the subject?"
    );
    return true;
  }

  if (emailStep === "subject") {
    emailData.subject = text;
    emailStep = "body";
    speak(
      lang === "hi"
        ? "Email me kya likhna hai?"
        : lang === "hinglish"
        ? "Mail me kya likhu?"
        : "What should I write in the email?"
    );
    return true;
  }

  if (emailStep === "body") {
    emailData.body = text;
    emailStep = null;

    const url =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      "&to=" + encodeURIComponent(emailData.to) +
      "&su=" + encodeURIComponent(emailData.subject) +
      "&body=" + encodeURIComponent(emailData.body);

    speak(
      lang === "hi"
        ? "Maine email draft kar diya hai. Aap bhej sakte hain."
        : lang === "hinglish"
        ? "Mail draft kar diya bhai, check karke send kar do"
        : "I have drafted the email. Please review and send."
    );

    window.open(url, "_blank");
    emailData = { to: "", subject: "", body: "" };
    return true;
  }

  return false;
}

// ---------- MAIN LISTENER ----------
recognition.onresult = (event) => {
  const text = event.results[0][0].transcript.toLowerCase();
  status.innerText = "You: " + text;

  const lang = detectLanguage(text);

  // Email flow in progress
  if (emailStep) {
    handleEmailFlow(text, lang);
    return;
  }

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
      speak(
        lang === "hi"
          ? `Abhi samay hai ${time}`
          : lang === "hinglish"
          ? `Time hai ${time}`
          : `The time is ${time}`
      );
      break;

    case "PLAY":
      speak(lang === "hi" ? "Gaana chala raha hoon" : "Playing music");
      window.open("https://youtube.com", "_blank");
      break;

    case "EMAIL":
      emailStep = "to";
      speak(
        lang === "hi"
          ? "Kis ko email bhejna hai?"
          : lang === "hinglish"
          ? "Kisko mail bhejna hai?"
          : "Whom should I send the email to?"
      );
      break;

    case "JOKE":
      speak(
        lang === "hi"
          ? "Computer thak kyun gaya? Kyunki usne bahut processing ki."
          : "Why did the computer get tired? Too much processing."
      );
      break;

    case "MOOD_LOW":
      speak(
        lang === "hi"
          ? "Main samajh raha hoon. Aap akela nahi ho."
          : "I understand. I’m here with you."
      );
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
