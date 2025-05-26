import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PhoneOff } from "lucide-react";
import { motion } from "framer-motion";

export function InCall({ peer, socket }) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<Record<string, RTCPeerConnection> | null>({});

  const handleEndCall = () => {
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
    }
    if (remoteVideoRef.current?.srcObject) {
      (remoteVideoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
    }
  };

  const createPeerConnection = (to: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });
    peerRef.current![to] = pc;
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = event.streams[0];
    };

    localStreamRef.current
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStreamRef.current!));

    return pc;
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("Error accessing media devices:", err));

    socket.on(
      "incoming-call",
      async ({ from, to }: { from: string; to: string }) => {
        if (from === socket.id) {
          const pc = createPeerConnection(from);
          pc.createOffer().then((offer) => {
            pc.setLocalDescription(offer);
            socket.emit("call-request", {
              from,
              to,
              offer,
            });
          });
        }
      }
    );
    socket.on(
      "call-accepted",
      async ({ from, to, offer }: { from: string; to: string }) => {
        if (to === socket.id) {
          console.log(offer);
          const pc = createPeerConnection(to);
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("incoming-answer", { to: from, from: to, answer });
        }
      }
    );

    socket.on("incoming-answer", async ({ from, to, answer }) => {
      if (from === socket.id) {
        console.log(peerRef.current);
        console.log({ from, answer });
        if (peerRef.current![from].signalingState === "have-local-offer") {
          await peerRef.current![from].setRemoteDescription(answer);
        }
      }
    });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 w-full max-w-6xl"
      >
        <Card className="rounded-2xl overflow-hidden shadow-xl bg-gray-900">
          <CardContent className="relative aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              controls
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
              You
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl overflow-hidden shadow-xl bg-gray-900">
          <CardContent className="relative aspect-video">
            <video
              ref={remoteVideoRef}
              autoPlay
              controls
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
              Remote
            </div>
          </CardContent>
        </Card>

        <div className="col-span-1 md:col-span-2 flex justify-center gap-4 mt-4">
          <Button
            onClick={handleEndCall}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-lg shadow-lg"
          >
            <PhoneOff className="mr-2" /> End Call
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
