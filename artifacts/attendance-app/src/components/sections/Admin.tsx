import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, Users } from "lucide-react";
import { useGetUsers, getGetUsersQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";

export function Admin() {
  const { data: usersData, isLoading } = useGetUsers({
    query: { queryKey: getGetUsersQueryKey() },
  });

  const users = usersData?.users || [];
  const withFace = users.filter((u) => u.hasFaceDescriptor);
  const withoutFace = users.filter((u) => !u.hasFaceDescriptor);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admin — Member Registry</h2>
        <p className="text-muted-foreground">
          View all registered members and their face recognition status.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "—" : users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Face Enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{isLoading ? "—" : withFace.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">No Face Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{isLoading ? "—" : withoutFace.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Members</CardTitle>
          </div>
          <CardDescription>
            Members without face data cannot be recognized by the camera. Re-register them on the Register tab using the same name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No members registered yet.
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.imagePath}
                      alt={user.name}
                      className="h-9 w-9 rounded-full object-cover border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Registered {format(new Date(user.registeredAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      user.hasFaceDescriptor
                        ? "border-green-300 text-green-700 gap-1.5"
                        : "border-orange-300 text-orange-600 gap-1.5"
                    }
                  >
                    {user.hasFaceDescriptor ? (
                      <><ShieldCheck className="h-3 w-3" />Face Enrolled</>
                    ) : (
                      <><ShieldAlert className="h-3 w-3" />No Face Data</>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
