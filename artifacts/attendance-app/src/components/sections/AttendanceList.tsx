import { useGetAttendance, getGetAttendanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function AttendanceList() {
  const { data: attendanceData, isLoading } = useGetAttendance({
    query: { queryKey: getGetAttendanceQueryKey() },
  });

  const groupedRecords = attendanceData?.records?.reduce(
    (acc, record) => {
      if (!acc[record.date]) acc[record.date] = [];
      acc[record.date].push(record);
      return acc;
    },
    {} as Record<string, NonNullable<typeof attendanceData>["records"]>
  ) || {};

  const sortedDates = Object.keys(groupedRecords).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Attendance Log</h2>
        <p className="text-muted-foreground">Historical records of all check-ins and check-outs.</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </CardContent>
        </Card>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No attendance records found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => {
            const records = [...groupedRecords[date]].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            const checkIns = records.filter((r) => r.type === "check_in").length;
            const checkOuts = records.filter((r) => r.type === "check_out").length;

            return (
              <Card key={date}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {format(new Date(date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
                  </CardTitle>
                  <CardDescription>
                    {records.length} records — {checkIns} check-in{checkIns !== 1 ? "s" : ""},{" "}
                    {checkOuts} check-out{checkOuts !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.userName}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                record.type === "check_in"
                                  ? "border-green-300 text-green-700"
                                  : "border-blue-300 text-blue-700"
                              }
                            >
                              {record.type === "check_in" ? "Check In" : "Check Out"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {format(new Date(record.timestamp), "h:mm a")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
