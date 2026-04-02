import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, UserPlus, Image as ImageIcon } from "lucide-react";
import { useRegisterUser, getGetUsersQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function Register() {
  const [name, setName] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const registerUser = useRegisterUser();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setImagePreview(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access the camera. Please allow permissions.",
      });
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const captureAndRegister = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter a name before registering.",
      });
      return;
    }

    if (!videoRef.current || !canvasRef.current || !stream) {
      toast({
        variant: "destructive",
        title: "Camera required",
        description: "Please open the camera to capture a photo.",
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL("image/png");
      setImagePreview(base64Image);

      registerUser.mutate(
        { data: { name, image: base64Image } },
        {
          onSuccess: () => {
            toast({
              title: "Registration successful",
              description: `${name} has been registered.`,
            });
            setName("");
            stopCamera();
            queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          },
          onError: (error) => {
            toast({
              variant: "destructive",
              title: "Registration failed",
              description: error.error || "An error occurred during registration.",
            });
            setImagePreview(null);
          },
        }
      );
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Register Member</h2>
        <p className="text-muted-foreground">Add a new person to the attendance system.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
          <CardDescription>Enter the member's full name and capture their photo.</CardDescription>
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
            <Label>Photo Capture</Label>
            
            <div className="relative rounded-lg border bg-muted/50 overflow-hidden aspect-video flex items-center justify-center">
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                  <p>Camera inactive</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-between items-center">
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
          </div>

          <Button 
            className="w-full" 
            onClick={captureAndRegister} 
            disabled={!stream || !name.trim() || registerUser.isPending}
          >
            {registerUser.isPending ? (
              <span>Registering...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Capture & Register
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
