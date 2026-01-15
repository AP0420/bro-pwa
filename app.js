/*********************************
 * BRO – ADVANCED VOICE ASSISTANT
 * (Logic + UI Animations)
 *********************************/

const status = document.getElementById("status");
const mic = document.getElementById("mic");
const wave = document.getElementById("wave");

// ---------- UI ANIMATION CONTROLS ----------
function uiListening(on) {
  if (on) {
    mic.classList.add("listening");
    wave.classList.remove("hidden");
  } else {
    mic.classList.remove("listening");
    wave.classList.add("hidden");
  }
}

// ---------- SPEECH RECOGNITION ----------
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "en-IN";
recognition.interimResults = false;
recognition.continuous = true;

// ---------- SESSION ----------
let unlocked = sessionStorage.getItem("unlocked") === "true";
let listening = false;

// ---------- ACTION CONFIRM ----------
let pendingAction = null;

// ---------- EMAIL STATE ----------
let emailStep = null;
let emailData = { to: "", subject: "", body: "" };

// ---------- WHATSAPP STATE ----------
let whatsappStep = null;
let whatsappData = { to: "", message: "", attachment: false };

// ---------- LANGUAGE DETECTION ----------
function detectLanguage(text) {
  const hindiWords = ["kya", "kaise", "hai", "nahi", "kar", "bhej", "bolo"];
  if (hindiWords.some(w => text.includes(w))) return "hinglish";
  return "en";
}

// ---------- SPEAK ----------
function speak(text, lang = "en") {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang === "hi" ? "hi-IN" : "en-IN";
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
  console.log("🤖 Bro:", text);
}

// ---------- INTENT ----------
function getIntent(text) {
  if (text.includes("whatsapp")) return "WHATSAPP";
  if (text.includes("mail") || text.includes("email")) return "EMAIL";
  if (text.includes("time")) return "TIME";
  if (text.includes("stop listening")) return "STOP";
  if (text.includes("bye") || text.includes("exit")) return "EXIT";
  if (text.includes("yes")) return "YES";
  if (text.includes("no")) return "NO";
  return "UNKNOWN";
}

// ---------- EMAIL FLOW ----------
function handleEmailFlow(text) {
  if (emailStep === "to") {
    emailData.to = text.replace(/\s/g, "");
    emailStep = "subject";
    speak("What should be the subject?");
    return true;
  }

  if (emailStep === "subject") {
    emailData.subject = text;
    emailStep = "body";
    speak("What should I write in the email?");
    return true;
  }

  if (emailStep === "body") {
    emailData.body = text;
    emailStep = null;

    pendingAction = () => {
      const url =
        "https://mail.google.com/mail/?view=cm&fs=1" +
        "&to=" + encodeURIComponent(emailData.to) +
        "&su=" + encodeURIComponent(emailData.subject) +
        "&body=" + encodeURIComponent(emailData.body);
      window.open(url, "_blank");
    };

    speak("Should I open the email now?");
    return true;
  }

  return false;
}

// ---------- WHATSAPP FLOW ----------
function handleWhatsappFlow(text) {
  if (whatsappStep === "to") {
    whatsappData.to = text.replace(/\s/g, "");
    whatsappStep = "message";
    speak("What message should I send?");
    return true;
  }

  if (whatsappStep === "message") {
    whatsappData.message = text;
    whatsappStep = "attachment";
    speak("Do you want to attach any file?");
    return true;
  }

  if (whatsappStep === "attachment") {
    whatsappData.attachment = text.includes("yes");

    pendingAction = () => {
      const url =
        "https://wa.me/" +
        whatsappData.to +
        "?text=" +
        encodeURIComponent(whatsappData.message);
      window.open(url, "_blank");
    };

    speak("Should I open WhatsApp now?");
    whatsappStep = null;
    return true;
  }

  return false;
}

// ---------- MAIN LISTENER ----------
recognition.onresult = (event) => {
  const text =
    event.results[event.results.length - 1][0].transcript.toLowerCase();
  status.innerText = "You: " + text;

  // Confirmation step
  if (pendingAction) {
    const intent = getIntent(text);
    if (intent === "YES") {
      speak("Okay, doing it now.");
      pendingAction();
      pendingAction = null;
    } else if (intent === "NO") {
      speak("Cancelled.");
      pendingAction = null;
    }
    return;
  }

  // Active flows
  if (emailStep && handleEmailFlow(text)) return;
  if (whatsappStep && handleWhatsappFlow(text)) return;

  if (!text.includes("bro")) return;

  if (!unlocked) {
    speak("What's my gang");
    unlocked = true;
    sessionStorage.setItem("unlocked", "true");
    return;
  }

  const intent = getIntent(text);

  switch (intent) {
    case "EMAIL":
      emailStep = "to";
      speak("Whom should I send the email to?");
      break;

    case "WHATSAPP":
      whatsappStep = "to";
      speak("Whom should I send the WhatsApp message to?");
      break;

    case "TIME":
      speak("The time is " + new Date().toLocaleTimeString("en-IN"));
      break;

    case "STOP":
      speak("Okay, I will stop listening.");
      recognition.stop();
      listening = false;
      uiListening(false);
      break;

    case "EXIT":
      speak("Bye. Talk to you later.");
      sessionStorage.clear();
      unlocked = false;
      recognition.stop();
      listening = false;
      uiListening(false);
      break;

    default:
      speak("I am listening. Please tell me what you want to do.");
  }
};

// ---------- AUTO RESTART ----------
recognition.onend = () => {
  if (listening) recognition.start();
  uiListening(false);
};

// ---------- MIC ----------
mic.onclick = () => {
  if (!listening) {
    listening = true;
    status.innerText = "Listening...";
    uiListening(true);
    recognition.start();
  }
};
