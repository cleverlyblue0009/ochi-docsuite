import { BarChart3, TrendingUp, FileText, CheckCircle, Clock, AlertCircle, Users, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Dashboard = () => {
  const kpiData = [
    {
      title: "Documents Processed Today",
      value: "2,847",
      change: "+12.5%",
      trend: "up",
      icon: FileText,
      color: "text-primary",
    },
    {
      title: "AI Classification Accuracy",
      value: "99.8%",
      change: "+0.3%",
      trend: "up",
      icon: CheckCircle,
      color: "text-success",
    },
    {
      title: "Average Processing Time",
      value: "0.8s",
      change: "-15%",
      trend: "up",
      icon: Clock,
      color: "text-secondary",
    },
    {
      title: "Active Projects",
      value: "47",
      change: "+3",
      trend: "up",
      icon: BarChart3,
      color: "text-accent",
    },
  ];

  const recentActivity = [
    { type: "contract", title: "Metro Line 2 Construction Contract", status: "approved", time: "2 min ago" },
    { type: "permit", title: "Environmental Clearance Document", status: "pending", time: "5 min ago" },
    { type: "technical", title: "Track Design Specifications", status: "processed", time: "12 min ago" },
    { type: "report", title: "Monthly Safety Audit Report", status: "reviewed", time: "18 min ago" },
  ];

  const projectProgress = [
    { name: "Kochi Metro Phase II", progress: 78, color: "bg-primary" },
    { name: "Feeder Bus Integration", progress: 45, color: "bg-secondary" },
    { name: "Digital Ticketing System", progress: 92, color: "bg-accent" },
    { name: "Station Accessibility Upgrade", progress: 33, color: "bg-warning" },
  ];

  return (
    <section id="dashboard" className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl lg:text-4xl font-heading font-bold text-foreground">
            Executive Dashboard
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time insights into document processing, AI performance, and project metrics
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi, index) => (
            <Card key={index} className="border-0 shadow-metro hover:shadow-elevated smooth-transition">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-heading font-bold text-foreground">
                    {kpi.value}
                  </div>
                  <Badge variant="secondary" className="bg-success/10 text-success border-0">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {kpi.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 border-0 shadow-metro">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                <span>Recent Document Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-gradient-metro"></div>
                      <div>
                        <p className="font-medium text-foreground">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                    <Badge
                      variant={activity.status === "approved" ? "default" : "secondary"}
                      className={
                        activity.status === "approved"
                          ? "bg-success text-success-foreground"
                          : activity.status === "pending"
                          ? "bg-warning text-warning-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Project Progress */}
          <Card className="border-0 shadow-metro">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-secondary" />
                <span>Project Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {projectProgress.map((project, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{project.name}</span>
                      <span className="text-muted-foreground">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="border-0 shadow-metro">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-accent" />
              <span>System Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "CPU Usage", value: "45%", color: "bg-primary" },
                { label: "Memory", value: "68%", color: "bg-secondary" },
                { label: "Storage", value: "23%", color: "bg-accent" },
                { label: "Network", value: "89%", color: "bg-success" },
              ].map((metric, index) => (
                <div key={index} className="text-center space-y-3">
                  <div className="text-2xl font-heading font-bold text-foreground">
                    {metric.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                  <Progress value={parseInt(metric.value)} className="h-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};