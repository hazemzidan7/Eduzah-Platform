import { useParams, useNavigate } from "react-router-dom";
import { C, gHero, gPur } from "../../theme";
import { Btn, Card, Badge } from "../../components/UI";
import { useLang } from "../../context/LangContext";
import { SITE } from "../../data";

const SERVICES_DATA = {
  "web-development": {
    abbr: "WD",
    color: "#d91b5b",
    title_ar: "تطوير المواقع والتطبيقات",
    title_en: "Web Development",
    hero_ar: "موقعك هو واجهتك الرقمية — نبنيه بالمستوى اللي يليق بعملك",
    hero_en: "Your website is your digital identity — we build it to the highest standards",
    sub_ar: "نصمم ونطور مواقع وتطبيقات ويب احترافية تعكس هوية علامتك التجارية وتحقق أهداف عملك. من Landing Pages البسيطة حتى أضخم منصات الـ E-commerce.",
    sub_en: "We design and develop professional websites and web applications that reflect your brand identity and achieve your business goals — from simple landing pages to full-scale e-commerce platforms.",
    offers_ar: ["Landing Pages احترافية بتحوّل الزوار لعملاء","متاجر إلكترونية متكاملة مع بوابات دفع","تطبيقات ويب معقدة وأنظمة إدارة","لوحات تحكم وداشبورد تفاعلية","تحسين سرعة الموقع وتجربة المستخدم","صيانة ودعم فني مستمر"],
    offers_en: ["Professional landing pages that convert visitors to customers","Full e-commerce stores with payment gateways","Complex web apps and management systems","Interactive dashboards and admin panels","Website speed optimization and UX improvements","Ongoing maintenance and technical support"],
    tech: ["React.js", "Next.js", "Vue.js", "Node.js", "Express", "PostgreSQL", "MongoDB", "TypeScript", "Tailwind CSS", "REST APIs"],
    process_ar: [["1","الاكتشاف","نفهم احتياجاتك وأهداف مشروعك بالكامل"],["2","التصميم","نصمم واجهة مستخدم احترافية تعكس هويتك"],["3","التطوير","نبني المشروع بأحدث التقنيات وأفضل الممارسات"],["4","الاختبار","نختبر كل شيء على جميع الأجهزة والمتصفحات"],["5","الإطلاق","نطلق مشروعك ونتأكد من سير كل شيء بسلاسة"],["6","الدعم","نوفر دعماً فنياً مستمراً بعد الإطلاق"]],
    whyUs_ar: ["فريق من المطورين المعتمدين بخبرة +5 سنوات","تسليم في المواعيد المحددة بدون تأخير","كود نظيف وقابل للتطوير في المستقبل","تصميم responsive يعمل على كل الأجهزة","دعم فني مجاني لمدة 3 أشهر بعد التسليم","ضمان رضا العميل الكامل"],
    stats: [["50+","مشروع","project"],["5+","سنوات خبرة","years"],["100%","رضا العملاء","satisfaction"],["24h","وقت الرد","response"]],
  },
  "mobile-apps": {
    abbr: "MA",
    color: "#4a1f6e",
    title_ar: "تطوير تطبيقات الموبايل",
    title_en: "Mobile App Development",
    hero_ar: "اوصل لعملاءك على موبايلهم — تطبيقات iOS و Android بمعيار عالمي",
    hero_en: "Reach your customers on their mobile — iOS & Android apps built to global standards",
    sub_ar: "نبني تطبيقات موبايل احترافية تعمل على iOS و Android من كود واحد باستخدام Flutter. تطبيقات سريعة، جميلة، وسهلة الاستخدام تتفوق على المنافسين.",
    sub_en: "We build professional mobile apps that run on both iOS and Android from a single codebase using Flutter. Fast, beautiful, and user-friendly apps that outperform competitors.",
    offers_ar: ["تطبيقات تجارية وـ E-commerce","تطبيقات التوصيل والخدمات","تطبيقات الصحة واللياقة","تطبيقات التعليم والتدريب","تكامل مع Firebase وـ APIs خارجية","نشر على App Store & Google Play"],
    offers_en: ["Business and e-commerce apps","Delivery and service apps","Health and fitness apps","Education and training apps","Firebase and external API integration","Publishing on App Store & Google Play"],
    tech: ["Flutter", "Dart", "Firebase", "REST APIs", "Provider", "Riverpod", "BLoC", "SQLite", "Push Notifications", "Google Maps"],
    process_ar: [["1","التحليل","نحلل متطلبات التطبيق وتجربة المستخدم"],["2","الـ UI/UX","نصمم واجهة مستخدم جذابة وسهلة الاستخدام"],["3","البرمجة","نطور التطبيق بـ Flutter لضمان الأداء الأمثل"],["4","الاختبار","نختبر على أجهزة iOS و Android الحقيقية"],["5","النشر","ننشر على متجر Apple و Google Play"],["6","الدعم","تحديثات وإصلاحات مستمرة بعد الإطلاق"]],
    whyUs_ar: ["تطوير Cross-platform بتكلفة منخفضة","أداء يضاهي التطبيقات الـ Native","تصميم متوافق مع معايير Apple & Google","تكامل كامل مع الـ Backend","دعم مستمر وتحديثات دورية","خبرة في نشر أكثر من 20 تطبيق"],
    stats: [["20+","تطبيق","apps"],["2","منصة","platforms"],["4.8","تقييم","rating"],["48h","تسليم أول نموذج","prototype"]],
  },
  "ai-solutions": {
    abbr: "AI",
    color: "#672d86",
    title_ar: "حلول الذكاء الاصطناعي",
    title_en: "AI & Machine Learning Solutions",
    hero_ar: "اجعل عملك أذكى — حلول AI حقيقية تحل مشاكل حقيقية",
    hero_en: "Make your business smarter — real AI solutions that solve real problems",
    sub_ar: "نساعد الشركات على تبني الذكاء الاصطناعي وتحقيق قفزة في الكفاءة والإنتاجية. من Chatbots ذكية حتى نماذج تنبؤية معقدة، نحول بياناتك لقرارات أذكى.",
    sub_en: "We help businesses adopt AI and achieve leaps in efficiency and productivity. From smart chatbots to complex predictive models, we turn your data into smarter decisions.",
    offers_ar: ["Chatbots ذكية لخدمة العملاء 24/7","تحليل البيانات واستخراج الرؤى","نماذج التنبؤ والتوصية","معالجة الصور والتعرف البصري","أتمتة العمليات الروتينية بالـ AI","تكامل OpenAI وـ LLMs في منتجاتك"],
    offers_en: ["Smart chatbots for 24/7 customer service","Data analysis and insight extraction","Prediction and recommendation models","Image processing and visual recognition","Automation of routine processes with AI","OpenAI and LLMs integration in your products"],
    tech: ["Python", "TensorFlow", "Keras", "Scikit-learn", "OpenAI API", "LangChain", "Pandas", "NumPy", "FastAPI", "Docker"],
    process_ar: [["1","تحليل البيانات","نفهم بياناتك ونحدد الفرص المناسبة للـ AI"],["2","تحديد الحل","نختار النهج الأمثل: ML, Deep Learning, أو LLMs"],["3","بناء النموذج","نبني ونُدرّب النموذج على بياناتك الحقيقية"],["4","التقييم","نختبر دقة النموذج ونحسّن أداءه"],["5","الدمج","ندمج الحل في أنظمتك الحالية بسلاسة"],["6","المراقبة","نراقب الأداء ونحسّن النموذج بمرور الوقت"]],
    whyUs_ar: ["خبرة في أحدث تقنيات الـ AI و LLMs","حلول مخصصة لاحتياجات عملك تحديداً","بيانات وخصوصية محمية بالكامل","نتائج قابلة للقياس والتتبع","تدريب فريقك على استخدام الحل","دعم مستمر وتحديثات النموذج"],
    stats: [["30+","مشروع AI","projects"],["95%","دقة متوسطة","accuracy"],["3x","زيادة الكفاءة","efficiency"],["LLMs","أحدث التقنيات","tech"]],
  },
  "cybersecurity": {
    abbr: "CS",
    color: "#ef4444",
    title_ar: "الأمن السيبراني",
    title_en: "Cybersecurity Services",
    hero_ar: "احمي عملك من التهديدات الرقمية — الأمن ليس خياراً، هو ضرورة",
    hero_en: "Protect your business from digital threats — security is not optional, it's a necessity",
    sub_ar: "نوفر خدمات أمن سيبراني شاملة لحماية بياناتك وأنظمتك. من اختبارات الاختراق حتى التدريب الأمني، نضمن أن عملك محمي من كل الثغرات.",
    sub_en: "We provide comprehensive cybersecurity services to protect your data and systems. From penetration testing to security training, we ensure your business is protected from all vulnerabilities.",
    offers_ar: ["اختبارات الاختراق (Penetration Testing)","تدقيق أمني شامل للأنظمة والتطبيقات","تحليل الثغرات وخطط المعالجة","تأمين التطبيقات قبل الإطلاق","تدريب الفريق على الوعي الأمني","الاستجابة للحوادث الأمنية"],
    offers_en: ["Penetration testing for systems and apps","Comprehensive security audits","Vulnerability analysis and remediation plans","Pre-launch application security","Team security awareness training","Incident response and recovery"],
    tech: ["OWASP Top 10", "Burp Suite", "Kali Linux", "Nmap", "Metasploit", "Wireshark", "SIEM", "SSL/TLS", "WAF", "Zero Trust"],
    process_ar: [["1","الاستطلاع","نحلل البنية التحتية ونحدد نقاط الهجوم المحتملة"],["2","الاختبار","نجري اختبارات اختراق محكومة بمنهجية OWASP"],["3","التقرير","نوثق كل الثغرات مع تقييم خطورتها"],["4","المعالجة","نقدم حلولاً تفصيلية لإصلاح كل ثغرة"],["5","التحقق","نُعيد الاختبار للتأكد من إغلاق الثغرات"],["6","التدريب","ندرّب فريقك لمنع الثغرات مستقبلاً"]],
    whyUs_ar: ["خبراء معتمدون OSCP و CEH","منهجية مبنية على معايير OWASP","تقارير تفصيلية قابلة للتنفيذ","سرية تامة لكل المعلومات","اختبارات على بيئة الإنتاج الحقيقية","متابعة مستمرة بعد المعالجة"],
    stats: [["100+","ثغرة اكتُشفت","vulnerabilities"],["0","تسريب بيانات","breaches"],["OWASP","معيار الاختبار","standard"],["48h","تقرير كامل","report"]],
  },
  "ui-ux-design": {
    abbr: "UX",
    color: "#faa633",
    title_ar: "تصميم UI/UX",
    title_en: "UI/UX Design",
    hero_ar: "اجعل منتجك يُحب من أول نظرة — تصميم يحوّل المستخدمين لمعجبين",
    hero_en: "Make your product loved at first sight — design that turns users into fans",
    sub_ar: "نصمم تجارب مستخدم استثنائية تجمع بين الجمال البصري والسهولة الوظيفية. كل قرار تصميمي مبني على بحث حقيقي وفهم عميق لاحتياجات مستخدميك.",
    sub_en: "We design exceptional user experiences that combine visual beauty with functional ease. Every design decision is based on real research and a deep understanding of your users' needs.",
    offers_ar: ["تصميم واجهات المستخدم (UI) بـ Figma","بحث تجربة المستخدم (UX Research)","بناء نماذج أولية تفاعلية (Prototypes)","أنظمة التصميم (Design Systems)","اختبارات قابلية الاستخدام","تحسين التصميم الحالي (UX Audit)"],
    offers_en: ["UI design with Figma","UX research and user interviews","Interactive prototypes","Design systems and component libraries","Usability testing","UX audit and redesign"],
    tech: ["Figma", "Adobe XD", "Principle", "ProtoPie", "Zeplin", "InVision", "Photoshop", "Illustrator", "Lottie", "Framer"],
    process_ar: [["1","البحث","نجري مقابلات المستخدمين وندرس المنافسين"],["2","رسم المسار","نصمم User Journey Maps وـ Information Architecture"],["3","الـ Wireframes","نبني هياكل الشاشات الأساسية"],["4","التصميم","نطبق الهوية البصرية ونبني تصاميم عالية الدقة"],["5","الـ Prototype","نصنع نموذج تفاعلي واقعي للاختبار"],["6","الاختبار","نختبر مع مستخدمين حقيقيين ونحسّن"]],
    whyUs_ar: ["تصميم مبني على بيانات وبحث حقيقي","تسليم ملفات Figma منظمة وجاهزة للتطوير","تجربة في تصميم أكثر من 40 منتج رقمي","معرفة عميقة بـ Design Systems","متوافق مع معايير Accessibility","تحديثات لا محدودة حتى الرضا التام"],
    stats: [["40+","مشروع تصميم","projects"],["4.9","تقييم العملاء","rating"],["∞","تعديلات","revisions"],["72h","أول Wireframe","wireframe"]],
  },
  "cloud-devops": {
    abbr: "CD",
    color: "#10b981",
    title_ar: "الكلاود وـ DevOps",
    title_en: "Cloud & DevOps",
    hero_ar: "خليك جاهز للتوسع — بنية تحتية سحابية موثوقة وعمليات تطوير محترفة",
    hero_en: "Be ready to scale — reliable cloud infrastructure and professional DevOps operations",
    sub_ar: "نساعدك على الانتقال للكلاود وبناء بنية تحتية تتحمل الضغط وتنمو مع عملك. من CI/CD pipelines حتى Kubernetes clusters، نضمن أن تطبيقاتك تعمل دائماً.",
    sub_en: "We help you migrate to the cloud and build infrastructure that handles load and grows with your business. From CI/CD pipelines to Kubernetes clusters, we ensure your apps always run.",
    offers_ar: ["الانتقال للكلاود (Cloud Migration)","بناء بنية تحتية قابلة للتوسع","إعداد CI/CD Pipelines","إدارة Containers بـ Docker & Kubernetes","مراقبة الأداء والتنبيه التلقائي","تحسين تكاليف الكلاود (Cost Optimization)"],
    offers_en: ["Cloud migration planning and execution","Scalable infrastructure setup","CI/CD pipeline implementation","Container management with Docker & Kubernetes","Performance monitoring and auto-alerting","Cloud cost optimization"],
    tech: ["AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Terraform", "GitHub Actions", "Jenkins", "Prometheus", "Grafana"],
    process_ar: [["1","التقييم","نقيّم بنيتك الحالية ونخطط للانتقال"],["2","البناء","نبني البنية التحتية السحابية المثالية"],["3","الـ CI/CD","نؤتمت عمليات البناء والاختبار والنشر"],["4","الـ Containers","نعبّئ تطبيقاتك في Containers للمرونة"],["5","المراقبة","نضع نظام مراقبة وتنبيه شامل"],["6","التحسين","نحسّن الاستخدام ونخفض التكاليف"]],
    whyUs_ar: ["شراكات معتمدة مع AWS و Google Cloud","خبرة في إدارة بنى تحتية تخدم ملايين المستخدمين","ضمان uptime 99.9%","استجابة فورية للحوادث 24/7","توثيق كامل لكل ما نبنيه","نقل كامل للمعرفة لفريقك"],
    stats: [["99.9%","Uptime","uptime"],["24/7","مراقبة","monitoring"],["50%","تخفيض التكاليف","cost"],["AWS","شريك معتمد","partner"]],
  },
};

