import { AdminDashboard } from "@/components/admin/admin-dashboard"; import { getAdminContentSnapshot } from "@/lib/cms";
export const dynamic="force-dynamic"; export default async function SettingsPage(){return <AdminDashboard content={await getAdminContentSnapshot()} initialView="settings"/>;}
