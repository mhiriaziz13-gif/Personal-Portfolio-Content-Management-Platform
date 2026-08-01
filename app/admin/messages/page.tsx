import { AdminDashboard } from "@/components/admin/admin-dashboard"; import { getAdminContentSnapshot } from "@/lib/cms";
export const dynamic="force-dynamic"; export default async function MessagesPage(){return <AdminDashboard content={await getAdminContentSnapshot()} initialView="contact_messages" embedded/>;}
