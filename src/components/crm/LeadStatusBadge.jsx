import { Badge } from "../UI";
import { leadStatusColor, leadStatusLabel } from "../../constants/leadStatus";
import { useLang } from "../../context/LangContext";

export default function LeadStatusBadge({ status }) {
  const { lang } = useLang();
  return <Badge color={leadStatusColor(status)}>{leadStatusLabel(status, lang)}</Badge>;
}
