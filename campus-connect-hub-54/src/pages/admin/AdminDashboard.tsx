
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Users, Calendar, LogOut, User, Mail, Phone, GraduationCap, BookOpen, MessageSquare } from "lucide-react";
import axios from "axios";
import socket from "@/lib/socket";
import { formatDistanceToNow } from "date-fns";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("students");
  const [students, setStudents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [chatStudent, setChatStudent] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const loadChatWithStudent = async (studentId: string) => {
    const token = localStorage.getItem("adminToken");
    try {
      const res = await axios.get(`http://localhost:5000/api/chat/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChatMessages(res.data.messages || []);
      const student = students.find((s) => s._id === studentId);
      const studentData = { ...student, name: res.data.studentName };
      setChatStudent(studentData);

      if (chatStudent?._id) {
        socket.emit("leave_room", { roomId: chatStudent._id });
      }

      // ✅ Join the room for this student to receive real-time messages
      socket.emit("join_room", { roomId: studentId });

    } catch (error) {
      console.error("Failed to load chat", error);
      toast({ title: "Error", description: "Could not load chat." });
    }
  };


  const handleSendMessage = () => {
    if (!newMessage.trim() || !chatStudent) return;

    const messageData = {
      senderRole: "admin",
      senderName: "Admin",
      roomId: chatStudent._id,
      message: newMessage.trim(),
    };

    socket.emit("send_message", messageData);
    // setChatMessages((prev) => [...prev, { ...messageData, createdAt: new Date() }]);
    setNewMessage("");
  };


  const navigate = useNavigate();

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("adminLoggedIn");
    const token = localStorage.getItem("adminToken");

    if (!isAdminLoggedIn || !token) {
      navigate("/admin/login");
      return;
    }




    // ✅ Connect to socket
    socket.emit("admin_join", { role: "admin" });

    const playNotificationSound = () => {
      const audio = new Audio("/chat_sounds.mp3");
      audio.play().catch((e) => console.warn("🔇 Sound play failed", e));
    };

    // ✅ Listen for incoming messages
    socket.on("receive_message", (data) => {
      const isCurrentChatOpen = chatStudent && chatStudent._id === data.roomId;

      if (data.senderRole === "student") {
        if (!isCurrentChatOpen) {
        playNotificationSound(); // 👈 Sound for student messages
          toast({
            title: `📨 Message from ${data.senderName}`,
            description: data.message,
          });
        }
        setChatMessages((prev) => [...prev, data]);
      } else {
        // If chat is open, you can also append the message here if needed

      }
    });

    // Fetch students and requests from backend
    const fetchAdminData = async () => {
      try {
        const [studentsRes, requestsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/admin/students", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:5000/api/admin/requests", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStudents(studentsRes.data.students || []);
        setRequests(requestsRes.data.requests || []);
      } catch (error) {
        console.error("Error fetching data", error);
        toast({
          title: "Fetch Failed",
          description: "Could not load admin data from server.",
        });
      }
    };

    fetchAdminData();
    // ✅ Clean up socket on unmount
    return () => {
      socket.off("receive_message");
    };

  },

    // Load data
    [navigate]);
  useEffect(() => {
    if (!chatStudent) return;

    const handleMessage = (data: any) => {
      if (data.roomId === chatStudent._id) {
        setChatMessages((prev) => [...prev, data]);
      }
    };

    socket.on("receive_message", handleMessage);

    return () => {
      socket.off("receive_message", handleMessage);
    };
  }, [chatStudent]);




  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminToken");
    toast({
      title: "Logged Out",
      description: "Admin has been successfully logged out.",
    });
    navigate("/");
  };

  const handleRequestAction = async (requestId: string, action: "Accepted" | "Declined") => {
    const token = localStorage.getItem("adminToken");

    try {
      await axios.put(
        `http://localhost:5000/api/admin/requests/${requestId}`,
        { status: action },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedRequests = requests.map((req) =>
        req._id === requestId ? { ...req, status: action } : req
      );

      setRequests(updatedRequests);

      toast({
        title: `Request ${action}`,
        description: `Holiday request has been ${action.toLowerCase()}.`,
      });
    } catch (error) {
      console.error("Error updating request status", error);
      toast({
        title: "Update Failed",
        description: "Could not update request status.",
      });
    }
  };


  // const getStatusBadge = (status: string) => {
  //   const variants: any = {
  //     Pending: "secondary",
  //     Accepted: "default",
  //     Declined: "destructive"
  //   };
  //   return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  // };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const variants: any = {
      Pending: "secondary",
      Accepted: "default",
      Declined: "destructive"
    };
    // return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
    return <Badge variant={variants[normalizedStatus] || "secondary"}>{normalizedStatus}</Badge>;
  };

  const sidebarItems = [
    { id: "students", label: "Student List", icon: Users },
    { id: "requests", label: "Holiday Requests", icon: Calendar },
    { id: "chat", label: "Chat", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="p-4">
            <div className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSelectedStudent(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${activeTab === item.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {selectedStudent ? (
            /* Student Detail View */
            <div>
              <div className="flex items-center gap-4 mb-6">
                <Button
                  onClick={() => setSelectedStudent(null)}
                  variant="outline"
                >
                  ← Back to Students
                </Button>
                <h2 className="text-2xl font-bold">Student Details</h2>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{selectedStudent.name}</CardTitle>
                  <CardDescription>Complete student information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{selectedStudent.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Mobile</p>
                          <p className="font-medium">{selectedStudent.mobile}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Roll Number</p>
                          <p className="font-medium">{selectedStudent.rollNo}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Course</p>
                          <p className="font-medium">{selectedStudent.course}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Branch</p>
                          <p className="font-medium">{selectedStudent.branch}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Father's Name</p>
                        <p className="font-medium">{selectedStudent.fatherName}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Mother's Name</p>
                        <p className="font-medium">{selectedStudent.motherName}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Date of Birth</p>
                        <p className="font-medium">{selectedStudent.dob}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Academic Year</p>
                        <p className="font-medium">{selectedStudent.year}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{selectedStudent.address}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : activeTab === "students" ? (
            /* Students List */
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Student List</h2>
                <p className="text-gray-600">Total students: {students.length}</p>
              </div>

              {students.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">No students registered yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map((student) => (
                    <Card
                      key={student._id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <CardContent className="p-6">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">{student.name}</h3>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          <p className="text-sm text-gray-600">{student.mobile}</p>
                          <p className="text-sm text-gray-600">{student.course}</p>
                          <p className="text-sm text-gray-600">{student.branch}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "requests" ? (
            /* Holiday Requests */
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Holiday Requests</h2>
                <p className="text-gray-600">Manage student leave requests</p>
              </div>

              {requests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">No holiday requests submitted yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <Card key={request._id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="font-semibold text-lg">{request.studentId?.name}</h3>
                              {getStatusBadge(request.status)}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{request.studentId?.email}</p>
                              </div>
                              {/* <div>
                              <p className="text-sm text-gray-500">Leave Type</p>
                              <p className="font-medium">{request.studentId?.leaveType}</p>
                            </div> */}
                              <div>
                                <p className="text-sm text-gray-500">Duration</p>
                                <p className="font-medium">{request.fromDate} to {request.toDate}</p>
                              </div>
                              <div>
                                {/* <p className="text-sm text-gray-500">Submitted</p> */}
                                <h5 className="font-semibold text-lg">Submitted</h5>
                                <p className="font-medium">{request.studentId?.submittedAt}</p>
                              </div>
                            </div>

                            <div className="mb-4">
                              <p className="text-sm text-gray-500 mb-1">Reason</p>
                              <p className="text-gray-700">{request.reason}</p>
                            </div>

                            {request.status.toLowerCase() === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleRequestAction(request._id, "Accepted")}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Accept
                                </Button>
                                <Button
                                  onClick={() => handleRequestAction(request._id, "Declined")}
                                  variant="destructive"
                                >
                                  Decline
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "chat" ? (
            /* Chat Tab */
            chatStudent ? (
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <Button onClick={() => setChatStudent(null)} variant="outline">← Back</Button>
                  <h2 className="text-xl font-bold">Chat with {chatStudent.name}</h2>
                </div>

                <div className="bg-white rounded-lg shadow p-4 max-h-[500px] overflow-y-auto space-y-2 mb-4">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`p-2 rounded ${msg.senderRole === "admin" ? "bg-blue-100 text-right" : "bg-gray-100 text-left"}`}>
                      <p className="text-sm">{msg.message}</p>
                      {/* <p className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleTimeString()}</p> */}
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(msg.createdAt || msg.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 border rounded px-3 py-2"
                  />
                  <Button onClick={handleSendMessage}>Send</Button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-4">Select a student to chat</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map((student) => (
                    <Card
                      key={student._id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => loadChatWithStudent(student._id)}
                    >
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-lg">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <p className="text-sm text-gray-600">{student.rollNo}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
