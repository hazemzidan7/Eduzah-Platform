/**
 * Career discovery journey: maps scenario answers → one of 17 sidebar tracks.
 * Course links use real ids from src/data.js where available.
 */

export const PATH_TRACK_IDS = [
  "english",
  "programming-fundamentals",
  "computer-basics",
  "ai",
  "cybersecurity",
  "data-analysis",
  "frontend",
  "flutter",
  "ui-ux",
  "backend",
  "graphic-design",
  "video-editing",
  "digital-marketing",
  "conversation",
  "soft-skills",
  "business-english",
  "hr",
];

/** @type {Record<string, { title_ar: string, title_en: string, courseIds: string[], prepCourseIds?: string[] }>} */
export const PATH_TRACK_META = {
  english: {
    title_ar: "اللغة الإنجليزية",
    title_en: "English language",
    courseIds: ["english-basics"],
  },
  "programming-fundamentals": {
    title_ar: "أساسيات البرمجة",
    title_en: "Programming fundamentals",
    courseIds: ["programming-fundamentals"],
  },
  "computer-basics": {
    title_ar: "أساسيات الكمبيوتر",
    title_en: "Computer basics",
    courseIds: [],
    prepCourseIds: ["programming-fundamentals"],
  },
  ai: {
    title_ar: "الذكاء الاصطناعي",
    title_en: "Artificial intelligence",
    courseIds: ["ai-ml"],
    prepCourseIds: ["programming-fundamentals"],
  },
  cybersecurity: {
    title_ar: "الأمن السيبراني",
    title_en: "Cybersecurity",
    courseIds: [],
    prepCourseIds: ["programming-fundamentals"],
  },
  "data-analysis": {
    title_ar: "تحليل البيانات",
    title_en: "Data analysis",
    courseIds: ["ai-ml"],
    prepCourseIds: ["programming-fundamentals"],
  },
  frontend: {
    title_ar: "تطوير الواجهات (فرونت إند)",
    title_en: "Frontend development",
    courseIds: ["front-end"],
    prepCourseIds: ["programming-fundamentals"],
  },
  flutter: {
    title_ar: "تطوير تطبيقات فلاتر",
    title_en: "Flutter app development",
    courseIds: ["mobile-dev"],
    prepCourseIds: ["programming-fundamentals"],
  },
  "ui-ux": {
    title_ar: "تصميم واجهات وتجربة المستخدم",
    title_en: "UI / UX design",
    courseIds: ["ui-ux"],
  },
  backend: {
    title_ar: "تطوير الواجهة الخلفية (باك إند)",
    title_en: "Backend development",
    courseIds: [],
    prepCourseIds: ["programming-fundamentals"],
  },
  "graphic-design": {
    title_ar: "التصميم الجرافيكي",
    title_en: "Graphic design",
    courseIds: [],
  },
  "video-editing": {
    title_ar: "مونتاج الفيديو",
    title_en: "Video editing",
    courseIds: [],
  },
  "digital-marketing": {
    title_ar: "التسويق الرقمي",
    title_en: "Digital marketing",
    courseIds: [],
  },
  conversation: {
    title_ar: "محادثة إنجليزي",
    title_en: "English conversation",
    courseIds: ["english-basics"],
  },
  "soft-skills": {
    title_ar: "المهارات الناعمة",
    title_en: "Soft skills",
    courseIds: ["soft-skills"],
  },
  "business-english": {
    title_ar: "إنجليزي أعمال",
    title_en: "Business English",
    courseIds: ["english-basics"],
  },
  hr: {
    title_ar: "الموارد البشرية",
    title_en: "Human resources (HR)",
    courseIds: ["hr-management"],
  },
};

