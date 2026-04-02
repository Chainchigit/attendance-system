import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import {
  useGetUserDescriptors,
  getGetUserDescriptorsQueryKey,
  useMarkAttendance,
  getGetAttendanceQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  loadFaceApiModels,
  detectAllFacesWithDescriptors,
  drawDetectionOverlay,
  COOLDOWN_MS,
  type UserForMatching,
} from "@/lib/faceApi";

interface ScanResult {
  userName: string;
  type: "check_in" | "check_out";
  time: string;
  timestamp: number;
}

export function CheckIn() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recentResults, setRecentResults] = useState<ScanResult[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRunningRef = useRef(false);
  const cooldownMapRef = useRef<Record<number, number>>({});
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userDescriptorsRef = useRef<UserForMatching[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: descriptorsData } = useGetUserDescriptors({
    query: { queryKey: getGetUserDescriptorsQueryKey() },
  });

  const markAttendance = useMarkAttendance();

  useEffect(() => {
    if (descriptorsData?.users) {
      userDescriptorsRef.current = descriptorsData.users.map((u) => ({
        id: u.id,
        name: u.name,
        faceDescriptor: u.faceDescriptor ?? null,
      }));
    }
  }, [descriptorsData]);

  useEffect(() => {
    setModelsLoading(true);
    loadFaceApiModels()
      .then(() => setModelsReady(true))
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Model Load Error",
          description: "Failed to load face recognition models.",
        });
      })
      .finally(() => setModelsLoading(false));
  }, []);

  const handleMarkAttendance = useCallback(
    (userId: number, userName: string) => {
      markAttendance.mutate(
        { data: { name: userName } },
        {
          onSuccess: (record) => {
            const type = (record.type === "check_out" ? "check_out" : "check_in") as
              | "check_in"
              | "check_out";
            const timeStr = new Date(record.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            const message =
              type === "check_in"
                ? `Welcome ${userName}! Checked in at ${timeStr}`
                : `Goodbye ${userName}! Checked out at ${timeStr}`;

            toast({ title: message });

            setRecentResults((prev) =>
              [{ userName, type, time: timeStr, timestamp: Date.now() }, ...prev].slice(0, 5)
            );

            queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey() });
          },
          onError: (err) => {
            if (err.status === 409) {
              // Already completed check-in + check-out today — block for rest of day
              cooldownMapRef.current[userId] = Number.MAX_SAFE_INTEGER / 2;
              toast({
                title: `${userName} — already done for today`,
                description: err.data?.error ?? "Check-in and check-out already recorded.",
              });
            } else {
              toast({
                variant: "destructive",
                title: "Attendance Error",
                description: err.data?.error ?? err.message ?? "Could not mark attendance.",
              });
            }
          },
        }
      );
    },
    [markAttendance, queryClient, toast]
  );

  const runDetectionLoop = useCallback(async () => {
    if (!isRunningRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;

    if (video.readyState === 4 && video.videoWidth > 0 && modelsReady) {
      try {
        const detections = await detectAllFacesWithDescriptors(video);
        const matches = drawDetectionOverlay(
          canvasRef.current,
          video,
          detections,
          userDescriptorsRef.current
        );

        const now = Date.now();
        for (const match of matches) {
          const userId = match.user.id;
          const lastScan = cooldownMapRef.current[userId] || 0;
          if (now - lastScan > COOLDOWN_MS) {
            cooldownMapRef.current[userId] = now;
            handleMarkAttendance(userId, match.user.name);
          }
        }
      } catch {
        // silent detection errors
      }
    }

    if (isRunningRef.current) {
      loopTimerRef.current = setTimeout(runDetectionLoop, 300);
    }
  }, [modelsReady, handleMarkAttendance]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setStream(mediaStream);
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Allow access in your browser settings."
          : "Could not access the camera.";
      setCameraError(msg);
    }
  };

  useEffect(() => {
    if (stream && modelsReady) {
      isRunningRef.current = true;
      setIsScanning(true);
      loopTimerRef.current = setTimeout(runDetectionLoop, 800);
    }
    return () => {
      isRunningRef.current = false;
      setIsScanning(false);
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, [stream, modelsReady, runDetectionLoop]);

  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    setIsScanning(false);
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [stream]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const usersWithDescriptors = (descriptorsData?.users || []).filter((u) => u.faceDescriptor);

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Face Check-In</h2>
        <p className="text-muted-foreground">
          Real-time face recognition for automatic attendance marking.
        </p>
      </div>

      {modelsLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading face recognition models…
        </div>
      )}

      {usersWithDescriptors.length === 0 && !modelsLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">No face data registered</p>
            <p className="text-sm">
              Register members with face capture first before using face check-in.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live Camera</CardTitle>
              <CardDescription>
                Stand in front of the camera. Recognition is automatic.
              </CardDescription>
            </div>
            {isScanning && (
              <Badge variant="outline" className="gap-1.5 text-green-700 border-green-300">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Scanning
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cameraError && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">{cameraError}</p>
            </div>
          )}

          <div className="relative rounded-lg border bg-muted/50 overflow-hidden aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: stream ? "block" : "none" }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: "none", display: stream ? "block" : "none" }}
            />
            {!stream && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-14 w-14 opacity-30" />
                <p className="text-sm">Camera off</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!stream ? (
              <Button
                onClick={startCamera}
                disabled={!modelsReady}
                className="w-full sm:w-auto"
              >
                <Camera className="h-4 w-4 mr-2" />
                {modelsReady ? "Start Face Scan" : "Loading models…"}
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline" className="w-full sm:w-auto">
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Camera
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {usersWithDescriptors.length} face(s) enrolled — recognition is automatic
          </p>
        </CardContent>
      </Card>

      {recentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentResults.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={
                      r.type === "check_in"
                        ? "border-green-300 text-green-700"
                        : "border-blue-300 text-blue-700"
                    }
                  >
                    {r.type === "check_in" ? "Check In" : "Check Out"}
                  </Badge>
                  <span className="font-medium">{r.userName}</span>
                </div>
                <span className="text-muted-foreground">{r.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
