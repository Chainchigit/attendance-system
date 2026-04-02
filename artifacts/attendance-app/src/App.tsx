import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, UserPlus, UserCheck, Home as HomeIcon } from "lucide-react";

import { Home } from "./components/sections/Home";
import { Register } from "./components/sections/Register";
import { MarkAttendance } from "./components/sections/MarkAttendance";
import { AttendanceList } from "./components/sections/AttendanceList";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col">
          <header className="border-b bg-card sticky top-0 z-10">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <ClipboardList className="h-6 w-6" />
                <span className="font-bold text-lg tracking-tight text-foreground">AttendanceSystem</span>
              </div>
            </div>
          </header>

          <main className="flex-1 container mx-auto px-4 py-8">
            <Tabs defaultValue="home" className="w-full">
              <div className="flex justify-center mb-8 overflow-x-auto">
                <TabsList className="grid w-full max-w-2xl grid-cols-4 h-auto p-1">
                  <TabsTrigger value="home" className="py-2.5">
                    <HomeIcon className="h-4 w-4 mr-2 hidden sm:inline" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="register" className="py-2.5">
                    <UserPlus className="h-4 w-4 mr-2 hidden sm:inline" />
                    Register
                  </TabsTrigger>
                  <TabsTrigger value="mark" className="py-2.5">
                    <UserCheck className="h-4 w-4 mr-2 hidden sm:inline" />
                    Check In
                  </TabsTrigger>
                  <TabsTrigger value="list" className="py-2.5">
                    <ClipboardList className="h-4 w-4 mr-2 hidden sm:inline" />
                    Records
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="home" className="mt-0">
                <Home />
              </TabsContent>
              <TabsContent value="register" className="mt-0">
                <Register />
              </TabsContent>
              <TabsContent value="mark" className="mt-0">
                <MarkAttendance />
              </TabsContent>
              <TabsContent value="list" className="mt-0">
                <AttendanceList />
              </TabsContent>
            </Tabs>
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
