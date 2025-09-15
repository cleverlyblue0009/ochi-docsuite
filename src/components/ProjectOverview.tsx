import { Train, Calendar, Users, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const ProjectOverview = () => {
  const projects = [
    {
      id: 1,
      name: "Kochi Metro Phase II",
      status: "In Progress",
      progress: 78,
      startDate: "Jan 2024",
      endDate: "Dec 2025",
      documentsTotal: 1247,
      documentsProcessed: 972,
      teamMembers: 24,
      priority: "High",
      phase: "Construction"
    },
    {
      id: 2,
      name: "Feeder Bus Integration",
      status: "Planning",
      progress: 45,
      startDate: "Mar 2024",
      endDate: "Jun 2025",
      documentsTotal: 543,
      documentsProcessed: 244,
      teamMembers: 12,
      priority: "Medium",
      phase: "Design"
    },
    {
      id: 3,
      name: "Digital Ticketing System",
      status: "Testing",
      progress: 92,
      startDate: "Sep 2023",
      endDate: "Mar 2024",
      documentsTotal: 234,
      documentsProcessed: 215,
      teamMembers: 8,
      priority: "High",
      phase: "Implementation"
    },
    {
      id: 4,
      name: "Station Accessibility Upgrade",
      status: "Approved",
      progress: 33,
      startDate: "May 2024",
      endDate: "Nov 2024",
      documentsTotal: 678,
      documentsProcessed: 224,
      teamMembers: 15,
      priority: "Medium",
      phase: "Planning"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress": return "bg-primary text-primary-foreground";
      case "Testing": return "bg-warning text-warning-foreground";
      case "Approved": return "bg-success text-success-foreground";
      case "Planning": return "bg-secondary text-secondary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive text-destructive-foreground";
      case "Medium": return "bg-warning text-warning-foreground";
      case "Low": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "In Progress": return Clock;
      case "Testing": return AlertTriangle;
      case "Approved": return CheckCircle;
      case "Planning": return Calendar;
      default: return Clock;
    }
  };

  return (
    <section id="projects" className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl lg:text-4xl font-heading font-bold text-foreground">
            Project Management Hub
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive oversight of metro projects with document-driven progress tracking
          </p>
        </div>

        {/* Project Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {projects.map((project) => {
            const StatusIcon = getStatusIcon(project.status);
            const documentProgress = (project.documentsProcessed / project.documentsTotal) * 100;
            
            return (
              <Card key={project.id} className="border-0 shadow-metro hover:shadow-elevated smooth-transition">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center space-x-2">
                        <Train className="h-5 w-5 text-primary" />
                        <span>{project.name}</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{project.phase} Phase</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getStatusColor(project.status)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {project.status}
                      </Badge>
                      <Badge className={getPriorityColor(project.priority)} variant="outline">
                        {project.priority} Priority
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Project Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-medium text-foreground">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-3" />
                  </div>

                  {/* Document Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Documents Processed</span>
                      <span className="font-medium text-foreground">
                        {project.documentsProcessed} / {project.documentsTotal}
                      </span>
                    </div>
                    <Progress value={documentProgress} className="h-2" />
                  </div>

                  {/* Project Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Timeline</p>
                        <p className="font-medium text-foreground">
                          {project.startDate} - {project.endDate}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Team Size</p>
                        <p className="font-medium text-foreground">{project.teamMembers} members</p>
                      </div>
                    </div>
                  </div>

                  {/* Document Stats */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-secondary" />
                      <span className="text-sm font-medium text-foreground">Document Hub</span>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs">
                      View All Documents
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1 bg-gradient-metro text-white">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Manage Team
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Project Timeline Summary */}
        <Card className="border-0 shadow-metro">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-accent" />
              <span>Project Timeline Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: "Active Projects", value: "4", color: "text-primary" },
                  { label: "Completed This Year", value: "12", color: "text-success" },
                  { label: "Total Documents", value: "2,702", color: "text-secondary" },
                  { label: "Team Members", value: "59", color: "text-accent" },
                ].map((stat, index) => (
                  <div key={index} className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className={`text-2xl font-heading font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};