import { createContext, useContext, useState, useEffect } from "react";

const LangCtx = createContext(null);

export const TRANS = {
  ar: {
    // Navbar
    home:"الرئيسية", courses:"الكورسات", news:"الأخبار", services:"الخدمات",
    login:"دخول", register:"سجّل", logout:"خروج", dashboard:"داشبورد",
    myCourses:"كورساتي", myExams:"امتحاناتي", myStudents:"الطلاب",
    adminLabel:"Admin", instructorLabel:"Instructor", studentLabel:"طالب",
    // Landing
    hero_badge:"🏆 أكبر أكاديمية تدريب مهني في مصر",
    hero_h1:"حوّل مسيرتك المهنية", hero_h1b:"بالتدريب الاحترافي",
    hero_sub:"مدربون متخصصون يقدمون تدريباً عملياً في التكنولوجيا والأعمال والقيادة. اكتسب مهارات حقيقية واحصل على شهادات معتمدة.",
    explore:"استعرض الكورسات 🚀", joinFree:"انضم مجاناً",
    featuredSec:"كورسات مميزة", topPrograms:"أفضل برامجنا",
    handpicked:"كورسات مختارة بعناية من فريقنا",
    viewAll:"عرض الكل ←", latestNewsSec:"آخر الأخبار", allNews:"كل الأخبار ←",
    studentStories:"قصص الطلاب", whatTheySay:"ماذا قالوا؟",
    readyCTA:"مستعد لتحويل مسيرتك؟ 🚀", join5000:"انضم لـ 5,000+ محترف اختاروا Eduzah",
    getStarted:"ابدأ مجاناً", browseCourses:"استعرض الكورسات",
    quickLinks:"روابط سريعة", contactLabel:"التواصل",
    // Services
    servicesHero:"حلول البرمجيات والخدمات",
    servicesSub:"مواقع وتطبيقات وحلول ذكاء اصطناعي مخصصة لعملك",
    learnMore:"اعرف أكثر ←", needProject:"محتاج مشروع مخصص؟ 🚀",
    contactWA:"تواصل عبر واتساب", backToServices:"← رجوع للخدمات",
    techUsed:"التقنيات المستخدمة", whatWeOffer:"ما نقدمه",
    ourProcess:"طريقة عملنا", whyUs:"لماذا Eduzah؟",
    // Courses
    allPrograms:"كل البرامج", trainingCourses:"الكورسات التدريبية",
    enrollNow:"سجّل الآن", continueLearning:"متابعة ▶",
    // Auth
    welcomeBack:"مرحباً بعودتك 👋", emailLabel:"البريد الإلكتروني",
    passwordLabel:"كلمة المرور", loginBtn:"دخول 🚀",
    noAccount:"مش عندك حساب؟", registerNowLink:"سجّل دلوقتي",
    joinEduzah:"انضم لـ Eduzah 🚀", nameLabel:"الاسم الكامل",
    phoneLabel:"الهاتف", accountType:"نوع الحساب",
    createAccBtn:"إنشاء الحساب ✨", haveAccount:"عندك حساب؟", loginLink:"سجّل دخولك",
    pendingNote:"⚠️ حسابك هيتراجع من Admin خلال 24 ساعة",
    accountCreated:"تم إنشاء حسابك!", waitAdmin:"في انتظار موافقة الـ Admin.",
    fillAll:"كمّل البيانات كلها",
  },
  en: {
    // Navbar
    home:"Home", courses:"Courses", news:"News", services:"Services",
    login:"Login", register:"Register", logout:"Logout", dashboard:"Dashboard",
    myCourses:"My Courses", myExams:"My Exams", myStudents:"Students",
    adminLabel:"Admin", instructorLabel:"Instructor", studentLabel:"Student",
    // Landing
    hero_badge:"🏆 Egypt's Premier Professional Training Academy",
    hero_h1:"Transform Your Career", hero_h1b:"with Professional Training",
    hero_sub:"Industry expert instructors deliver practical training in Technology, Business, and Leadership. Build real skills, earn recognized certifications.",
    explore:"Explore Courses 🚀", joinFree:"Join Free",
    featuredSec:"FEATURED COURSES", topPrograms:"Our Top Programs",
    handpicked:"Handpicked courses by our team",
    viewAll:"View All →", latestNewsSec:"LATEST NEWS", allNews:"All News →",
    studentStories:"STUDENT STORIES", whatTheySay:"What They Say",
    readyCTA:"Ready to Transform Your Career? 🚀", join5000:"Join 5,000+ professionals who chose Eduzah",
    getStarted:"Get Started Free", browseCourses:"Browse Courses",
    quickLinks:"Quick Links", contactLabel:"Contact",
    // Services
    servicesHero:"Software Solutions & Services",
    servicesSub:"Custom software, web apps, and AI solutions for your business",
    learnMore:"Learn More →", needProject:"Need a Custom Project? 🚀",
    contactWA:"Contact on WhatsApp", backToServices:"← Back to Services",
    techUsed:"Technologies Used", whatWeOffer:"What We Offer",
    ourProcess:"Our Process", whyUs:"Why Eduzah?",
    // Courses
    allPrograms:"ALL PROGRAMS", trainingCourses:"Training Courses",
    enrollNow:"Enroll Now", continueLearning:"Continue ▶",
    // Auth
    welcomeBack:"Welcome Back 👋", emailLabel:"Email Address",
    passwordLabel:"Password", loginBtn:"Login 🚀",
    noAccount:"Don't have an account?", registerNowLink:"Register Now",
    joinEduzah:"Join Eduzah 🚀", nameLabel:"Full Name",
    phoneLabel:"Phone Number", accountType:"Account Type",
    createAccBtn:"Create Account ✨", haveAccount:"Already have an account?", loginLink:"Login",
    pendingNote:"⚠️ Your account will be reviewed by Admin within 24 hours",
    accountCreated:"Account Created!", waitAdmin:"Waiting for Admin approval.",
    fillAll:"Please fill all required fields",
  }
};

export function LangProvider({ children }) {
  const [lang, setLang] = useState("ar");

  useEffect(() => {
    document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = () => setLang(l => l === "ar" ? "en" : "ar");
  const t = (key) => TRANS[lang][key] ?? key;

  return (
    <LangCtx.Provider value={{ lang, toggle, t }}>
      {children}
    </LangCtx.Provider>
  );
}
export const useLang = () => useContext(LangCtx);
