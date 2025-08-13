
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { LogOut, Calendar, User } from "lucide-react";
import axios from "axios";
import StudentChatFloating from "./StudentChatFloating";

const StudentDashboard = () => {
  const [student, setStudent] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestForm, setRequestForm] = useState({
    reason: "",
    fromDate: "",
    toDate: "",
    leaveType: ""
  });

  const navigate = useNavigate();

  useEffect(() => {
    const studentToken = localStorage.getItem("studentToken");
    const studentData = localStorage.getItem("currentStudent");

    if (!studentToken || !studentData) {
      navigate("/student/login");
      return;
    }

    const parsedStudent = JSON.parse(studentData);
    // console.log("Student ID:", parsedStudent.id);
    console.log("Fetching from API:", `http://localhost:5000/api/student/holiday-requests/${parsedStudent.id}`);

    // ✅ Validate parsed object
    if (!parsedStudent || !parsedStudent.id) {
      console.warn("Invalid student data: missing _id", parsedStudent);
      navigate("/student/login");
      return;
    }
    setStudent(parsedStudent);

    // Load student's requests
    const fetchRequests = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/student/holiday-requests/${parsedStudent.id}`, {
          headers: { Authorization: `Bearer ${studentToken}` }

        });

        setRequests(res.data.requests || []);
      } catch (error) {
        console.error("Error fetching requests", error);
        toast({
          title: "Error",
          description: "Could not fetch your holiday requests.",
        });
      }
    };

    fetchRequests();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("currentStudent");
    localStorage.removeItem("studentToken");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const studentToken = localStorage.getItem("studentToken");
    if (!student || !studentToken) return;

    const newRequest = {
      studentId: student.id,
      reason: requestForm.reason,
      fromDate: requestForm.fromDate,
      toDate: requestForm.toDate,
      leaveType: requestForm.leaveType
    };

    try {
      const res = await axios.post("http://localhost:5000/api/student/holiday-requests", newRequest, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });

      setRequests(prev => [...prev, res.data.newRequest]);
      setRequestForm({ reason: "", fromDate: "", toDate: "", leaveType: "" });

      toast({
        title: "Request Submitted",
        description: "Your holiday request was successfully submitted.",
      });
    } catch (error) {
      console.error("Error submitting request", error);
      toast({
        title: "Error",
        description: "Something went wrong while submitting your request.",
      });
    }
  };

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

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Student Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Name</Label>
                    <p className="text-lg font-semibold">{student.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Mobile</Label>
                    <p className="text-lg">{student.mobile}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Branch</Label>
                    <p className="text-lg">{student.branch}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Course</Label>
                    <p className="text-lg">{student.course}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Year</Label>
                    <p className="text-lg">{student.year}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Holiday Request Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Submit Holiday Request
                </CardTitle>
                <CardDescription>
                  Fill out the form below to request time off
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fromDate">From Date</Label>
                      <Input
                        id="fromDate"
                        type="date"
                        value={requestForm.fromDate}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, fromDate: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="toDate">To Date</Label>
                      <Input
                        id="toDate"
                        type="date"
                        value={requestForm.toDate}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, toDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leaveType">Type of Leave</Label>
                    <Select onValueChange={(value) => setRequestForm(prev => ({ ...prev, leaveType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="personal">Personal Leave</SelectItem>
                        <SelectItem value="emergency">Emergency Leave</SelectItem>
                        <SelectItem value="family">Family Event</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      id="reason"
                      placeholder="Please provide a detailed reason for your leave request..."
                      value={requestForm.reason}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, reason: e.target.value }))}
                      required
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Submit Request
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Current Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Your Holiday Requests</CardTitle>
                <CardDescription>
                  Track the status of your submitted requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No requests submitted yet</p>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div key={request._id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">Holiday Request</span>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{request.reason}</p>
                            <p className="text-sm text-gray-500">
                              {request.fromDate} to {request.toDate}
                            </p>
                            {/* <p className="text-xs text-gray-400">
                              Submitted: {request.submittedAt} </p>*/}
                            <p className="text-xs text-gray-400">Submitted: {new Date(request.createdAt).toLocaleDateString()}</p>

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
{student && (
  <StudentChatFloating
    student={student}
    token={localStorage.getItem("studentToken")}
  />
)}
    </div>
  );
};

export default StudentDashboard;
