
/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import FatoreComponent from "@/components/Fatore";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Fatore() {
  useAuth({ redirectOnUnauthenticated: true });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FatoreComponent />
      </div>
    </DashboardLayout>
  );
}
