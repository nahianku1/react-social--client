/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { isAuthenticated } from "@/utils/isAuthenticated";
import { io, Socket } from "socket.io-client";
import {
  Bell,
  CameraIcon,
  CameraOffIcon,
  FileArchive,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  RefreshCcw,
  VideoIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getCallTimeDiffs } from "@/utils/getCallTimeDiffs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

type message = {
  id: string;
  email: string;
  name: string;
  content?: string;
  isFile?: boolean;
  fileName?: string;
  meta?: metadata;
};

type user = {
  name: string;
  email: string;
  mobile: string;
  password: string;
};

type metadata = {
  size: number;
  type: string;
};

type onlineuser = {
  id: string;
  name: string;
  email: string;
};

const iceServers = [
  {
    urls: "turn:relay1.expressturn.com:3480?transport=tcp",
    username: "000000002063985225",
    credential: "YTvc7Yg5aImQ3jEX2SOhD/zidEM=",
  },
];

function RouteComponent() {
  const [messages, setMessages] = useState<message[] | []>([]);
  const [inVideoCall, setInVideoCall] = useState<boolean>(false);
  const [accepted, setAccepted] = useState<boolean>(false);
  const [inAudioCall, setInAudioCall] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [id, setId] = useState<string>("");
  const [callerId, setCallerId] = useState<string>("");
  const [calleeId, setCalleeId] = useState<string>("");
  const [callType, setCallType] = useState<string>("");
  const [callerName, setCallerName] = useState<string>("");
  const [iceCandidates, setIceCandidates] = useState<RTCIceCandidate[]>([]);
  const [callTime, setCallTime] = useState<Date | string | null>(null);
  const [notification, setNotification] = useState<
    {
      caller: string;
      time: Date;
    }[]
  >([]);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [offer, setOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [isReceivingVideoCall, setIsReceivingVideoCall] = useState(false);
  const [isReceivingAudioCall, setIsReceivingAudioCall] = useState(false);
  const [onlineusers, setOnelineUsers] = useState<onlineuser[] | []>([]);
  const [user, setUser] = useState<user | null>(
    JSON.parse(localStorage.getItem("token") || "{}")
  );
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const peerRef = useRef<Record<string, RTCPeerConnection | null>>({});
  const callPeerRef = useRef<RTCPeerConnection | null>(null);
  const datachannelRef = useRef<Record<string, RTCDataChannel | null>>({});
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const createMessage = useMutation(api.message.insertMessage);

  const handleLogout = () => {
    localStorage.setItem("authenticated", "false");
    navigate({ to: "/signin" });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements[0] as HTMLInputElement;
    const newMessage: message = {
      id: id,
      email: user?.email!,
      name: user?.name!,
      content: input?.value!,
    };
    setMessages((prev) => (prev ? [...prev, newMessage] : [newMessage]));
    void createMessage({ from: id, to: socketRef.current!.id!, text: input.value! });
    Object.values(datachannelRef.current).forEach((dataChannel) => {
      if (dataChannel!.readyState === "open") { // Check if the data channel is open before sending
        dataChannel!.send(JSON.stringify(newMessage));
      }
    });
    input.value = "";
  };

  const createPeerConnection = (peerId: string, createDataChannel: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: "relay",
    });

    peerRef.current![peerId] = pc;

    if (createDataChannel) {
      const dataChannel = pc.createDataChannel("chat");
      datachannelRef.current![peerId] = dataChannel;
      setupDataChannel(peerId, dataChannel);
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socketRef.current?.emit("offer", { targetPeerId: peerId, offer });
      });
    }

    pc.ondatachannel = (event) => {
      const dataChannel = event.channel;
      datachannelRef.current![peerId] = dataChannel;
      setupDataChannel(peerId, dataChannel);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice-candidate", {
          targetPeerId: peerId,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  const createCallPeerConnection = (to: string) => {
    const pc = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: "relay",
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log({ candidate: event.candidate });
        iceCandidates.push(event.candidate);
      }
    };

    if (callType === "audio") {
      pc.ontrack = (event) => {
        console.log("Remote Audio");
        console.log(event.streams[0]);

        if (remoteAudioRef.current)
          remoteAudioRef.current.srcObject = event.streams[0];
      };

      localAudioStreamRef.current
        ?.getTracks()
        .forEach((track) => pc.addTrack(track, localAudioStreamRef.current!));
    } else {
      pc.ontrack = (event) => {
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = event.streams[0];
      };

      localVideoStreamRef.current
        ?.getTracks()
        .forEach((track) => pc.addTrack(track, localVideoStreamRef.current!));
    }

    return pc;
  };

  const setupDataChannel = (peerId: string, dataChannel: RTCDataChannel) => {
    dataChannel.onopen = () =>
      console.log(`Data channel with ${peerId} is open`);
    dataChannel.onclose = () =>
      console.log(`Data channel with ${peerId} is closed`);
    dataChannel.onmessage = (e) => handleMessage(e.data);
  };

  const handleMessage = (data: string | ArrayBuffer) => {
    const parsed = JSON.parse(data);
    if (!parsed?.isFile) {
      console.log("Received string data:", parsed);
      try {
        setMessages((prev) => [...prev, parsed]);
      } catch {
        console.error("Failed to parse message data:", data);
      }
    } else if (parsed?.isFile) {
      console.log("Received ArrayBuffer data:", data);

      const blobParts: ArrayBuffer[] = [];
      const fileSize = parsed?.meta?.size;
      let receivedBytes = 0;

      Object.values(datachannelRef.current).forEach((dataChannel) => {
        if (dataChannel!.readyState === "open") {
          dataChannel!.onmessage = (chunkEvent) => {
            blobParts.push(chunkEvent.data);
            receivedBytes += chunkEvent.data.byteLength;

            // File transfer completed
            if (receivedBytes >= fileSize!) {
              const blob = new Blob(blobParts);
              const url = URL.createObjectURL(blob);
              console.log("File URL:", url);

              setMessages((prev) => [...prev, { ...parsed, content: url }]);
              dataChannel!.onmessage = (e) => handleMessage(e.data);
            }
          };
        }
      });
    }
  };

  const sendFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Send file metadata
    const newMessage: message = {
      id: id,
      email: user?.email!,
      name: user?.name!,
      isFile: true,
      fileName: file.name,
      meta: { size: file.size, type: file.type },
    };

    Object.values(datachannelRef.current).forEach((dataChannel) => {
      if (dataChannel!.readyState === "open") {
        dataChannel!.send(JSON.stringify(newMessage));
      }
    });

    // Read and send file in chunks
    const reader = new FileReader();

    reader.onload = () => {
      const newMessage: message = {
        id: id,
        email: user?.email!,
        name: user?.name!,
        content: reader.result as string,
        isFile: true,
        fileName: file.name,
        meta: { size: file.size, type: file.type },
      };
      setMessages((prev) => [...prev, newMessage]);
    };

    reader.readAsDataURL(file);
    sendToPeers(file);
  };

  const sendToPeers = (file) => {
    const chunkSize = 16384;
    const reader = new FileReader();
    let offset = 0;
    const blobParts: ArrayBuffer[] = [];
    let receivedBytes = 0;

    reader.onload = () => {
      if (reader.result) {
        Object.values(datachannelRef.current).forEach((dataChannel) => {
          if (dataChannel!.readyState === "open") {
            dataChannel!.send(reader.result);
            blobParts.push(reader.result as ArrayBuffer);
            receivedBytes += (reader.result as ArrayBuffer).byteLength;
          }
        });
        offset += chunkSize;
        if (offset < file.size) {
          readNextChunk();
        }
      }
    };

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    readNextChunk();
  };

  useEffect(() => {
    socketRef.current = io("https://react-social-server.onrender.com", {
      withCredentials: true,
    });

    return () => {
      socketRef.current?.disconnect();
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.email || !user?.name) return;

    socketRef.current!.on("connect", () => {
      socketRef.current?.emit("setname", {
        name: user.name,
        email: user.email,
      });
    });

    socketRef.current!.on("getusers", (data) => {
      setOnelineUsers(data);
    });

    socketRef.current!.on("new-peer", (peerId) => {
      createPeerConnection(peerId, true);
    });

    socketRef.current!.on("offer", async ({ fromPeerId, offer }) => {
      const pc = createPeerConnection(fromPeerId, false);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit("answer", { targetPeerId: fromPeerId, answer });
    });

    socketRef.current!.on("answer", async ({ fromPeerId, answer }) => {
      const pc = peerRef.current![fromPeerId];
      if (pc) {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(answer);
        } else {
          console.warn(
            `Skipping setRemoteDescription for ${fromPeerId} — current state: ${pc.signalingState}`
          );
        }
      }
    });

    socketRef.current!.on("ice-candidate", ({ fromPeerId, candidate }) => {
      const pc = peerRef.current![fromPeerId];
      if (pc) {
        pc.addIceCandidate(candidate);
      }
    });

    socketRef.current!.on("peer-disconnected", (peerId) => {
      const pc = peerRef.current![peerId];
      if (pc) {
        pc.close();
        delete peerRef.current![peerId];
        delete datachannelRef.current![peerId];
      }
    });

    // Call Negotiation

    if (callType && !accepted) {
      console.log("Getting user media!!");

      navigator?.mediaDevices
        ?.getUserMedia({
          video:
            callType === "video"
              ? {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                }
              : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        .then((stream) => {
          if (callType === "video") {
            localVideoStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          } else {
            localAudioStreamRef.current = stream;
            if (localAudioRef.current) localAudioRef.current.srcObject = stream;
          }
          callPeerRef.current = createCallPeerConnection(calleeId);
          callPeerRef.current.createOffer().then((offer) => {
            callPeerRef.current!.setLocalDescription(offer);
            callPeerRef.current!.onicegatheringstatechange = () => {
              if (callPeerRef.current?.iceGatheringState === "complete") {
                socketRef.current?.emit("call", {
                  to: calleeId,
                  offer,
                  cType: callType,
                  candidates: iceCandidates,
                });
              }
            };
          });
        })
        .catch((err) => console.error("Error accessing media devices:", err));
    }

    if (callType && accepted) {
      console.log("Getting user media!!");
      console.log({ callType });

      navigator?.mediaDevices
        ?.getUserMedia({
          video:
            callType === "video"
              ? {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                }
              : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        .then((stream) => {
          if (callType === "video") {
            localVideoStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          } else {
            localAudioStreamRef.current = stream;
            if (localAudioRef.current) localAudioRef.current.srcObject = stream;
          }
          const pc = createCallPeerConnection(callerId);
          callPeerRef.current = pc;
          pc.setRemoteDescription(offer!);
          callPeerRef.current?.createAnswer().then((answer) => {
            callPeerRef.current?.setLocalDescription(answer);
            iceCandidates.forEach((iceCandidate) => {
              callPeerRef.current!.addIceCandidate(iceCandidate);
            });
            callPeerRef.current!.onicegatheringstatechange = () => {
              if (callPeerRef.current?.iceGatheringState === "complete") {
                socketRef.current?.emit("callAnswered", {
                  to: callerId,
                  answer,
                  cType: callType,
                  candidates: iceCandidates,
                });
              }
            };
            if (callType === "video") {
              setIsReceivingVideoCall(false);
              setInVideoCall(true);
            } else {
              setIsReceivingAudioCall(false);
              setInAudioCall(true);
            }
          });
        })
        .catch((err) => console.error("Error accessing media devices:", err));
    }

    socketRef.current!.on(
      "incomingCall",
      ({ from, callerName, offer, cType, candidates }) => {
        if (timeoutRef.current !== null) {
          ringtoneRef.current!.pause();
          ringtoneRef.current!.currentTime = 0;
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIceCandidates(candidates);
        setCallerId(from);
        setCallerName(callerName);
        setOffer(offer);
        setCallType(cType);
        setCallTime(new Date());
        const ringtone = new Audio("/messenger_video_call.mp3");
        ringtoneRef.current = ringtone;
        ringtone.volume = 1.0;
        ringtone.loop = true;
        ringtone.play();

        timeoutRef.current = window.setTimeout(() => {
          ringtoneRef.current!.pause();
          ringtoneRef.current!.currentTime = 0;
          ringtoneRef.current = null;
          setNotification((prev) => [
            ...prev,
            { caller: callerName, time: new Date() },
          ]);
          socketRef.current?.emit("rejected", { to: from, cType });
          if (cType === "video") {
            setIsReceivingVideoCall(false);
          } else {
            setIsReceivingAudioCall(false);
          }
        }, 30000);

        if (cType === "audio") {
          setIsReceivingAudioCall(true);
        } else {
          setIsReceivingVideoCall(true);
        }
      }
    );

    socketRef.current!.on("rejected", ({ cType }) => {
      if (timeoutRef.current !== null) {
        ringtoneRef.current!.pause();
        ringtoneRef.current!.currentTime = 0;
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (cType === "video") {
        setInVideoCall(false);
      } else {
        setInAudioCall(false);
      }
      window.location.href = "/";
    });

    socketRef.current!.on("endCall", ({ from, cType }) => {
      console.log("Call ended by peer");

      if (from === callerId) {
        setNotification((prev) => [
          ...prev,
          { caller: callerName, time: new Date() },
        ]);
      }

      if (timeoutRef.current !== null) {
        ringtoneRef.current!.pause();
        ringtoneRef.current!.currentTime = 0;
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (cType === "video") {
        setInVideoCall(false);
      } else {
        setInAudioCall(false);
      }
      window.location.href = "/";
    });

    socketRef.current!.on(
      "callAnswered",
      async ({ answer, cType, candidates }) => {
        console.log({ answer, cType, candidates });

        if (callPeerRef.current) {
          if (callPeerRef.current.signalingState === "have-local-offer") {
            await callPeerRef.current.setRemoteDescription(answer);
            candidates.forEach((iceCandidate: RTCIceCandidate) => {
              callPeerRef.current!.addIceCandidate(iceCandidate);
            });
          } else {
            console.warn(
              `Skipping setRemoteDescription for  — current state: ${callPeerRef.current.signalingState}`
            );
          }
        }
        if (cType === "video") {
          setInAudioCall(false);
          setInVideoCall(true);
        } else {
          setInVideoCall(false);
          setInAudioCall(true);
        }
      }
    );
  }, [user, callType, accepted]);

  const initiateCall = (toId: string, cType: string) => {
    if (cType === "video") {
      setCalleeId(toId);
      setCallType(cType);
      setInVideoCall(true);
    } else {
      setCalleeId(toId);
      setCallType(cType);
      setInAudioCall(true);
    }
  };

  const acceptCall = (cType: string) => {
    console.log(cType);
    if (cType === "video") {
      setAccepted(true);
      setInVideoCall(true);
      if (ringtoneRef.current !== null) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        clearTimeout(timeoutRef.current!);
        ringtoneRef.current = null;
      }
    } else {
      setAccepted(true);
      setInAudioCall(true);
      if (ringtoneRef.current !== null) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        clearTimeout(timeoutRef.current!);
        ringtoneRef.current = null;
      }
    }
  };

  const rejectCall = (cType: string) => {
    if (timeoutRef.current !== null) {
      ringtoneRef.current!.pause();
      ringtoneRef.current!.currentTime = 0;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    socketRef.current?.emit("rejected", { to: callerId, cType });
    if (cType === "video") {
      setIsReceivingVideoCall(false);
    } else {
      setIsReceivingAudioCall(false);
    }
    window.location.href = "/";
  };
  const endCall = (cType: string) => {
    socketRef.current?.emit("endCall", { to: callerId || calleeId, cType });
    if (cType === "video") {
      setInVideoCall(false);
    } else {
      setInAudioCall(false);
    }
    window.location.href = "/";
  };

  useEffect(() => {
    const self = onlineusers.find((item) => item.email === user?.email);
    if (self) {
      setId(self.id);
    }
  }, [onlineusers]);

  const toggleMute = (cType: string) => {
    if (cType === "video") {
      const audioTrack = localVideoStreamRef.current?.getTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!isMuted);
    } else {
      const audioTrack = (
        localAudioRef.current?.srcObject as MediaStream
      ).getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = (cType: string) => {
    if (cType === "video") {
      const videoTrack = localVideoStreamRef.current?.getTracks()[1];
      if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!isCameraOff);
    }
  };

  const switchCamera = async () => {
    try {
      const newFacingMode = facingMode === "user" ? "environment" : "user";

      // Stop current video tracks
      localVideoStreamRef.current
        ?.getVideoTracks()
        .forEach((track) => track.stop());

      // Get new stream from the opposite camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: newFacingMode } },
        audio: true, // keep audio, or set to false if not needed
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      console.log({ newVideoTrack });

      // Replace local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      // Replace the video track in the peer connection
      const sender = callPeerRef
        .current!.getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      // Update state and refs
      localVideoStreamRef.current = newStream;
      setFacingMode(newFacingMode);
    } catch (err) {
      console.error("Failed to toggle camera:", err);
    }
  };

  const swapVideos = () => {
    const temp = localVideoRef.current?.srcObject;
    if (localVideoRef.current)
      localVideoRef.current.srcObject =
        remoteVideoRef.current?.srcObject || null;
    if (remoteVideoRef.current) remoteVideoRef.current!.srcObject = temp!;
  };

  return (
    <>
      {isReceivingVideoCall && (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-white">
          <div className="backdrop-blur-md bg-white/5 p-6 rounded-2xl shadow-2xl max-w-sm w-full">
            <Card className="bg-transparent border border-white/10 shadow-none">
              <CardContent className="flex flex-col items-center gap-6 p-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="https://i.pravatar.cc/300" />
                  <AvatarFallback className="text-xl">
                    <span className="text-2xl text-white font-bold">
                      {callerName}
                    </span>
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl text-white font-semibold">
                  {" "}
                  {callerName}
                </h2>
                <p className="text-sm text-zinc-400">is calling you...</p>
                <div className="flex gap-4 mt-6">
                  <Button
                    onClick={() => acceptCall("video")}
                    className="bg-green-500 hover:bg-green-600 text-white shadow-md"
                  >
                    <PhoneIncoming className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    onClick={() => rejectCall("video")}
                    variant="destructive"
                    className="shadow-md"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {inVideoCall && (
        <div className="flex items-center justify-center min-h-screen text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-6xl">
            {/* Local video as fullscreen background */}
            <div className="fixed inset-0 w-screen h-screen z-10 overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="w-full h-full object-cover bg-gray-900"
                style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
              />
              {/* Remote video as overlay in the corner */}
              <div
                className="absolute top-6 right-6 w-32 h-48 md:w-40 md:h-68 rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 bg-gray-900"
                style={{ zIndex: 2 }}
              >
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  className="w-full h-full object-cover"
                  onClick={swapVideos}
                />
              </div>
            </div>

            {/* Overlay button group at the bottom */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-auto flex justify-center gap-4 z-20">
              <Button
                onClick={() => endCall("video")}
                className="bg-red-600 w-12 h-12 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-lg shadow-lg"
              >
                <Phone size={48} />
              </Button>
              <Button
                onClick={() => toggleMute("video")}
                className="bg-gray-700 w-12 h-12 hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-lg shadow-lg"
              >
                {isMuted ? <Mic size={48} /> : <MicOff size={48} />}
              </Button>
              <Button
                onClick={() => toggleCamera("video")}
                className="bg-gray-700 w-12 h-12 hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-lg shadow-lg"
              >
                {isCameraOff ? (
                  <CameraIcon size={48} />
                ) : (
                  <CameraOffIcon size={48} />
                )}
              </Button>
              <Button
                onClick={switchCamera}
                className="bg-gray-700 w-12 h-12 hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-lg shadow-lg"
              >
                <RefreshCcw size={48} />
              </Button>
            </div>
          </div>
        </div>
      )}
      {isReceivingAudioCall && (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-white">
          <div className="backdrop-blur-md bg-white/5 p-6 rounded-2xl shadow-2xl max-w-sm w-full">
            <Card className="bg-transparent border border-white/10 shadow-none">
              <CardContent className="flex flex-col items-center gap-6 p-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="https://i.pravatar.cc/300" />
                  <AvatarFallback className="text-xl">
                    <span className="text-2xl text-white font-bold">
                      {callerName}
                    </span>
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl text-white font-semibold">
                  {callerName}
                </h2>
                <p className="text-sm text-zinc-400">is calling you...</p>

                <div className="flex gap-4 mt-6">
                  <Button
                    onClick={() => acceptCall("audio")}
                    className="bg-green-500 hover:bg-green-600 text-white shadow-md"
                  >
                    <PhoneIncoming className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    onClick={() => rejectCall("audio")}
                    variant="destructive"
                    className="shadow-md"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {inAudioCall && (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-white">
          <div className="backdrop-blur-md bg-white/5 p-6 rounded-2xl shadow-2xl max-w-sm w-full">
            <Card className="bg-transparent border border-white/10 shadow-none">
              <CardContent className="flex flex-col items-center gap-6 p-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="https://i.pravatar.cc/300" />
                  <AvatarFallback className="text-xl">
                    <span className="text-2xl text-white font-bold">
                      {callerId
                        ? onlineusers.find((it) => it.id === callerId)?.name
                        : calleeId
                          ? onlineusers.find((it) => it.id === calleeId)?.name
                          : "Himel"}
                    </span>
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl text-white font-semibold">
                  {callerId
                    ? onlineusers.find((it) => it.id === callerId)?.name
                    : calleeId
                      ? onlineusers.find((it) => it.id === calleeId)?.name
                      : "Himel"}
                </h2>
                <div className="flex gap-4 mt-6">
                  <>
                    <audio ref={localAudioRef} autoPlay muted></audio>
                    <audio ref={remoteAudioRef} autoPlay></audio>
                    <Button
                      onClick={() => endCall("audio")}
                      className="bg-red-600 w-12 h-12 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-lg shadow-lg"
                    >
                      <Phone size={48} />
                    </Button>
                    <Button
                      onClick={() => toggleMute("audio")}
                      className="bg-gray-700 w-12 h-12 hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-lg shadow-lg"
                    >
                      {isMuted ? <Mic size={48} /> : <MicOff size={48} />}
                    </Button>
                  </>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {!inVideoCall &&
        !inAudioCall &&
        !isReceivingAudioCall &&
        !isReceivingVideoCall && (
          <div className="min-h-screen bg-custom-back text-custom flex flex-col">
            {/* Top Bar */}

            <div className="flex justify-between items-center px-6 py-4 bg-white/10 backdrop-blur-md shadow-md">
              <div className="text-xs sm:text-xl ml-7 sm:ml-0 font-semibold flex gap-1.5 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  width={24}
                  height={24}
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M256.6 8C116.5 8 8 110.3 8 248.6c0 72.3 29.7 134.8 78.1 177.9 8.4 7.5 6.6 11.9 8.1 58.2A19.9 19.9 0 0 0 122 502.3c52.9-23.3 53.6-25.1 62.6-22.7C337.9 521.8 504 423.7 504 248.6 504 110.3 396.6 8 256.6 8zm149.2 185.1l-73 115.6a37.4 37.4 0 0 1 -53.9 9.9l-58.1-43.5a15 15 0 0 0 -18 0l-78.4 59.4c-10.5 7.9-24.2-4.6-17.1-15.7l73-115.6a37.4 37.4 0 0 1 53.9-9.9l58.1 43.5a15 15 0 0 0 18 0l78.4-59.4c10.4-8 24.1 4.5 17.1 15.6z" />
                </svg>
                <span className="text-xs sm:text-xl">Messenger</span>
              </div>
              <div className="flex gap-4 items-center justify-center">
                {" "}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Bell fill="black" className="cursor-pointer" />
                  </DropdownMenuTrigger>
                  {notification.toString() ? (
                    <DropdownMenuContent className="mt-2 w-80">
                      {notification.map((it) => (
                        <DropdownMenuItem className="flex flex-col items-start gap-1">
                          <span className="font-semibold text-red-600">
                            Missed Call
                          </span>
                          <span className="text-xs text-gray-500">
                            You missed a call from {it.caller}
                          </span>
                          <span className="text-xs text-gray-400">
                            {getCallTimeDiffs(callTime!)}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  ) : (
                    <DropdownMenuContent className="mt-2 w-80">
                      <DropdownMenuItem className="flex flex-col items-start gap-1">
                        <span className="text-gray-500">No notifications</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer border-2 border-white">
                      <AvatarImage src="https://i.pravatar.cc/300" alt="User" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="mt-2 w-40">
                    <DropdownMenuItem className="cursor-pointer">
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 cursor-pointer"
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Sidebar - Online Users (Desktop) */}
            <div className="flex flex-1 overflow-hidden">
              <div className="hidden sm:block w-64 p-3 space-y-2 overflow-y-auto h-full max-h-screen">
                <h2 className="text-lg font-semibold mb-2">Online Users</h2>
                <hr className="border-black" />
                <div className="space-y-2">
                  {onlineusers.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col justify-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/20 transition"
                    >
                      <div className="flex justify-start gap-2">
                        <div className="relative w-8 h-8 ">
                          <span className="w-2 h-2 rounded-full absolute z-10 right-0 top-0 bg-green-400"></span>
                          <Avatar className="w-full h-full absolute">
                            <AvatarImage
                              src="https://i.pravatar.cc/300"
                              alt="User"
                            />
                          </Avatar>
                        </div>
                        <span>{user?.name}</span>
                      </div>
                      <div className="flex  gap-2">
                        <Button
                          onClick={() => initiateCall(user?.id, "video")}
                          disabled={user.id === id}
                          className="w-8 h-8 cursor-pointer"
                        >
                          <VideoIcon />
                        </Button>
                        <Button
                          onClick={() => initiateCall(user?.id, "audio")}
                          disabled={user.id === id}
                          className="w-8 h-8 cursor-pointer"
                        >
                          <PhoneCall />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sheet for Online Users (Mobile) */}
              <div className="sm:hidden absolute left-2 top-2 z-30">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      size="icon"
                      className="bg-white/30 text-black mt-1.5 hover:bg-white/40"
                    >
                      <span className="sr-only">Open Online Users</span>
                      <svg
                        width="24"
                        height="24"
                        fill="white"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="w-64 bg-custom-back p-4 space-y-2"
                    style={{ maxHeight: "100vh", overflowY: "auto" }}
                  >
                    <h2 className="text-lg font-semibold mb-2">Online Users</h2>
                    <hr className="border-black" />
                    <div className="space-y-2">
                      {onlineusers.map((user) => (
                        <div
                          key={user.id}
                          className="flex flex-col justify-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/20 transition"
                        >
                          <div className="flex justify-start gap-2">
                            <div className="relative w-8 h-8 ">
                              <span className="w-2 h-2 rounded-full absolute z-10 right-0 top-0 bg-green-400"></span>
                              <Avatar className="w-full h-full absolute">
                                <AvatarImage
                                  src="https://i.pravatar.cc/300"
                                  alt="User"
                                />
                              </Avatar>
                            </div>
                            <span>{user?.name}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => initiateCall(user?.id, "video")}
                              disabled={user.id === id}
                              className="w-10 h-10 cursor-pointer"
                            >
                              <VideoIcon />
                            </Button>
                            <Button
                              onClick={() => initiateCall(user?.id, "audio")}
                              disabled={user.id === id}
                              className="w-10 h-10 cursor-pointer"
                            >
                              <PhoneCall />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Chat Section */}
              <div className="flex-1 relative flex flex-col bg-white overflow-hidden min-h-0">
                {/* Message List */}
                <ScrollArea className="flex-1 p-4 min-h-0">
                  <div className="flex flex-col gap-3">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`max-w-xs sm:max-w-sm p-3 rounded-lg ${
                          msg.email === user?.email
                            ? "self-end bg-purple-100 text-purple-900"
                            : "self-start bg-gray-200 text-gray-900"
                        }`}
                      >
                        <span className="block text-sm mb-1 font-medium">
                          {msg.name}:
                        </span>
                        <p>
                          {msg.isFile && !msg?.meta?.type.includes("image") ? (
                            <a
                              className="underline"
                              href={msg.content}
                              download={msg.fileName}
                            >
                              {msg.fileName}
                            </a>
                          ) : msg.isFile &&
                            msg?.meta?.type.includes("image") ? (
                            <>
                              <img
                                className="w-[200px] mb-1 h-[120px]"
                                src={msg?.content}
                                alt=""
                              />
                              <a
                                className="underline"
                                href={msg.content}
                                download={msg.fileName}
                              >
                                {msg.fileName}
                              </a>
                            </>
                          ) : (
                            msg.content
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Chat Input at Bottom */}
                {/* Overlay Chat Input Form */}
                <div className="absolute bottom-0 left-0 w-full z-20">
                  <form onSubmit={handleSubmit}>
                    <div className="p-4 border-t bg-white flex items-center gap-2">
                      <Input
                        placeholder="Type a message..."
                        className="bg-gray-100 text-black placeholder:text-gray-500"
                      />
                      <div>
                        <Input
                          type="file"
                          hidden
                          ref={fileInputRef}
                          onChange={sendFile}
                          className="bg-gray-100 text-black placeholder:text-gray-500"
                        />
                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-button cursor-pointer text-black hover:bg-cyan-500"
                        >
                          <FileArchive />
                        </Button>
                      </div>
                      <Button
                        type="submit"
                        className="bg-button cursor-pointer text-black hover:bg-cyan-500"
                      >
                        Send
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/signin" });
    }
  },
  component: RouteComponent,
});