const W_Q1 = {
  visible: { frontend: 3, flutter: 3, "ui-ux": 2, "programming-fundamentals": 1 },
  behind: { backend: 3, cybersecurity: 2, "data-analysis": 2, ai: 2, "programming-fundamentals": 1 },
  artistic: { "graphic-design": 3, "video-editing": 3, "ui-ux": 2 },
  people: { hr: 2, "soft-skills": 3, english: 2, conversation: 2, "business-english": 1 },
  reach: { "digital-marketing": 4, "graphic-design": 1, "video-editing": 1 },
  unsure: { "computer-basics": 3, "programming-fundamentals": 2, english: 1 },
};

const W_Q2 = {
  steps: { "programming-fundamentals": 2, frontend: 2, flutter: 2, backend: 2, ai: 1, "data-analysis": 1 },
  patterns: { "data-analysis": 3, ai: 2, cybersecurity: 1 },
  experience: { "ui-ux": 3, frontend: 1, "soft-skills": 1 },
  message: { "digital-marketing": 2, "graphic-design": 2, "video-editing": 2, english: 1 },
  hesitant: { "computer-basics": 3, english: 1, "soft-skills": 1 },
};

const W_Q3 = {
  zero: { "computer-basics": 4, "programming-fundamentals": 1, english: 1 },
  some: { "programming-fundamentals": 3, english: 1, "soft-skills": 1 },
  daily: { frontend: 1, flutter: 1, ai: 1, "data-analysis": 1, backend: 1 },
  explorer: { ai: 1, flutter: 1, frontend: 1, "video-editing": 1, "digital-marketing": 1 },
};

/** Strong signal for specialization */
const W_Q4 = {
  web_visible: { frontend: 5, "ui-ux": 1 },
  mobile: { flutter: 5 },
  servers: { backend: 5 },
  security: { cybersecurity: 5 },
  data: { "data-analysis": 5 },
  ai: { ai: 5 },
  ux: { "ui-ux": 5 },
  graphic: { "graphic-design": 5 },
  video: { "video-editing": 5 },
  marketing: { "digital-marketing": 5 },
  speak: { conversation: 4, english: 2 },
  office_people: { hr: 3, "soft-skills": 3 },
  business_talk: { "business-english": 5, english: 1 },
  english_general: { english: 4, conversation: 1 },
};

function addWeights(target, delta) {
  for (const k of Object.keys(delta)) {
    target[k] = (target[k] || 0) + delta[k];
  }
}

/**
 * @param {Record<string, string>} answers keys: q1..q4
 * @returns {{ scores: Record<string, number>, winner: string }}
 */
export function scorePathTracks(answers) {
  const scores = {};
  const a1 = answers.q1;
  const a2 = answers.q2;
  const a3 = answers.q3;
  const a4 = answers.q4;
  if (a1 && W_Q1[a1]) addWeights(scores, W_Q1[a1]);
  if (a2 && W_Q2[a2]) addWeights(scores, W_Q2[a2]);
  if (a3 && W_Q3[a3]) addWeights(scores, W_Q3[a3]);
  if (a4 && W_Q4[a4]) addWeights(scores, W_Q4[a4]);

  let winner = PATH_TRACK_IDS[0];
  let best = -1;
  for (const id of PATH_TRACK_IDS) {
    const s = scores[id] || 0;
    if (s > best) {
      best = s;
      winner = id;
    }
  }
  if (best <= 0) winner = "programming-fundamentals";
  return { scores, winner };
}

/**
 * @param {string} comfort q3 value
 * @param {string} winnerTrack
 */
export function shouldSuggestPrepCourse(comfort, winnerTrack) {
  if (comfort === "zero" || comfort === "some") {
    const meta = PATH_TRACK_META[winnerTrack];
    if (meta?.prepCourseIds?.length && !meta.courseIds?.length) return true;
    const tech = ["ai", "cybersecurity", "data-analysis", "frontend", "flutter", "backend"];
    if (tech.includes(winnerTrack)) return true;
  }
  return false;
}

/**
 * @param {Record<string, string>} answers q1–q4
 * @param {object[]} courses
 */