export default function ServiceDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLang();

  const svc = SERVICES_DATA[slug];

  if (!svc) return (
    <div style={{ padding: "80px 5%", textAlign: "center", color: C.muted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>?</div>
      <h2 style={{ marginBottom: 8 }}>{lang === "ar" ? "الخدمة غير موجودة" : "Service not found"}</h2>
      <Btn children={t("backToServices")} onClick={() => navigate("/services")} />
    </div>
  );

  const title   = lang === "ar" ? svc.title_ar   : svc.title_en;
  const hero    = lang === "ar" ? svc.hero_ar     : svc.hero_en;
  const sub     = lang === "ar" ? svc.sub_ar      : svc.sub_en;
  const offers  = lang === "ar" ? svc.offers_ar   : svc.offers_en;
  const whyUs   = lang === "ar" ? svc.whyUs_ar    : ["5+ years of experience","On-time delivery","Clean, scalable code","Free 3-month support","100% client satisfaction","Expert certified team"];

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg,#1a0a2e 0%,#321d3d 45%,${svc.color}33 100%)`,
        padding: "clamp(50px,8vw,80px) 5%",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 450, height: 450, background: `radial-gradient(circle,${svc.color}30,transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-3%", width: 350, height: 350, background: `radial-gradient(circle,rgba(217,27,91,.15),transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />

        <button onClick={() => navigate("/services")}
          style={{ background: "rgba(255,255,255,.08)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 14px", color: C.muted, fontFamily: "'Cairo',sans-serif", fontSize: 12, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>
          {lang === "ar" ? "← رجوع للخدمات" : "← Back to Services"}
        </button>

        <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px", position: "relative", zIndex: 2 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${svc.color}22`, border: `1px solid ${svc.color}44`, borderRadius: 50, padding: "4px 14px", marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: svc.color, letterSpacing: 1 }}>{svc.abbr}</span>
              <span style={{ color: svc.color, fontWeight: 700, fontSize: 12 }}>{title}</span>
            </div>
            <h1 style={{ fontSize: "clamp(1.5rem,3.5vw,2.5rem)", fontWeight: 900, lineHeight: 1.25, marginBottom: 16 }}>{hero}</h1>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.9, marginBottom: 28, maxWidth: 520 }}>{sub}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href={`https://wa.me/${SITE.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                style={{ background: "#25d366", color: "#fff", padding: "11px 22px", borderRadius: 10, fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t("contactWA")}
              </a>
              <Btn children={lang === "ar" ? "استعرض كورساتنا" : "Explore Courses"} v="outline" onClick={() => navigate("/courses")} style={{ padding: "11px 22px" }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ flex: "0 1 360px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, position: "relative", zIndex: 2 }}>
            {svc.stats.map(([val, label]) => (
              <div key={label} style={{ background: "rgba(255,255,255,.06)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 900, color: svc.color }}>{val}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What We Offer */}
      <div style={{ background: "#2a1540", padding: "clamp(40px,7vw,64px) 5%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ color: svc.color, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
            {lang === "ar" ? "ما نقدمه" : "WHAT WE OFFER"}
          </div>
          <h2 style={{ fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 900 }}>
            {lang === "ar" ? `خدمات ${title}` : `${title} Services`}
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14, maxWidth: 900, margin: "0 auto" }}>
          {offers.map((offer, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${svc.color}22`, border: `1px solid ${svc.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, color: svc.color, fontWeight: 800 }}>✓</div>
              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>{offer}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Technologies */}
      <div style={{ padding: "clamp(40px,7vw,64px) 5%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
            {lang === "ar" ? "التقنيات المستخدمة" : "TECHNOLOGIES"}
          </div>
          <h2 style={{ fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 900 }}>
            {lang === "ar" ? "أدواتنا وتقنياتنا" : "Our Tools & Technologies"}
          </h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 750, margin: "0 auto" }}>
          {svc.tech.map(tech => (
            <span key={tech} style={{ background: `${svc.color}14`, border: `1px solid ${svc.color}33`, color: "#fff", borderRadius: 50, padding: "8px 18px", fontSize: 12, fontWeight: 700 }}>{tech}</span>
          ))}
        </div>
      </div>

      {/* Process */}
      <div style={{ background: "#2a1540", padding: "clamp(40px,7vw,64px) 5%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
            {lang === "ar" ? "طريقة عملنا" : "OUR PROCESS"}
          </div>
          <h2 style={{ fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 900 }}>
            {lang === "ar" ? "من الفكرة للتسليم" : "From Idea to Delivery"}
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, maxWidth: 900, margin: "0 auto" }}>
          {svc.process_ar.map(([stepNum, titleStep, desc], i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 18px", position: "relative" }}>
              <div style={{ position: "absolute", top: 16, right: 16, width: 24, height: 24, borderRadius: "50%", background: `${svc.color}22`, border: `1px solid ${svc.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: svc.color }}>{stepNum}</div>
              <div style={{ fontSize: 11, fontWeight: 900, color: svc.color, marginBottom: 8, letterSpacing: 1 }}>0{i + 1}</div>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{titleStep}</div>
              <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Us */}
      <div style={{ padding: "clamp(40px,7vw,64px) 5%" }}>
        <div style={{ display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
              {lang === "ar" ? "لماذا Eduzah؟" : "WHY EDUZAH?"}
            </div>
            <h2 style={{ fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 900, marginBottom: 20 }}>
              {lang === "ar" ? "نحن الخيار الأذكى" : "We're the Smart Choice"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {whyUs.map((point, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  <span style={{ color: C.success, fontSize: 14, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, lineHeight: 1.6 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>
          {/* CTA Card */}
          <div style={{ flex: "0 1 280px" }}>
            <div style={{ background: `linear-gradient(135deg,${svc.color}22,rgba(50,29,61,.9))`, border: `1px solid ${svc.color}44`, borderRadius: 20, padding: 28, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: `${svc.color}22`, border: `2px solid ${svc.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: svc.color, margin: "0 auto 12px", letterSpacing: 1 }}>{svc.abbr}</div>
              <h3 style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
                {lang === "ar" ? "ابدأ مشروعك اليوم" : "Start Your Project Today"}
              </h3>
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                {lang === "ar" ? "تواصل معنا الآن واحصل على استشارة مجانية" : "Contact us now for a free consultation"}
              </p>
              <a href={`https://wa.me/${SITE.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                style={{ background: "#25d366", color: "#fff", padding: "11px 22px", borderRadius: 10, fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "block", marginBottom: 10 }}>
                {lang === "ar" ? "تواصل عبر واتساب" : "Chat on WhatsApp"}
              </a>
              <div style={{ color: C.muted, fontSize: 11 }}>
                {lang === "ar" ? "استشارة مجانية · رد خلال 24 ساعة" : "Free consultation · Reply within 24h"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
