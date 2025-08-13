import { useEffect, useRef, useState } from "react";
import socket from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";


const StudentChatFloating = ({
  student,
  token,
}: {
  student: any;
  token: string | null;
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!student || !student.id) {
      console.warn("❌ student is not available yet");
      return;
    }

    const token = localStorage.getItem("studentToken");
    // console.log("✅ Student ID:", student.id);
    // console.log("✅ Student Token:", token);

    if (!token) {
      console.warn("❌ Token missing from localStorage");
      return;
    }

    // Join socket room
    socket.emit("join_room", { roomId: student.id, role: "student" });

    // Fetch chat history
    fetch(`http://localhost:5000/api/chat/${student.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // console.log("✅ Loaded messages:", data?.messages);
        setMessages(data.messages || []);
      })
      .catch((err) => {
        console.error("❌ Error fetching messages:", err);
      });

    // Listen for incoming messages from admin
    const playNotificationSound = () => {
      const audio = new Audio("/chat_sounds.mp3");
      audio.play().catch((e) => console.warn("🔇 Sound play failed", e));
    };


    socket.on("receive_message", (data) => {
      if (data.senderRole === "admin") {
        if (!open) {
          // 🔔 Show toast notification if chat is closed
          playNotificationSound(); // 👈 Play sound for admin messages
          toast({
            title: "📩 New Message from Admin",
            description: data.message,
          });
        }

        // Always add to messages
        setMessages((prev) => [...prev, data]);
      }
    });

    // Cleanup on unmount
    return () => {
      socket.emit("leave_room", { roomId: student.id });
      socket.off("receive_message");
    };
  }, [student]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const msgData = {
      roomId: student.id,
      message,
      senderRole: "student",
      senderName: student.name,
      timestamp: new Date().toISOString(),
    };

    socket.emit("send_message", msgData);
    setMessages((prev) => [...prev, msgData]);
    setMessage("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <Button
          className="rounded-full shadow-md"
          onClick={() => setOpen(true)}
        >
          <MessageSquare className="w-5 h-5 mr-1" />
          Chat
        </Button>
      ) : (
        <div className="w-80 bg-white rounded-lg shadow-lg border flex flex-col">
          <div className="p-3 border-b flex justify-between items-center">
            <span className="font-semibold">Chat with Admin</span>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              ✕
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: "300px" }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-md max-w-xs text-sm ${msg.senderRole === "student" ? "bg-green-200 ml-auto" : "bg-gray-200"}`}
              >
                <p>{msg.message}</p>
                {/* <p className="text-xs text-gray-500 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p> */}
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(msg.createdAt || msg.timestamp), { addSuffix: true })}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef}></div>
          </div>
          <div className="p-2 border-t flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentChatFloating;