export function buildPathOutcome(answers, courses) {
  const { winner, scores } = scorePathTracks(answers);
  const meta = PATH_TRACK_META[winner];
  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const needPrep = shouldSuggestPrepCourse(answers.q3, winner);

  const orderedIds = [];
  if (winner === "computer-basics") {
    orderedIds.push("programming-fundamentals");
  } else {
    if (needPrep && meta.prepCourseIds?.length) orderedIds.push(...meta.prepCourseIds);
    orderedIds.push(...meta.courseIds);
  }

  const extended = [...new Set(orderedIds)].filter((id) => byId[id]).map((id) => byId[id]);
  const starters = extended.slice(0, 2);

  const hasCatalogGap =
    winner !== "computer-basics" && meta.courseIds.length === 0 && extended.length === 0;

  return { winner, meta, scores, starters, extended, hasCatalogGap, needPrep };
}

export const JOURNEY_AR = {
  hookTitle: "مش لازم تكون عارف تبدأ منين… إحنا معاك خطوة بخطوة.",
  hookBody:
    "لو مخك مشغول ومش عارف تختار مسار، ده طبيعي. هنمشي أربع خطوات بسيطة — من غير مصطلحات تقيلة — عشان نوصل لاتجاه يقرب من طبيعتك وطريقتك في الشغل. مفيش إجابة غلط؛ المهم الصدق مع نفسك.",
  comfortLine: "اختار اللي حاسسه دلوقتي. أي اختيار مفيد — مفيش غلط.",
  stepLabel: (n, total) => `خطوة ${n} من ${total}`,
  resultTitle: "كده صورة أوضح عن المسار اللي يقرب منك.",
  resultPathPrefix: "مسارك المقترح:",
  resultWhyTitle: "ليه ده مناسب ليك؟",
  resultStartTitle: "ابدأ من هنا (أول خطوة أو خطوتين):",
  resultReassure:
    "مش مطلوب تلتزم للأبد. أول خطوة صح كفاية عشان الدنيا توضح — ولما تتقدم نقدر نظبط المسار معاك.",
  catalogHint:
    "الكورس التفصيلي للمسار ده لسه بينزل على المنصة؛ راجع صفحة كل الكورسات أو تواصل معنا للتسجيل المبكر.",
  steps: [
    {
      id: "q1",
      q: "لو تخيّلت نفسك بعد ما تتعلّم حاجة جديدة… إيه نوع الإحساس اللي تحب تحسّه؟",
      options: [
        {
          v: "visible",
          label: "أشوف حاجة خلصتها قدامي على الشاشة",
          hint: "شغل واضح: صفحة، تطبيق، أو حاجة الناس تستخدمها.",
        },
        {
          v: "behind",
          label: "أفهم «إزاي الحاجة شغّالة» من ورا",
          hint: "تحب الترتيب، المنطق، وتفاصيل مش كل الناس شايفاها.",
        },
        {
          v: "artistic",
          label: "أعمل حاجة بلمسة فنية أو جمال",
          hint: "ألوان، شكل، صورة، فيديو — الشكل يعبّر عن فكرة.",
        },
        {
          v: "people",
          label: "أتكلم، أقنع، أو أرتّب شغل بين ناس",
          hint: "تواصل، تعبير، أو تنسيق بين فريق وبيئة شغل.",
        },
        {
          v: "reach",
          label: "أخلي فكرة توصل لناس وأشوف تفاعل",
          hint: "محتوى، إعلان، أو رسالة تنتشر وتجيب اهتمام.",
        },
        {
          v: "unsure",
          label: "لسه مش متخيّل — عايز أبدأ من تحت الصفر بهدوء",
          hint: "عايز أرضية صلبة قبل ما تتخصص.",
        },
      ],
    },
    {
      id: "q2",
      q: "لما تواجهك مشكلة أو فكرة جديدة… إنت بتميل لإيه؟",
      options: [
        {
          v: "steps",
          label: "أقسّمها خطوات وأجرّب لحد ما تشتغل",
          hint: "تجربة عملية وترتيب على الأرض.",
        },
        {
          v: "patterns",
          label: "أدور على نمط أو معلومات وأقارن",
          hint: "الملاحظة والأرقام بتهديك.",
        },
        {
          v: "experience",
          label: "أفكّر في تجربة الإنسان وهو بيستخدم الحاجة",
          hint: "«المستخدم هيعمل إيه؟» يهمّك قبل التفاصيل التقنية.",
        },
        {
          v: "message",
          label: "أفكّر في الصورة الكبيرة والرسالة",
          hint: "الفكرة والإحساس قبل التفصيل الدقيق.",
        },
        {
          v: "hesitant",
          label: "بحتار أو بخاف أغلط",
          hint: "عايز بداية ترايّحك — وده طبيعي جدًا.",
        },
      ],
    },
    {
      id: "q3",
      q: "دلوقتي… إنت فين من الكمبيوتر والبرامج؟",
      options: [
        {
          v: "zero",
          label: "محتاج أرتاح على أساسيات الجهاز والإنترنت",
          hint: "عايز أرضية قبل أي تخصص.",
        },
        {
          v: "some",
          label: "بستخدم الجهاز بس مش متأكد أبدأ إيه",
          hint: "جاهز لخطوة منطقية من غير ما تغرق.",
        },
        {
          v: "daily",
          label: "بستخدم الكمبيوتر يوميًا ومريّح في التعلّم",
          hint: "تقدر تمشي في مسار أسرع شوية.",
        },
        {
          v: "explorer",
          label: "بحب أجرّب أدوات جديدة وأطبّق كتير",
          hint: "مناسب لمسارات فيها شغل عملي متكرر.",
        },
      ],
    },
    {
      id: "q4",
      q: "من غير تفاصيل تقنية… إيه اللي يشدّك في شغل قدام؟",
      options: [
        { v: "web_visible", label: "أبني صفحات ومواقع الناس تشوفها", hint: "الشغل الظاهر على المتصفح." },
        { v: "mobile", label: "أعمل تطبيقات على الموبايل", hint: "تجربة المستخدم على التليفون." },
        { v: "servers", label: "أشتغل على أنظمة و«ظهر» المنتج", hint: "اللي يخلي الخدمة تشتغل من ورا." },
        { v: "security", label: "أحمي أنظمة وأفهم المخاطر", hint: "الأمان والحد من الثغرات." },
        { v: "data", label: "أحلل بيانات وأطلع قرار", hint: "جداول، اتجاهات، معنى ورا الأرقام." },
        { v: "ai", label: "ذكاء اصطناعي وأتمتة", hint: "أدوات تساعد الناس تشتغل أذكى." },
        { v: "ux", label: "تصميم سهل ومريح للاستخدام", hint: "راحة المستخدم قبل الشكل بس." },
        { v: "graphic", label: "تصميم جرافيك وهوية بصرية", hint: "شعارات، صور، هوية للبراند." },
        { v: "video", label: "مونتاج وفيديو وقصة بصريّة", hint: "صورة، إيقاع، سرد بالفيديو." },
        { v: "marketing", label: "تسويق رقمي ووصول للجمهور", hint: "الرسالة توصل للناس المناسبة." },
        { v: "speak", label: "أتكلم إنجليزي بطلاقة في الحياة", hint: "محادثة ومخارج يومية." },
        { v: "office_people", label: "مهارات مع الزملاء والفرق", hint: "تواصل، تعاون، بيئة الشغل." },
        { v: "business_talk", label: "إنجليزي للشغل والاجتماعات", hint: "إيميلات، اجتماعات، تعبير مهني." },
        { v: "english_general", label: "إنجليزي عام من الأساسيات للمستويات", hint: "رحلة لغة متكاملة على المستويات." },
      ],
    },
  ],
};

