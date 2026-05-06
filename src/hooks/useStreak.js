import { useEffect, useRef } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

/**
 * On mount, checks whether the signed-in user was active today.
 * If not, bumps their streak (or resets to 1 if they missed a day).
 * Updates: lastActiveDate, streak, longestStreak in Firestore + local state.
 */
export function useStreak() {
  const { currentUser } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!currentUser?.id || ran.current) return;
    ran.current = true;

    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    const run = async () => {
      const ref = doc(db, "users", currentUser.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      const last = data.lastActiveDate || null;
      const streak = data.streak || 0;
      const longest = data.longestStreak || 0;

      if (last === today) return; // already recorded today

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);

      const newStreak = last === yStr ? streak + 1 : 1;
      const newLongest = Math.max(longest, newStreak);

      await updateDoc(ref, {
        lastActiveDate: today,
        streak: newStreak,
        longestStreak: newLongest,
      });
    };

    run().catch(() => {});
  }, [currentUser?.id]);
}
