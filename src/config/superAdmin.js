/** Super Admin — full platform access including creating other Admin accounts (via Cloud Function). */
export const SUPER_ADMIN_EMAIL = "hazemzidan833@gmail.com";

export function isSuperAdminEmail(email) {
  return (email || "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