export const JOURNEY_EN = {
  hookTitle: "You don’t have to know where to start — we’ll walk with you.",
  hookBody:
    "If your mind feels crowded and choosing a path is hard, that’s normal. Four gentle steps — no heavy jargon — help us see what fits your style. There’s no wrong answer; honesty is enough.",
  comfortLine: "Pick what feels true right now. Every choice helps.",
  stepLabel: (n, total) => `Step ${n} of ${total}`,
  resultTitle: "Here’s a clearer direction that fits you.",
  resultPathPrefix: "Suggested path:",
  resultWhyTitle: "Why this fits",
  resultStartTitle: "Start here (first 1–2 steps):",
  resultReassure:
    "You’re not locking in forever. One good first step is enough — we can adjust as you grow.",
  catalogHint:
    "The exact course for this track is still rolling out on the platform; browse all courses or contact us for early enrollment.",
  steps: [
    {
      id: "q1",
      q: "Imagine you’ve just learned something new. What feeling do you want most?",
      options: [
        {
          v: "visible",
          label: "I see something I built on screen",
          hint: "Clear output: a page, app, or thing people use.",
        },
        {
          v: "behind",
          label: "I understand how it works behind the scenes",
          hint: "Structure, logic, details not everyone sees.",
        },
        {
          v: "artistic",
          label: "I create something with a visual or artistic touch",
          hint: "Color, layout, photo, video — look carries the idea.",
        },
        {
          v: "people",
          label: "I talk, persuade, or coordinate between people",
          hint: "Communication, expression, or team flow.",
        },
        {
          v: "reach",
          label: "I get an idea to people and see engagement",
          hint: "Content, ads, or a message that spreads.",
        },
        {
          v: "unsure",
          label: "I’m not sure yet — I want a calm start from zero",
          hint: "A solid base before specializing.",
        },
      ],
    },
    {
      id: "q2",
      q: "When you face a new problem or idea, what do you lean toward?",
      options: [
        {
          v: "steps",
          label: "Break it into steps and try until it works",
          hint: "Hands-on trial and practical order.",
        },
        {
          v: "patterns",
          label: "Look for patterns, info, and compare",
          hint: "Observation and numbers guide you.",
        },
        {
          v: "experience",
          label: "Think about the person using it",
          hint: "“What will the user do?” before deep tech.",
        },
        {
          v: "message",
          label: "Think about the big picture and message",
          hint: "Idea and feeling before tiny detail.",
        },
        {
          v: "hesitant",
          label: "I hesitate or worry about choosing wrong",
          hint: "You want a gentle start — that’s OK.",
        },
      ],
    },
    {
      id: "q3",
      q: "Right now, where are you with computers and apps?",
      options: [
        {
          v: "zero",
          label: "I need comfort with device & internet basics first",
          hint: "Grounding before any specialty.",
        },
        {
          v: "some",
          label: "I use a PC but I’m not sure where to begin",
          hint: "Ready for a logical first step without drowning.",
        },
        {
          v: "daily",
          label: "I use a computer daily and learn comfortably",
          hint: "You can move a bit faster.",
        },
        {
          v: "explorer",
          label: "I like trying new tools and practicing a lot",
          hint: "Good for hands-on, repeated practice tracks.",
        },
      ],
    },
    {
      id: "q4",
      q: "Without jargon — what pulls you for work ahead?",
      options: [
        { v: "web_visible", label: "Build websites people see in the browser", hint: "Visible work on the web." },
        { v: "mobile", label: "Build mobile apps", hint: "Phone-first experiences." },
        { v: "servers", label: "Work on systems and the “back” of the product", hint: "What makes the service run." },
        { v: "security", label: "Protect systems and understand risk", hint: "Safety and reducing vulnerabilities." },
        { v: "data", label: "Analyze data and decide from it", hint: "Tables, trends, meaning behind numbers." },
        { v: "ai", label: "AI and automation", hint: "Tools that help people work smarter." },
        { v: "ux", label: "Design that’s easy and pleasant to use", hint: "Comfort before pixels alone." },
        { v: "graphic", label: "Graphic design and visual identity", hint: "Logos, imagery, brand look." },
        { v: "video", label: "Video editing and visual storytelling", hint: "Pacing, cuts, story in video." },
        { v: "marketing", label: "Digital marketing and reaching an audience", hint: "Message meets the right people." },
        { v: "speak", label: "Speak English fluently in daily life", hint: "Conversation and real-life output." },
        { v: "office_people", label: "Skills with colleagues and teams", hint: "Collaboration and workplace flow." },
        { v: "business_talk", label: "English for work and meetings", hint: "Email, meetings, professional tone." },
        { v: "english_general", label: "General English from basics through levels", hint: "A full level-based language path." },
      ],
    },
  ],
};

