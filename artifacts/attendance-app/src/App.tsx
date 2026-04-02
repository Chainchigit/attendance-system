import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, UserPlus, ScanFace, Home as HomeIcon, ShieldCheck } from "lucide-react";

import { Home } from "./components/sections/Home";
import { Register } from "./components/sections/Register";
import { CheckIn } from "./components/sections/CheckIn";
import { AttendanceList } from "./components/sections/AttendanceList";
import { Admin } from "./components/sections/Admin";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col">
          <header className="border-b bg-card sticky top-0 z-10">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <ScanFace className="h-6 w-6" />
                <span className="font-bold text-lg tracking-tight text-foreground">
                  AttendanceSystem
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 container mx-auto px-4 py-8">
            <Tabs defaultValue="home" className="w-full">
              <div className="flex justify-center mb-8 overflow-x-auto">
                <TabsList className="grid w-full max-w-3xl grid-cols-5 h-auto p-1">
                  <TabsTrigger value="home" className="py-2.5 text-xs sm:text-sm">
                    <HomeIcon className="h-4 w-4 mr-1.5 hidden sm:inline" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="register" className="py-2.5 text-xs sm:text-sm">
                    <UserPlus className="h-4 w-4 mr-1.5 hidden sm:inline" />
                    Register
                  </TabsTrigger>
                  <TabsTrigger value="checkin" className="py-2.5 text-xs sm:text-sm">
                    <ScanFace className="h-4 w-4 mr-1.5 hidden sm:inline" />
                    Face Check-In
                  </TabsTrigger>
                  <TabsTrigger value="list" className="py-2.5 text-xs sm:text-sm">
                    <ClipboardList className="h-4 w-4 mr-1.5 hidden sm:inline" />
                    Records
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="py-2.5 text-xs sm:text-sm">
                    <ShieldCheck className="h-4 w-4 mr-1.5 hidden sm:inline" />
                    Admin
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="home" className="mt-0">
                <Home />
              </TabsContent>
              <TabsContent value="register" className="mt-0">
                <Register />
              </TabsContent>
              <TabsContent value="checkin" className="mt-0">
                <CheckIn />
              </TabsContent>
              <TabsContent value="list" className="mt-0">
                <AttendanceList />
              </TabsContent>
              <TabsContent value="admin" className="mt-0">
                <Admin />
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
