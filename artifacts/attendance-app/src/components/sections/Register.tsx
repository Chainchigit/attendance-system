import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, UserPlus, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRegisterUser, getGetUsersQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  loadFaceApiModels,
  detectAllFacesWithDescriptors,
  DETECTOR_OPTIONS,
  faceapi,
} from "@/lib/faceApi";

type FaceStatus = "idle" | "no_face" | "multi_face" | "ok";

export function Register() {
  const [name, setName] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [faceStatus, setFaceStatus] = useState<FaceStatus>("idle");
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectionLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const registerUser = useRegisterUser();

  useEffect(() => {
    setModelsLoading(true);
    loadFaceApiModels()
      .then(() => setModelsReady(true))
      .catch(() =>
        toast({
          variant: "destructive",
          title: "Model Load Error",
          description: "Failed to load face recognition models.",
        })
      )
      .finally(() => setModelsLoading(false));
  }, []);

  const runOverlayLoop = useCallback(async () => {
    if (!isRunningRef.current || !videoRef.current || !overlayCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;

    if (video.readyState === 4 && modelsReady) {
      try {
        const detections = await faceapi
          .detectAllFaces(video, DETECTOR_OPTIONS)
          .withFaceLandmarks();

        const ctx = canvas.getContext("2d");
        if (ctx && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (detections.length === 0) {
            setFaceStatus("no_face");
          } else if (detections.length > 1) {
            setFaceStatus("multi_face");
            for (const det of detections) {
              const { x, y, width, height } = det.detection.box;
              ctx.strokeStyle = "#f97316";
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, width, height);
            }
          } else {
            setFaceStatus("ok");
            const { x, y, width, height } = detections[0].detection.box;
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
          }
        }
      } catch {
        // silent
      }
    }

    if (isRunningRef.current) {
      detectionLoopRef.current = setTimeout(runOverlayLoop, 300);
    }
  }, [modelsReady]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setImagePreview(null);
      setCapturedDescriptor(null);
      setFaceStatus("idle");
    } catch {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access the camera. Please allow permissions.",
      });
    }
  };

  useEffect(() => {
    if (stream && modelsReady) {
      isRunningRef.current = true;
      detectionLoopRef.current = setTimeout(runOverlayLoop, 500);
    }
    return () => {
      isRunningRef.current = false;
      if (detectionLoopRef.current) clearTimeout(detectionLoopRef.current);
    };
  }, [stream, modelsReady, runOverlayLoop]);

  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    if (detectionLoopRef.current) clearTimeout(detectionLoopRef.current);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setFaceStatus("idle");
  }, [stream]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const captureAndRegister = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Enter a name first." });
      return;
    }
    if (!videoRef.current || !captureCanvasRef.current || !stream) {
      toast({ variant: "destructive", title: "Camera required", description: "Open the camera first." });
      return;
    }
    if (!modelsReady) {
      toast({ variant: "destructive", title: "Loading", description: "Face models are still loading." });
      return;
    }

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const detections = await detectAllFacesWithDescriptors(canvas);

    if (detections.length === 0) {
      toast({
        variant: "destructive",
        title: "No face detected",
        description: "Position your face clearly in front of the camera.",
      });
      return;
    }

    if (detections.length > 1) {
      toast({
        variant: "destructive",
        title: "Multiple faces detected",
        description: `Found ${detections.length} faces. Only one person should be in frame.`,
      });
      return;
    }

    const descriptor = Array.from(detections[0].descriptor);
    const base64Image = canvas.toDataURL("image/png");
    setCapturedDescriptor(descriptor);
    setImagePreview(base64Image);

    registerUser.mutate(
      { data: { name, image: base64Image, faceDescriptor: descriptor } },
      {
        onSuccess: (data) => {
          toast({
            title: "Registration successful",
            description: data.message || `${name} has been registered with face recognition.`,
            action: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          });
          setName("");
          stopCamera();
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: error.error || "An error occurred.",
          });
          setImagePreview(null);
          setCapturedDescriptor(null);
        },
      }
    );
  };

  const faceStatusMessage = {
    idle: null,
    no_face: { text: "No face detected — move closer", color: "text-orange-500", icon: AlertCircle },
    multi_face: { text: "Multiple faces — only one person in frame", color: "text-orange-500", icon: AlertCircle },
    ok: { text: "Face detected — ready to capture", color: "text-green-600", icon: CheckCircle2 },
  }[faceStatus];

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Register Member</h2>
        <p className="text-muted-foreground">Add a new person with face recognition.</p>
      </div>

      {modelsLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading face recognition models…
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
          <CardDescription>
            Enter the member's name and capture their face. Only one face per registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={registerUser.isPending}
            />
          </div>

          <div className="space-y-3">
            <Label>Face Capture</Label>

            <div className="relative rounded-lg border bg-muted/50 overflow-hidden aspect-video flex items-center justify-center">
              {stream ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: "none" }}
                  />
                </>
              ) : imagePreview ? (
                <img src={imagePreview} alt="Captured face" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Camera className="h-12 w-12 opacity-40" />
                  <p className="text-sm">Camera inactive</p>
                </div>
              )}
            </div>

            <canvas ref={captureCanvasRef} className="hidden" />

            {faceStatusMessage && (
              <div className={`flex items-center gap-2 text-sm ${faceStatusMessage.color}`}>
                <faceStatusMessage.icon className="h-4 w-4" />
                {faceStatusMessage.text}
              </div>
            )}

            {capturedDescriptor && !stream && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <CheckCircle2 className="h-4 w-4" />
                Face descriptor extracted (128 values)
              </div>
            )}

            {!stream ? (
              <Button onClick={startCamera} type="button" variant="outline" className="w-full sm:w-auto">
                <Camera className="w-4 h-4 mr-2" />
                Open Camera
              </Button>
            ) : (
              <Button onClick={stopCamera} type="button" variant="outline" className="w-full sm:w-auto">
                Cancel Camera
              </Button>
            )}
          </div>

          <Button
            className="w-full"
            onClick={captureAndRegister}
            disabled={!stream || !name.trim() || registerUser.isPending || !modelsReady || faceStatus !== "ok"}
          >
            {registerUser.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registering…</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-2" />Capture & Register</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