/** @param {Record<string, string>} answers */
export function buildWhyBullets(answers, ar) {
  const lines = [];
  const q1 = answers.q1;
  const q2 = answers.q2;
  const q3 = answers.q3;
  if (ar) {
    if (q1 === "visible") lines.push("إجاباتك وضحت إنك بتحب تشوف نتيجة شغلك قدامك — ده قريب من مسارات الواجهات والتطبيقات.");
    else if (q1 === "behind") lines.push("يميل تفكيرك لـ«إزاي الحاجة شغّالة من ورا» — مناسب لمسارات البنية، البيانات، والأمان.");
    else if (q1 === "artistic") lines.push("اللمسة الفنية والمحتوى البصري يديك طاقة — قريب من التصميم والفيديو.");
    else if (q1 === "people") lines.push("التواصل وترتيب الشغل بين الناس قريب منك — مناسب للمهارات الناعمة والموارد البشرية أو اللغة.");
    else if (q1 === "reach") lines.push("وصول الفكرة للناس والتفاعل يهمّك — قريب من التسويق الرقمي.");
    else lines.push("بدأت من مكان صادق: مش لازم تكون محدد — بنبني من الأساس.");

    if (q2 === "patterns") lines.push("أسلوبك في المقارنة والأنماط يدعم مسارات تحليل بيانات أو ذكاء اصطناعي.");
    else if (q2 === "experience") lines.push("تفكيرك في تجربة المستخدم يدعم مسارات واجهات وتجربة استخدام.");
    else if (q2 === "hesitant") lines.push("لو حاسس بالحيرة، اختيار خطوة أولى واضحة يقلل القلق — مش مطلوب تكون خبير من أول يوم.");

    if (q3 === "zero" || q3 === "some") lines.push("مستوى راحتك مع الجهاز مناسب إنك تبدأ بخطوة تأسيس من غير ضغط.");
    else lines.push("راحتك مع التعلم على الجهاز تسمح تمشي في المسار بثقة أكبر.");
  } else {
    if (q1 === "visible") lines.push("You like seeing concrete output — close to web and app-facing paths.");
    else if (q1 === "behind") lines.push("You lean toward how things work behind the scenes — infra, data, and security fit that.");
    else if (q1 === "artistic") lines.push("Visual craft energizes you — design and video tracks align.");
    else if (q1 === "people") lines.push("Communication and coordination matter — soft skills, HR, or language paths fit.");
    else if (q1 === "reach") lines.push("Reach and engagement matter — digital marketing is a strong match.");
    else lines.push("Starting unsure is honest — we build from fundamentals.");

    if (q2 === "patterns") lines.push("Pattern-seeking supports data and AI directions.");
    else if (q2 === "experience") lines.push("User-first thinking supports UI/UX paths.");
    else if (q2 === "hesitant") lines.push("If choice feels scary, a clear first step reduces anxiety — expertise comes later.");

    if (q3 === "zero" || q3 === "some") lines.push("Your comfort level fits a grounding first step without pressure.");
    else lines.push("Your device comfort helps you move with more confidence.");
  }
  return lines.slice(0, 3);
}
