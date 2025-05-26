import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneIncoming, PhoneOff } from "lucide-react";
import { useEffect, useState } from "react";

export function CallReceive({ setInCall, setIncomingCall, socket }) {
  const [fromId, setFromId] = useState("");
  const [offer, setOffer] = useState(null);
  console.log(socket);
  const acceptCall = () => {
    socket.emit("call-accepted", { from: fromId, to: socket.id, offer });
    setInCall(true);
    setIncomingCall(false);
  };

  useEffect(() => {
    socket.on("call-request", ({ from, to, offer }) => {
      console.log("Call request: ", { from, to });
      setFromId(from);
      setOffer(offer);
    });
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-white">
      <div className="backdrop-blur-md bg-white/5 p-6 rounded-2xl shadow-2xl max-w-sm w-full">
        <Card className="bg-transparent border border-white/10 shadow-none">
          <CardContent className="flex flex-col items-center gap-6 p-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src="https://i.pravatar.cc/300" />
              <AvatarFallback className="text-xl">
                <span className="text-2xl font-bold">Ankit</span>
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-semibold">{"Ankit"}</h2>
            <p className="text-sm text-zinc-400">is calling you...</p>
            <div className="flex gap-4 mt-6">
              <Button
                onClick={acceptCall}
                className="bg-green-500 hover:bg-green-600 text-white shadow-md"
              >
                <PhoneIncoming className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button variant="destructive" className="shadow-md">
                <PhoneOff className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
