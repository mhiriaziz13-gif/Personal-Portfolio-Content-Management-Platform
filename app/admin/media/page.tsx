import { AdminDashboard } from "@/components/admin/admin-dashboard"; import { getAdminContentSnapshot } from "@/lib/cms";
export const dynamic="force-dynamic"; export default async function MediaPage(){return <AdminDashboard content={await getAdminContentSnapshot()} initialView="uploads" embedded/>;}
