import { useState } from "react";
import { Modal, Input, Btn, Select } from "./UI";
import { C } from "../theme";

const readAsDataURL = (file, cb) => {
  const r = new FileReader();
  r.onloadend = () => cb(r.result);
  r.readAsDataURL(file);
};

/**
 * Admin & Instructor: add one lesson + video entry (URL or uploaded file), optional thumbnail,
 * session materials (lines: "title|url" or URL only), optional exam tied to this lesson index.
 */
export default function AddSessionModal({ course, onClose, ar, updateCourse, addExam, showToast }) {
  const tx = (a, e) => (ar ? a : e);
  const [f, setF] = useState({
    title: "",
    url: "",
    desc: "",
    materialsText: "",
    addExam: false,
    examTitle: "",
    examType: "mcq",
    examDue: "",
    examDuration: "45",
    examDesc: "",
  });
  const [videoData, setVideoData] = useState(null);
  const [thumbData, setThumbData] = useState(null);

  const finalUrl = (videoData || f.url).trim();

  const submit = () => {
    if (!f.title.trim()) {
      showToast(tx("أدخل عنوان الدرس", "Enter lesson title"), "error");
      return;
    }
    if (!finalUrl) {
      showToast(tx("أدخل رابط الفيديو أو ارفع ملف فيديو", "Enter a video URL or upload a video file"), "error");
      return;
    }
    const isUploaded = finalUrl.startsWith("data:video/");
    if (isUploaded && !thumbData) {
      showToast(tx("أضف صورة مصغّرة للفيديو المرفوع", "Add a thumbnail image for uploaded video"), "error");
      return;
    }
    if (f.addExam && (!f.examTitle.trim() || !f.examDue)) {
      showToast(tx("أكمل عنوان وتاريخ امتحان الجلسة", "Complete session exam title and due date"), "error");
      return;
    }

    const materials = f.materialsText
      .split("\n")
      .map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        const pipe = t.indexOf("|");
        if (pipe > 0) {
          const title = t.slice(0, pipe).trim();
          const url = t.slice(pipe + 1).trim();
          if (!url) return null;
          return { title: title || `${tx("مادة", "Material")} ${i + 1}`, url };
        }
        return { title: `${tx("مادة", "Material")} ${i + 1}`, url: t };
      })
      .filter(Boolean);

    const globalLessonIndex = (course.curriculum || []).flatMap((ch) => ch.lessons || []).length;

    const videoEntry = {
      title: f.title.trim(),
      url: finalUrl,
      desc: f.desc.trim(),
      thumbnail: thumbData || null,
      ...(materials.length ? { materials } : {}),
    };

    const existing = course.curriculum || [];
    let updated;
    const newLesson = f.title.trim();
    if (existing.length === 0) {
      updated = [
        {
          title: ar ? "جلسات" : "Sessions",
          lessons: [newLesson],
          videoUrls: [videoEntry],
        },
      ];
    } else {
      const chapters = [...existing];
      const last = { ...chapters[chapters.length - 1] };
      last.lessons = [...(last.lessons || []), newLesson];
      last.videoUrls = [...(last.videoUrls || []), videoEntry];
      chapters[chapters.length - 1] = last;
      updated = chapters;
    }

    updateCourse(course.id, { curriculum: updated });

    if (f.addExam) {
      addExam({
        title: f.examTitle.trim(),
        courseId: course.id,
        type: f.examType,
        dueDate: f.examDue,
        duration: f.examDuration,
        description: f.examDesc,
        questions: [],
        lessonIndex: globalLessonIndex,
      });
    }

    showToast(tx("تم إضافة الفيديو", "Video added"));
    onClose();
  };

  return (
    <Modal title={tx(`إضافة فيديو – ${course.title}`, `Add video – ${course.title}`)} onClose={onClose}>
      <Input
        label={tx("عنوان الدرس *", "Lesson title *")}
        value={f.title}
        onChange={(v) => setF((p) => ({ ...p, title: v }))}
        placeholder={tx("مثال: درس 1 – HTML Basics", "e.g. Lesson 1 – HTML Basics")}
      />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 6 }}>
          {tx("رفع ملف فيديو (اختياري إذا وضعت رابطاً)", "Upload video file (optional if you use a URL)")}
        </div>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readAsDataURL(file, setVideoData);
          }}
          style={{ color: C.muted, fontSize: 12 }}
        />
        {videoData && (
          <div style={{ fontSize: 11, color: C.success, marginTop: 6 }}>{tx("تم اختيار ملف فيديو", "Video file selected")}</div>
        )}
      </div>
      <Input
        label={tx("رابط الفيديو (YouTube / Vimeo / رابط مباشر)", "Video URL (YouTube / Vimeo / direct)")}
        value={f.url}
        onChange={(v) => setF((p) => ({ ...p, url: v }))}
        placeholder="https://youtu.be/..."
      />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 6 }}>
          {tx("صورة مصغّرة للفيديو * للملف المرفوع", "Thumbnail image * required for uploaded file")}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readAsDataURL(file, setThumbData);
          }}
          style={{ color: C.muted, fontSize: 12 }}
        />
        {thumbData && <img src={thumbData} alt="" style={{ marginTop: 8, width: 120, height: 68, objectFit: "cover", borderRadius: 8 }} />}
      </div>
      <Input
        label={tx("وصف الدرس", "Lesson description")}
        value={f.desc}
        onChange={(v) => setF((p) => ({ ...p, desc: v }))}
        placeholder={tx("ما الذي ستتعلمه في هذه الجلسة...", "What you will learn in this session...")}
        rows={2}
      />
      <Input
        label={tx("مواد الجلسة (سطر لكل رابط، أو عنوان|رابط)", "Session materials (one per line, or title|url)")}
        value={f.materialsText}
        onChange={(v) => setF((p) => ({ ...p, materialsText: v }))}
        placeholder={"https://…\n" + tx("ملخص PDF|https://…", "Slides|https://…")}
        rows={3}
      />

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer", fontSize: 13 }}>
        <input type="checkbox" checked={f.addExam} onChange={(e) => setF((p) => ({ ...p, addExam: e.target.checked }))} />
        {tx("إنشاء امتحان مرتبط بهذه الجلسة", "Create an exam for this session")}
      </label>

      {f.addExam && (
        <>
          <Input
            label={tx("عنوان الامتحان *", "Exam title *")}
            value={f.examTitle}
            onChange={(v) => setF((p) => ({ ...p, examTitle: v }))}
            placeholder={tx("امتحان الجلسة", "Session exam")}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Select
              label={tx("نوع الامتحان", "Exam type")}
              value={f.examType}
              onChange={(v) => setF((p) => ({ ...p, examType: v }))}
              options={[
                { v: "mcq", l: "MCQ" },
                { v: "task", l: tx("مهمة", "Task") },
                { v: "essay", l: tx("مقالي", "Essay") },
                { v: "truefalse", l: tx("صح / خطأ", "True / False") },
              ]}
            />
            <Input label={tx("الموعد النهائي *", "Due date *")} value={f.examDue} onChange={(v) => setF((p) => ({ ...p, examDue: v }))} type="date" />
          </div>
          <Input label={tx("المدة (دقيقة)", "Duration (min)")} value={f.examDuration} onChange={(v) => setF((p) => ({ ...p, examDuration: v }))} />
          <Input
            label={tx("تعليمات / وصف", "Instructions / description")}
            value={f.examDesc}
            onChange={(v) => setF((p) => ({ ...p, examDesc: v }))}
            rows={2}
          />
        </>
      )}

      <Btn children={tx("إضافة الفيديو", "Add video")} full onClick={submit} style={{ marginTop: 8 }} />
    </Modal>
  );
}
