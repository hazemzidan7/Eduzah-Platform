import { AccountingProvider, useAccounting } from "../../context/AccountingContext";
import AccountingLogin from "./AccountingLogin";
import AccountingDashboard from "./AccountingDashboard";
import { C, font } from "../../theme";

function Gate() {
  const { accountingUser, sessionLoading } = useAccounting();

  if (sessionLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg,#1a0a2e,#321d3d)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: `3px solid rgba(255,92,122,.3)`,
            borderTopColor: C.red,
            borderRadius: "50%",
            animation: "spin .7s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return accountingUser ? <AccountingDashboard /> : <AccountingLogin />;
}

export default function AccountingGate() {
  return (
    <AccountingProvider>
      <Gate />
    </AccountingProvider>
  );
}

