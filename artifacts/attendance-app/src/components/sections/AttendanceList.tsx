import { useGetAttendance, getGetAttendanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function AttendanceList() {
  const { data: attendanceData, isLoading } = useGetAttendance({
    query: { queryKey: getGetAttendanceQueryKey() }
  });

  // Group by date
  const groupedRecords = attendanceData?.records?.reduce((acc, record) => {
    const date = record.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {} as Record<string, typeof attendanceData.records>) || {};

  // Sort dates descending
  const sortedDates = Object.keys(groupedRecords).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Attendance Log</h2>
        <p className="text-muted-foreground">Historical records of all member check-ins.</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
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
          {sortedDates.map((date) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</CardTitle>
                <CardDescription>{groupedRecords[date].length} records</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member Name</TableHead>
                      <TableHead className="text-right">Time Recorded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRecords[date].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.userName}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {format(new Date(record.timestamp), 'h:mm a')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
