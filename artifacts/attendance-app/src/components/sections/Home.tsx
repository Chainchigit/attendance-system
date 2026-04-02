import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardCheck, Activity } from "lucide-react";
import { useGetUsers, useGetAttendance, getGetUsersQueryKey, getGetAttendanceQueryKey, useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Home() {
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsers({
    query: { queryKey: getGetUsersQueryKey() }
  });
  
  const { data: attendanceData, isLoading: isLoadingAttendance } = useGetAttendance({
    query: { queryKey: getGetAttendanceQueryKey() }
  });

  const { data: healthData } = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey() }
  });

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceData?.records?.filter(r => r.date === today) || [];

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground">Welcome to the Attendance Tracker. Here is your daily summary.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold">{usersData?.users?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Registered in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingAttendance ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold">{todayAttendance.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Records for {new Date().toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold capitalize">
               {healthData?.status === "ok" ? "Online" : "Checking"}
             </div>
             <p className="text-xs text-muted-foreground mt-1">API connection active</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
