import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

const AdminChatPage = () => {
    const { studentId } = useParams();
    const [messages, setMessages] = useState<any[]>([]);
    const [message, setMessage] = useState("");
    const [studentName, setStudentName] = useState("");
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    const token = localStorage.getItem("adminToken");

    useEffect(() => {
        if (!token) {
            navigate("/admin/login");
            return;
        }

        // Join room
        socket.emit("join_room", { roomId: studentId, role: "admin" });

        // Load chat history
        fetch(`http://localhost:5000/api/chat/${studentId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                setMessages(data.messages || []);
                setStudentName(data.studentName || "Student");
            });

        // Listen for incoming messages
        const handleIncoming = (data: any) => {
            if (data.roomId === studentId) {
                setMessages((prev) => [...prev, data]);
            }
        };

        socket.on("receive_message", handleIncoming);

        // Cleanup
        return () => {
            socket.emit("leave_room", { roomId: studentId });
            socket.off("receive_message", handleIncoming);
        };
    }, [studentId, token]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        if (message.trim() === "") return;

        const msgData = {
            roomId: studentId,
            message,
            senderRole: "admin",
            senderName: "Admin",
            timestamp: new Date().toISOString(),
        };

        socket.emit("send_message", msgData);
        setMessage(""); // Don't add it locally — rely on real-time socket update
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Chat with {studentName}</h2>

            <Card className="h-[500px] flex flex-col">
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`p-2 rounded-md max-w-xs ${msg.senderRole === "admin"
                                ? "bg-blue-200 ml-auto"
                                : "bg-gray-200"
                                }`}
                        >
                            <p className="text-sm">{msg.message}</p>
                            {/* <p className="text-xs text-gray-500 text-right">
                                {msg.createdAt || msg.timestamp
                                    ? new Date(msg.createdAt || msg.timestamp).toLocaleTimeString()
                                    : ""}
                            </p> */}
                            <p className="text-xs text-gray-500 text-right">
                                {formatDistanceToNow(new Date(msg.createdAt || msg.timestamp), { addSuffix: true })}
                            </p>

                        </div>
                    ))}
                    <div ref={messagesEndRef}></div>
                </CardContent>

                <div className="p-4 flex gap-2 border-t">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            sendMessage();
                        }}
                        className="p-4 flex gap-2 border-t"
                    >
                        <Input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                        />
                        <Button type="submit">Send</Button>
                    </form>
                </div>
            </Card>
        </div>
    );
};

export default AdminChatPage;
