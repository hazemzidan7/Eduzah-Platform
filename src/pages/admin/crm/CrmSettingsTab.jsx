import CatalogManager from "./catalog/CatalogManager";

/**
 * Home for every CRM configuration screen: Catalog first, then (in later
 * milestones) Lead Statuses, Tags, Dictionaries, and Import Profiles all
 * live here too rather than each getting its own ad-hoc top-level tab.
 */
export default function CrmSettingsTab() {
  return (
    <div>
      <CatalogManager />
    </div>
  );
}
